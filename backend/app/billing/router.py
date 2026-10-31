import datetime as dt
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.billing.engine import run_billing, run_maintenance
from app.core.config import get_settings
from app.core.db import get_db
from app.core.pagination import PageParams, envelope, page_params
from app.core.sql import all_, invalid, not_found, one, scalar
from app.sales.service import business_today
from app.tenancy.context import TenantContext, require, require_admin

router = APIRouter(tags=["billing"])


class RunBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    as_of_date: dt.date | None = None
    subscription_id: uuid.UUID | None = None


@router.post("/billing-runs", status_code=202)
def trigger_run(body: RunBody | None = None, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    body = body or RunBody()
    today = business_today(db, ctx.business_id)
    as_of = body.as_of_date or today
    if as_of > today and not get_settings().allow_billing_time_travel:
        raise invalid("as_of_date", "Must not be in the future")
    if body.subscription_id and not scalar(db, "SELECT 1 FROM subscriptions WHERE id = :s AND business_id = :b", s=body.subscription_id, b=ctx.business_id):
        raise not_found("Subscription")
    db.commit()
    bind = db.get_bind()
    run_maintenance(ctx.business_id, today, bind)
    return {"data": run_billing(ctx.business_id, as_of, "manual", ctx.user.id, body.subscription_id, bind)}


@router.get("/billing-runs")
def list_runs(params: PageParams = Depends(page_params), ctx: TenantContext = Depends(require("billing_runs.view")), db: Session = Depends(get_db)):
    total = scalar(db, "SELECT count(*) FROM billing_runs WHERE business_id = :b", b=ctx.business_id)
    rows = all_(db, "SELECT * FROM billing_runs WHERE business_id = :b ORDER BY started_at DESC LIMIT :l OFFSET :o", b=ctx.business_id, l=params.page_size, o=params.offset)
    return envelope(rows, int(total or 0), params)


@router.get("/billing-runs/{run_id}")
def get_run(run_id: uuid.UUID, ctx: TenantContext = Depends(require("billing_runs.view")), db: Session = Depends(get_db)):
    row = one(db, "SELECT * FROM billing_runs WHERE id = :i AND business_id = :b", i=run_id, b=ctx.business_id)
    if not row:
        raise not_found("Billing run")
    return {"data": row}


@router.get("/billing-runs/{run_id}/items")
def run_items(run_id: uuid.UUID, outcome: str | None = Query(None, pattern="^(created|skipped|failed)$"), params: PageParams = Depends(page_params),
              ctx: TenantContext = Depends(require("billing_runs.view")), db: Session = Depends(get_db)):
    if not scalar(db, "SELECT 1 FROM billing_runs WHERE id = :i AND business_id = :b", i=run_id, b=ctx.business_id):
        raise not_found("Billing run")
    where = " AND i.outcome = :o" if outcome else ""
    total = scalar(db, f"SELECT count(*) FROM billing_run_items i WHERE i.billing_run_id = :r{where}", r=run_id, o=outcome)
    rows = all_(db, f"""SELECT i.id, i.subscription_id, s.number AS subscription_number, c.name AS customer_name, i.period_start, i.outcome, i.reason_code, i.message, i.invoice_id
                        FROM billing_run_items i JOIN subscriptions s ON s.id = i.subscription_id JOIN customer_profiles c ON c.id = s.customer_id
                        WHERE i.billing_run_id = :r{where} ORDER BY i.created_at, i.id LIMIT :l OFFSET :of""", r=run_id, o=outcome, l=params.page_size, of=params.offset)
    return envelope(rows, int(total or 0), params)
