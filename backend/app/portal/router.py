import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext, get_auth_context
from app.core.db import get_db
from app.core.errors import AppError
from app.core.pagination import PageParams, envelope, page_params
from app.core.sql import all_, guard, not_found, one, raw_one, run, scalar
from app.invoicing.service import LIST_SELECT, invoice_detail, invoice_html
from app.sales import service as sales
from app.tenancy.context import forbidden

router = APIRouter(prefix="/portal", tags=["portal"])


def customer_context(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
    if ctx.kind != "customer" or ctx.customer_id is None or ctx.business is None:
        raise forbidden("Customer access required")
    return ctx


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    billing_address: str | None = Field(default=None, max_length=1000)


def _actor(ctx: AuthContext) -> dict:
    return {"user_id": ctx.user.id, "role": "customer", "business_id": ctx.business.id}


@router.get("/summary")
def summary(ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    b, c = ctx.business.id, ctx.customer_id
    today = sales.business_today(db, b)
    return {"data": {
        "business": {"id": str(b), "name": ctx.business.name, "currency": ctx.business.currency},
        "active_subscriptions": scalar(db, "SELECT count(*) FROM subscriptions WHERE business_id = :b AND customer_id = :c AND status = 'active'", b=b, c=c),
        "outstanding_balance": str(scalar(db, "SELECT COALESCE(sum(total - amount_paid),0) FROM invoices WHERE business_id = :b AND customer_id = :c AND status = 'confirmed'", b=b, c=c)),
        "overdue_invoices": scalar(db, "SELECT count(*) FROM invoices WHERE business_id = :b AND customer_id = :c AND status = 'confirmed' AND total - amount_paid > 0 AND due_date < :t", b=b, c=c, t=today),
        "upcoming_renewals": all_(db, "SELECT id, number, expiry_date FROM subscriptions WHERE business_id = :b AND customer_id = :c AND status IN ('active','paused') AND expiry_date <= :t + interval '30 days' ORDER BY expiry_date", b=b, c=c, t=today),
        "recent_invoices": all_(db, LIST_SELECT + " WHERE i.business_id = :b AND i.customer_id = :c AND i.status <> 'draft' ORDER BY i.created_at DESC LIMIT 5", b=b, c=c, today=today),
        "recent_payments": all_(db, "SELECT p.id, p.method, p.amount, p.paid_on, i.number AS invoice_number FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE p.business_id = :b AND i.customer_id = :c AND p.status = 'recorded' ORDER BY p.paid_on DESC LIMIT 5", b=b, c=c)}}


@router.get("/subscriptions")
def my_subscriptions(params: PageParams = Depends(page_params), ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    b, c = ctx.business.id, ctx.customer_id
    total = scalar(db, "SELECT count(*) FROM subscriptions WHERE business_id = :b AND customer_id = :c AND status <> 'draft'", b=b, c=c)
    rows = all_(db, """SELECT s.id, s.number, s.status, s.billing_interval, s.start_date, s.expiry_date, s.next_period_start, s.quotation_valid_until, pl.name AS plan_name,
                       COALESCE((SELECT sum(sl.quantity * sl.unit_price) FROM subscription_lines sl WHERE sl.subscription_id = s.id), 0) AS subtotal
                       FROM subscriptions s JOIN plans pl ON pl.id = s.plan_id WHERE s.business_id = :b AND s.customer_id = :c AND s.status <> 'draft' ORDER BY s.created_at DESC LIMIT :l OFFSET :o""", b=b, c=c, l=params.page_size, o=params.offset)
    return envelope(rows, int(total or 0), params)


def _own_subscription(db: Session, ctx: AuthContext, sub_id) -> dict:
    sub = sales.get_subscription(db, ctx.business.id, sub_id, ctx.customer_id)
    if sub["status"] == "draft":
        raise not_found("Subscription")
    sub["allowed_actions"] = [a for a in sub["allowed_actions"] if a in ("confirm", "close", "pause", "resume") and (a != "confirm" or sub["status"] == "quotation")]
    if not scalar(db, "SELECT customer_self_service FROM businesses WHERE id = :b", b=ctx.business.id):
        sub["allowed_actions"] = []
    return sub


def _self_service(db: Session, ctx: AuthContext) -> None:
    if not scalar(db, "SELECT customer_self_service FROM businesses WHERE id = :b", b=ctx.business.id):
        raise forbidden("Self-service actions are disabled for this business")


@router.get("/subscriptions/{sub_id}")
def my_subscription(sub_id: uuid.UUID, ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    return {"data": _own_subscription(db, ctx, sub_id)}


def _portal_action(path: str, action: str):
    def endpoint(sub_id: uuid.UUID, ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
        _self_service(db, ctx)
        own = _own_subscription(db, ctx, sub_id)
        if own["status"] in ("draft",):
            raise not_found("Subscription")
        with guard(db):
            sales.transition(db, _actor(ctx), sub_id, action, customer_id=ctx.customer_id)
        return {"data": _own_subscription(db, ctx, sub_id)}
    endpoint.__name__ = f"portal_{path}"
    router.post(f"/subscriptions/{{sub_id}}/{path}")(endpoint)


for _path, _action in (("accept", "confirm"), ("reject", "close"), ("pause", "pause"), ("resume", "resume"), ("close", "close")):
    _portal_action(_path, _action)


@router.get("/invoices")
def my_invoices(params: PageParams = Depends(page_params), ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    b, c = ctx.business.id, ctx.customer_id
    today = sales.business_today(db, b)
    total = scalar(db, "SELECT count(*) FROM invoices WHERE business_id = :b AND customer_id = :c AND status <> 'draft'", b=b, c=c)
    rows = all_(db, LIST_SELECT + " WHERE i.business_id = :b AND i.customer_id = :c AND i.status <> 'draft' ORDER BY i.issue_date DESC, i.id LIMIT :l OFFSET :o", b=b, c=c, today=today, l=params.page_size, o=params.offset)
    return envelope(rows, int(total or 0), params)


def _own_invoice(db: Session, ctx: AuthContext, invoice_id) -> dict:
    inv = invoice_detail(db, ctx.business.id, invoice_id, ctx.customer_id)
    if inv["status"] == "draft":
        raise not_found("Invoice")
    inv.pop("history", None)
    return inv


@router.get("/invoices/{invoice_id}")
def my_invoice(invoice_id: uuid.UUID, ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    return {"data": _own_invoice(db, ctx, invoice_id)}


@router.get("/invoices/{invoice_id}/print", response_class=HTMLResponse)
def my_invoice_print(invoice_id: uuid.UUID, ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    return HTMLResponse(invoice_html(_own_invoice(db, ctx, invoice_id), ctx.business.name))


@router.get("/payments")
def my_payments(params: PageParams = Depends(page_params), ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    b, c = ctx.business.id, ctx.customer_id
    total = scalar(db, "SELECT count(*) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE p.business_id = :b AND i.customer_id = :c", b=b, c=c)
    rows = all_(db, """SELECT p.id, p.invoice_id, i.number AS invoice_number, p.method, p.amount, p.paid_on, p.reference, p.status FROM payments p JOIN invoices i ON i.id = p.invoice_id
                       WHERE p.business_id = :b AND i.customer_id = :c ORDER BY p.paid_on DESC, p.created_at DESC LIMIT :l OFFSET :o""", b=b, c=c, l=params.page_size, o=params.offset)
    return envelope(rows, int(total or 0), params)


@router.get("/profile")
def get_profile(ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    return {"data": one(db, "SELECT id, name, email, phone, billing_address, tax_id FROM customer_profiles WHERE id = :c AND business_id = :b", c=ctx.customer_id, b=ctx.business.id)}


@router.patch("/profile")
def patch_profile(body: ProfilePatch, ctx: AuthContext = Depends(customer_context), db: Session = Depends(get_db)):
    fields = body.model_dump(exclude_unset=True)
    if fields:
        with guard(db):
            sets = ", ".join(f"{k} = :{k}" for k in fields)
            run(db, f"UPDATE customer_profiles SET {sets} WHERE id = :_c AND business_id = :_b", _c=ctx.customer_id, _b=ctx.business.id, **fields)
    return get_profile(ctx, db)
