import datetime as dt
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.audit import service as audit
from app.core.db import get_db
from app.core.pagination import PageParams, envelope, page_params
from app.core.sql import all_, guard, invalid, not_found, one, raw_all, raw_one, run, scalar
from app.sales import schemas as s
from app.sales import service
from app.tenancy.context import TenantContext, forbidden, get_tenant_context, require

router = APIRouter(tags=["sales"])


def actor_of(ctx: TenantContext) -> dict:
    return {"user_id": ctx.user.id, "role": ctx.role, "business_id": ctx.business_id}


def _sort(sort: str | None, allowed: dict[str, str], default: str) -> str:
    value = sort or default
    key = value.lstrip("-")
    if key not in allowed:
        raise invalid("sort", f"Must be one of: {', '.join(sorted(allowed))}")
    return f"{allowed[key]} {'DESC' if value.startswith('-') else 'ASC'}, s.id"


def _template(db: Session, ctx: TenantContext, tid) -> dict:
    row = one(db, "SELECT t.*, p.name AS plan_name FROM quotation_templates t JOIN plans p ON p.id = t.plan_id WHERE t.id = :i AND t.business_id = :b", i=tid, b=ctx.business_id)
    if not row:
        raise not_found("Template")
    row["lines"] = all_(db, """SELECT l.id, l.product_id, l.variant_id, l.quantity, l.position, p.name AS product_name
                               FROM quotation_template_lines l JOIN products p ON p.id = l.product_id WHERE l.template_id = :t ORDER BY l.position""", t=tid)
    return row


def _write_template_lines(db: Session, ctx: TenantContext, tid, lines: list[s.LineIn]) -> None:
    run(db, "DELETE FROM quotation_template_lines WHERE template_id = :t AND business_id = :b", t=tid, b=ctx.business_id)
    for position, ln in enumerate(lines):
        run(db, "INSERT INTO quotation_template_lines (business_id, template_id, product_id, variant_id, quantity, position) VALUES (:b,:t,:p,:v,:q,:pos)",
            b=ctx.business_id, t=tid, p=ln.product_id, v=ln.variant_id, q=ln.quantity, pos=position)


@router.get("/quotation-templates")
def list_templates(ctx: TenantContext = Depends(require("quotations.view")), db: Session = Depends(get_db)):
    return {"data": all_(db, "SELECT t.*, p.name AS plan_name FROM quotation_templates t JOIN plans p ON p.id = t.plan_id WHERE t.business_id = :b ORDER BY t.name", b=ctx.business_id)}


@router.post("/quotation-templates", status_code=201)
def create_template(body: s.TemplateIn, ctx: TenantContext = Depends(require("quotations.create")), db: Session = Depends(get_db)):
    tid = uuid.uuid4()
    with guard(db):
        run(db, "INSERT INTO quotation_templates (id, business_id, name, plan_id, validity_days, payment_terms_days, notes) VALUES (:i,:b,:n,:p,:v,:t,:no)",
            i=tid, b=ctx.business_id, n=body.name, p=body.plan_id, v=body.validity_days, t=body.payment_terms_days, no=body.notes)
        _write_template_lines(db, ctx, tid, body.lines)
        audit.record(db, "quotation_template.create", actor_user_id=ctx.user.id, actor_role=ctx.role, business_id=ctx.business_id, entity_type="quotation_template", entity_id=tid, after={"name": body.name})
    return {"data": _template(db, ctx, tid)}


@router.get("/quotation-templates/{template_id}")
def get_template(template_id: uuid.UUID, ctx: TenantContext = Depends(require("quotations.view")), db: Session = Depends(get_db)):
    return {"data": _template(db, ctx, template_id)}


