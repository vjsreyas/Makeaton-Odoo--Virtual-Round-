import datetime as dt
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.audit import service as audit
from app.core.db import get_db
from app.core.errors import AppError
from app.core.pagination import PageParams, envelope, page_params
from app.core.sql import all_, guard, invalid, not_found, raw_one, run, scalar
from app.invoicing.service import LIST_SELECT, invoice_detail, invoice_html
from app.notifications.outbox import enqueue_email
from app.sales.service import business_today
from app.tenancy.context import TenantContext, require

router = APIRouter(tags=["invoices"])


class ReasonBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str | None = Field(default=None, max_length=500)


class BulkBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ids: list[uuid.UUID] | None = Field(default=None, max_length=500)


def _log(db: Session, ctx: TenantContext, action: str, invoice_id, before=None, after=None) -> None:
    audit.record(db, action, actor_user_id=ctx.user.id, actor_role=ctx.role, business_id=ctx.business_id, entity_type="invoice", entity_id=invoice_id, before=before, after=after)


def _state_error(message: str) -> AppError:
    return AppError("INVALID_STATE_TRANSITION", message, status_code=409)


@router.get("/invoices")
def list_invoices(status: Literal["draft", "confirmed", "paid", "cancelled"] | None = None, customer_id: uuid.UUID | None = None, subscription_id: uuid.UUID | None = None,
                  payment_state: Literal["unpaid", "partial", "paid"] | None = None, overdue: bool | None = None, from_: dt.date | None = Query(None, alias="from"), to: dt.date | None = None,
                  q: str | None = Query(None, max_length=100), sort: str | None = None, params: PageParams = Depends(page_params),
                  ctx: TenantContext = Depends(require("invoices.view")), db: Session = Depends(get_db)):
    today = business_today(db, ctx.business_id)
    where, p = " WHERE i.business_id = :b", {"b": ctx.business_id, "today": today}
    if status:
        where += " AND i.status = :st"; p["st"] = status
    if customer_id:
        where += " AND i.customer_id = :c"; p["c"] = customer_id
    if subscription_id:
        where += " AND i.subscription_id = :s"; p["s"] = subscription_id
    if payment_state == "unpaid":
        where += " AND i.amount_paid = 0"
    elif payment_state == "partial":
        where += " AND i.amount_paid > 0 AND i.amount_paid < i.total"
    elif payment_state == "paid":
        where += " AND i.amount_paid >= i.total"
    if overdue is True:
        where += " AND i.status = 'confirmed' AND i.total - i.amount_paid > 0 AND i.due_date < :today"
    if from_:
        where += " AND i.issue_date >= :f"; p["f"] = from_
    if to:
        where += " AND i.issue_date <= :t"; p["t"] = to
    if q:
        where += " AND (i.number ILIKE :q OR c.name ILIKE :q)"; p["q"] = f"%{q}%"
    allowed = {"created_at": "i.created_at", "issue_date": "i.issue_date", "due_date": "i.due_date", "total": "i.total", "number": "i.number"}
    value = sort or "-created_at"
    if value.lstrip("-") not in allowed:
        raise invalid("sort", f"Must be one of: {', '.join(sorted(allowed))}")
    order = f"{allowed[value.lstrip('-')]} {'DESC' if value.startswith('-') else 'ASC'}, i.id"
    total = scalar(db, f"SELECT count(*) FROM invoices i JOIN customer_profiles c ON c.id = i.customer_id{where}", **p)
    rows = all_(db, f"{LIST_SELECT}{where} ORDER BY {order} LIMIT :_l OFFSET :_o", _l=params.page_size, _o=params.offset, **p)
    return envelope(rows, int(total or 0), params)


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: uuid.UUID, ctx: TenantContext = Depends(require("invoices.view")), db: Session = Depends(get_db)):
    return {"data": invoice_detail(db, ctx.business_id, invoice_id)}


def _lock(db: Session, ctx: TenantContext, invoice_id) -> dict:
    row = raw_one(db, "SELECT * FROM invoices WHERE id = :i AND business_id = :b FOR UPDATE", i=invoice_id, b=ctx.business_id)
    if not row:
        raise not_found("Invoice")
    return row


def _confirm(db: Session, ctx: TenantContext, invoice_id) -> None:
    inv = _lock(db, ctx, invoice_id)
    if inv["status"] != "draft":
        raise _state_error("Only a draft invoice can be confirmed")
    new_status = "paid" if inv["total"] == 0 else "confirmed"
    run(db, "UPDATE invoices SET status = :s, confirmed_at = now(), paid_at = CASE WHEN :s = 'paid' THEN now() ELSE NULL END WHERE id = :i", s=new_status, i=invoice_id)
    _log(db, ctx, "invoice.confirm", invoice_id, before={"status": "draft"}, after={"status": new_status})


