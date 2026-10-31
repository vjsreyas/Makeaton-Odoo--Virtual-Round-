import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.audit import service as audit
from app.auth.dependencies import AuthContext
from app.core.db import get_db
from app.core.pagination import PageParams, envelope, page_params
from app.core.sql import all_, guard, not_found, one, run, scalar
from app.tenancy.context import TenantContext, get_tenant_context, require_admin, require_platform

router = APIRouter(tags=["misc"])


class SettingsPatch(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    auto_confirm_invoices: bool | None = None
    default_payment_terms_days: int | None = Field(default=None, ge=0, le=365)
    customer_self_service: bool | None = None
    legal_name: str | None = Field(default=None, max_length=200)
    address: str | None = Field(default=None, max_length=1000)
    tax_id: str | None = Field(default=None, max_length=100)
    contact_email: str | None = Field(default=None, max_length=200)


SETTINGS_SQL = "SELECT id, name, slug, timezone, currency, auto_confirm_invoices, default_payment_terms_days, customer_self_service, legal_name, address, tax_id, contact_email FROM businesses WHERE id = :b"


@router.get("/settings")
def get_settings_(ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    return {"data": one(db, SETTINGS_SQL, b=ctx.business_id)}


@router.patch("/settings")
def patch_settings(body: SettingsPatch, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    fields = body.model_dump(exclude_unset=True)
    if fields:
        before = one(db, SETTINGS_SQL, b=ctx.business_id)
        with guard(db):
            sets = ", ".join(f"{k} = :{k}" for k in fields)
            run(db, f"UPDATE businesses SET {sets} WHERE id = :_b", _b=ctx.business_id, **fields)
            audit.record(db, "settings.update", actor_user_id=ctx.user.id, actor_role=ctx.role, business_id=ctx.business_id, entity_type="business", entity_id=ctx.business_id,
                         before={k: before[k] for k in fields}, after=body.model_dump(mode="json", exclude_unset=True))
    return {"data": one(db, SETTINGS_SQL, b=ctx.business_id)}


@router.get("/audit-logs")
def audit_logs(entity_type: str | None = None, action: str | None = None, from_: dt.date | None = Query(None, alias="from"), to: dt.date | None = None,
               params: PageParams = Depends(page_params), ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    where, p = " WHERE a.business_id = :b", {"b": ctx.business_id}
    if entity_type:
        where += " AND a.entity_type = :et"; p["et"] = entity_type
    if action:
        where += " AND a.action ILIKE :ac"; p["ac"] = f"{action}%"
    if from_:
        where += " AND a.created_at >= :f"; p["f"] = from_
    if to:
        where += " AND a.created_at < CAST(:t AS date) + 1"; p["t"] = to
    total = scalar(db, f"SELECT count(*) FROM audit_logs a{where}", **p)
    rows = all_(db, f"SELECT a.id, a.action, a.actor_role, a.entity_type, a.entity_id, a.before, a.after, a.request_id, a.created_at, u.full_name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id{where} ORDER BY a.created_at DESC, a.id LIMIT :_l OFFSET :_o", _l=params.page_size, _o=params.offset, **p)
    return envelope(rows, int(total or 0), params)


@router.get("/notifications")
def notifications(params: PageParams = Depends(page_params), ctx: TenantContext = Depends(get_tenant_context), db: Session = Depends(get_db)):
    where = " WHERE business_id = :b AND user_id = :u AND channel = 'in_app'"
    total = scalar(db, f"SELECT count(*) FROM notifications{where}", b=ctx.business_id, u=ctx.user.id)
    rows = all_(db, f"SELECT id, kind, subject, body, status, created_at FROM notifications{where} ORDER BY created_at DESC LIMIT :l OFFSET :o", b=ctx.business_id, u=ctx.user.id, l=params.page_size, o=params.offset)
    return envelope(rows, int(total or 0), params)


@router.post("/notifications/{notification_id}/read")
def read_notification(notification_id: uuid.UUID, ctx: TenantContext = Depends(get_tenant_context), db: Session = Depends(get_db)):
    if not scalar(db, "SELECT 1 FROM notifications WHERE id = :i AND business_id = :b AND user_id = :u AND channel = 'in_app'", i=notification_id, b=ctx.business_id, u=ctx.user.id):
        raise not_found("Notification")
    with guard(db):
        run(db, "UPDATE notifications SET status = 'read' WHERE id = :i", i=notification_id)
    return {"data": one(db, "SELECT id, kind, subject, body, status, created_at FROM notifications WHERE id = :i", i=notification_id)}


@router.get("/platform/stats")
def platform_stats(ctx: AuthContext = Depends(require_platform), db: Session = Depends(get_db)):
    return {"data": {
        "businesses": all_(db, "SELECT status, count(*) AS count FROM businesses GROUP BY status ORDER BY status"),
        "users": scalar(db, "SELECT count(*) FROM users"),
        "registrations_by_month": all_(db, "SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*) AS count FROM businesses GROUP BY 1 ORDER BY 1 DESC LIMIT 12"),
        "per_business": all_(db, """SELECT b.id, b.name, b.status, (SELECT count(*) FROM subscriptions s WHERE s.business_id = b.id) AS subscriptions,
                                    (SELECT count(*) FROM subscriptions s WHERE s.business_id = b.id AND s.status = 'active') AS active_subscriptions
                                    FROM businesses b ORDER BY b.created_at DESC LIMIT 100""")}}


@router.get("/platform/audit-logs")
def platform_audit(params: PageParams = Depends(page_params), ctx: AuthContext = Depends(require_platform), db: Session = Depends(get_db)):
    total = scalar(db, "SELECT count(*) FROM audit_logs WHERE business_id IS NULL")
    rows = all_(db, "SELECT a.id, a.action, a.actor_role, a.entity_type, a.entity_id, a.before, a.after, a.created_at, u.full_name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id WHERE a.business_id IS NULL ORDER BY a.created_at DESC LIMIT :l OFFSET :o", l=params.page_size, o=params.offset)
    return envelope(rows, int(total or 0), params)