@router.patch("/quotation-templates/{template_id}")
def patch_template(template_id: uuid.UUID, body: s.TemplatePatch, ctx: TenantContext = Depends(require("quotations.update")), db: Session = Depends(get_db)):
    _template(db, ctx, template_id)
    fields = body.model_dump(exclude_unset=True, exclude={"lines"})
    with guard(db):
        if fields:
            sets = ", ".join(f"{k} = :{k}" for k in fields)
            run(db, f"UPDATE quotation_templates SET {sets} WHERE id = :_i AND business_id = :_b", _i=template_id, _b=ctx.business_id, **fields)
        if body.lines is not None:
            _write_template_lines(db, ctx, template_id, body.lines)
        audit.record(db, "quotation_template.update", actor_user_id=ctx.user.id, actor_role=ctx.role, business_id=ctx.business_id, entity_type="quotation_template", entity_id=template_id)
    return {"data": _template(db, ctx, template_id)}


@router.get("/subscriptions")
def list_subscriptions(status: str | None = None, stage: str | None = None, customer_id: uuid.UUID | None = None, plan_id: uuid.UUID | None = None,
                       q: str | None = Query(None, max_length=100), sort: str | None = None, params: PageParams = Depends(page_params),
                       ctx: TenantContext = Depends(get_tenant_context), db: Session = Depends(get_db)):
    needed = "quotations.view" if stage == "quotation" else "subscriptions.view"
    if not ctx.allows(needed):
        raise forbidden(f"Missing permission: {needed}")
    where, p = " WHERE s.business_id = :b", {"b": ctx.business_id}
    if stage == "quotation":
        where += " AND s.status IN ('draft','quotation')"
    if status:
        where += " AND s.status = :st"; p["st"] = status
    if customer_id:
        where += " AND s.customer_id = :c"; p["c"] = customer_id
    if plan_id:
        where += " AND s.plan_id = :pl"; p["pl"] = plan_id
    if q:
        where += " AND (s.number ILIKE :q OR c.name ILIKE :q)"; p["q"] = f"%{q}%"
    base = f"""SELECT s.id, s.number, s.status, s.billing_interval, s.start_date, s.expiry_date, s.next_period_start, s.quotation_valid_until, s.created_at,
               c.id AS customer_id, c.name AS customer_name, c.email AS customer_email, pl.id AS plan_id, pl.name AS plan_name,
               pl.allow_pause, pl.allow_early_close, pl.allow_renewal, s.start_date AS _start,
               COALESCE((SELECT sum(sl.quantity * sl.unit_price) FROM subscription_lines sl WHERE sl.subscription_id = s.id), 0) AS subtotal
               FROM subscriptions s JOIN customer_profiles c ON c.id = s.customer_id JOIN plans pl ON pl.id = s.plan_id{where}"""
    total = scalar(db, f"SELECT count(*) FROM subscriptions s JOIN customer_profiles c ON c.id = s.customer_id{where}", **p)
    order = _sort(sort, {"created_at": "s.created_at", "number": "s.number", "start_date": "s.start_date", "expiry_date": "s.expiry_date", "status": "s.status"}, "-created_at")
    rows = all_(db, f"{base} ORDER BY {order} LIMIT :_l OFFSET :_o", _l=params.page_size, _o=params.offset, **p)
    today = service.business_today(db, ctx.business_id)
    for row in rows:
        plan = {"allow_pause": row.pop("allow_pause"), "allow_early_close": row.pop("allow_early_close"), "allow_renewal": row.pop("allow_renewal")}
        sub = {"status": row["status"], "start_date": dt.date.fromisoformat(row.pop("_start"))}
        row["allowed_actions"] = service.allowed_actions(sub, plan, True, today)
    return envelope(rows, int(total or 0), params)


@router.post("/subscriptions", status_code=201)
def create_subscription(body: s.SubscriptionIn, ctx: TenantContext = Depends(require("subscriptions.create")), db: Session = Depends(get_db)):
    with guard(db):
        sid = service.create_subscription(db, actor_of(ctx), body)
    return {"data": service.get_subscription(db, ctx.business_id, sid)}


@router.get("/subscriptions/{sub_id}")
def get_subscription(sub_id: uuid.UUID, ctx: TenantContext = Depends(require("subscriptions.view")), db: Session = Depends(get_db)):
    return {"data": service.get_subscription(db, ctx.business_id, sub_id)}