@router.post("/invoices/{invoice_id}/confirm")
def confirm_invoice(invoice_id: uuid.UUID, ctx: TenantContext = Depends(require("invoices.manage")), db: Session = Depends(get_db)):
    with guard(db):
        _confirm(db, ctx, invoice_id)
    return {"data": invoice_detail(db, ctx.business_id, invoice_id)}


@router.post("/invoices/bulk-confirm")
def bulk_confirm(body: BulkBody | None = None, ctx: TenantContext = Depends(require("invoices.manage")), db: Session = Depends(get_db)):
    ids = body.ids if body and body.ids else [r["id"] for r in all_(db, "SELECT id FROM invoices WHERE business_id = :b AND status = 'draft' ORDER BY created_at LIMIT 500", b=ctx.business_id)]
    confirmed, skipped = 0, []
    for iid in ids:
        try:
            with guard(db):
                _confirm(db, ctx, iid)
            confirmed += 1
        except AppError as exc:
            skipped.append({"id": str(iid), "reason": exc.message})
    return {"data": {"confirmed": confirmed, "skipped": skipped}}


@router.post("/invoices/{invoice_id}/cancel")
def cancel_invoice(invoice_id: uuid.UUID, body: ReasonBody | None = None, ctx: TenantContext = Depends(require("invoices.manage")), db: Session = Depends(get_db)):
    with guard(db):
        inv = _lock(db, ctx, invoice_id)
        if inv["status"] not in ("draft", "confirmed"):
            raise _state_error("This invoice cannot be cancelled")
        if inv["status"] == "confirmed" and scalar(db, "SELECT count(*) FROM payments WHERE invoice_id = :i AND status = 'recorded'", i=invoice_id):
            raise _state_error("Void the recorded payments before cancelling this invoice")
        run(db, "UPDATE invoices SET status = 'cancelled', cancelled_at = now(), cancel_reason = :r WHERE id = :i", r=body.reason if body else None, i=invoice_id)
        run(db, """UPDATE discount_rules SET times_used = times_used - 1 WHERE id IN (SELECT discount_rule_id FROM discount_redemptions WHERE invoice_id = :i AND released_at IS NULL)""", i=invoice_id)
        run(db, "UPDATE discount_redemptions SET released_at = now() WHERE invoice_id = :i AND released_at IS NULL", i=invoice_id)
        _log(db, ctx, "invoice.cancel", invoice_id, before={"status": inv["status"]}, after={"status": "cancelled", "reason": body.reason if body else None})
    return {"data": invoice_detail(db, ctx.business_id, invoice_id)}


@router.post("/invoices/{invoice_id}/send")
def send_invoice(invoice_id: uuid.UUID, ctx: TenantContext = Depends(require("invoices.manage")), db: Session = Depends(get_db)):
    with guard(db):
        inv = _lock(db, ctx, invoice_id)
        if inv["status"] not in ("confirmed", "paid"):
            raise _state_error("Only confirmed or paid invoices can be sent")
        email = (inv["customer_snapshot"] or {}).get("email")
        if not email:
            raise invalid("customer", "The customer has no email address")
        enqueue_email(db, to_email=email, subject=f"Invoice {inv['number']} from {ctx.business.name}",
                      body=f"Hello {(inv['customer_snapshot'] or {}).get('name', '')},\n\nInvoice {inv['number']} for {inv['currency']} {inv['total']} is due on {inv['due_date']}.\n"
                           f"Amount paid so far: {inv['amount_paid']}.\n\nThank you,\n{ctx.business.name}\n",
                      kind="invoice.sent", business_id=ctx.business_id)
        run(db, "UPDATE invoices SET sent_at = now() WHERE id = :i", i=invoice_id)
        _log(db, ctx, "invoice.send", invoice_id, after={"to": email})
    return {"data": invoice_detail(db, ctx.business_id, invoice_id)}


@router.get("/invoices/{invoice_id}/print", response_class=HTMLResponse)
def print_invoice(invoice_id: uuid.UUID, ctx: TenantContext = Depends(require("invoices.view")), db: Session = Depends(get_db)):
    return HTMLResponse(invoice_html(invoice_detail(db, ctx.business_id, invoice_id), ctx.business.name))