@router.patch("/subscriptions/{sub_id}")
def patch_subscription(sub_id: uuid.UUID, body: s.SubscriptionPatch, ctx: TenantContext = Depends(require("subscriptions.update")), db: Session = Depends(get_db)):
    with guard(db):
        service.update_subscription(db, actor_of(ctx), sub_id, body)
    return {"data": service.get_subscription(db, ctx.business_id, sub_id)}


def _action(name: str, permission: str):
    def endpoint(sub_id: uuid.UUID, body: s.ReasonBody | None = None, ctx: TenantContext = Depends(require(permission)), db: Session = Depends(get_db)):
        with guard(db):
            service.transition(db, actor_of(ctx), sub_id, name, {"reason": body.reason if body else None})
        return {"data": service.get_subscription(db, ctx.business_id, sub_id)}
    endpoint.__name__ = f"subscription_{name.replace('-', '_')}"
    router.post(f"/subscriptions/{{sub_id}}/{name}")(endpoint)


for _name, _perm in (("send-quotation", "quotations.manage"), ("confirm", "subscriptions.manage"), ("activate", "subscriptions.manage"),
                     ("pause", "subscriptions.manage"), ("resume", "subscriptions.manage"), ("close", "subscriptions.manage")):
    _action(_name, _perm)


@router.post("/subscriptions/{sub_id}/renew")
def renew_subscription(sub_id: uuid.UUID, body: s.RenewBody, ctx: TenantContext = Depends(require("subscriptions.manage")), db: Session = Depends(get_db)):
    with guard(db):
        service.transition(db, actor_of(ctx), sub_id, "renew", {"expiry_date": body.expiry_date})
    return {"data": service.get_subscription(db, ctx.business_id, sub_id)}


@router.get("/subscriptions/{sub_id}/history")
def subscription_history(sub_id: uuid.UUID, ctx: TenantContext = Depends(require("subscriptions.view")), db: Session = Depends(get_db)):
    if not scalar(db, "SELECT 1 FROM subscriptions WHERE id = :i AND business_id = :b", i=sub_id, b=ctx.business_id):
        raise not_found("Subscription")
    return {"data": all_(db, """SELECT a.id, a.action, a.before, a.after, a.created_at, u.full_name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
                                WHERE a.business_id = :b AND a.entity_type = 'subscription' AND a.entity_id = :i ORDER BY a.created_at, a.id""", b=ctx.business_id, i=sub_id)}


@router.get("/subscriptions/{sub_id}/invoices")
def subscription_invoices(sub_id: uuid.UUID, ctx: TenantContext = Depends(require("subscriptions.view")), db: Session = Depends(get_db)):
    if not scalar(db, "SELECT 1 FROM subscriptions WHERE id = :i AND business_id = :b", i=sub_id, b=ctx.business_id):
        raise not_found("Subscription")
    return {"data": all_(db, "SELECT id, number, status, period_start, period_end, issue_date, due_date, total, amount_paid FROM invoices WHERE subscription_id = :i AND business_id = :b ORDER BY period_start DESC", i=sub_id, b=ctx.business_id)}


@router.get("/renewals")
def renewals(within_days: int = Query(30, ge=1, le=365), ctx: TenantContext = Depends(require("subscriptions.view")), db: Session = Depends(get_db)):
    today = service.business_today(db, ctx.business_id)
    rows = all_(db, """SELECT s.id, s.number, s.status, s.expiry_date, c.name AS customer_name, pl.name AS plan_name, pl.allow_renewal, pl.auto_close_on_expiry,
                       (s.expiry_date < :t) AS expired
                       FROM subscriptions s JOIN customer_profiles c ON c.id = s.customer_id JOIN plans pl ON pl.id = s.plan_id
                       WHERE s.business_id = :b AND s.status IN ('active','paused') AND s.expiry_date <= :t + :d * interval '1 day' ORDER BY s.expiry_date""",
                b=ctx.business_id, t=today, d=within_days)
    return {"data": rows}
