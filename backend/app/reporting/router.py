import datetime as dt
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.billing.schedule import MONTHLY_FACTOR
from app.core.db import get_db
from app.core.sql import all_, one, raw_all, scalar, ser
from app.sales.service import business_today
from app.tenancy.context import TenantContext, require

router = APIRouter(prefix="/reports", tags=["reports"])


def _filters(from_, to, customer_id, plan_id, status, inv_alias="i", sub_alias="s"):
    where, p = "", {}
    if customer_id:
        where += f" AND {sub_alias}.customer_id = :cust"; p["cust"] = customer_id
    if plan_id:
        where += f" AND {sub_alias}.plan_id = :plan"; p["plan"] = plan_id
    if status:
        where += f" AND {sub_alias}.status = :sstatus"; p["sstatus"] = status
    return where, p


def _mrr(db: Session, bid, where: str, p: dict) -> Decimal:
    rows = raw_all(db, f"""SELECT s.billing_interval, sum(sl.quantity * sl.unit_price) AS amount FROM subscriptions s JOIN subscription_lines sl ON sl.subscription_id = s.id
                           WHERE s.business_id = :b AND s.status = 'active'{where} GROUP BY s.billing_interval""", b=bid, **p)
    total = Decimal("0")
    for row in rows:
        total += row["amount"] * Decimal(str(MONTHLY_FACTOR[row["billing_interval"]]))
    return total.quantize(Decimal("0.01"))


@router.get("/dashboard")
def dashboard(from_: dt.date | None = Query(None, alias="from"), to: dt.date | None = None, customer_id: uuid.UUID | None = None, plan_id: uuid.UUID | None = None, status: str | None = None,
              ctx: TenantContext = Depends(require("reports.view")), db: Session = Depends(get_db)):
    bid = ctx.business_id
    today = business_today(db, bid)
    sw, sp = _filters(from_, to, customer_id, plan_id, status)
    rng, rp = "", {}
    if from_:
        rng += " AND {col} >= :from_"; rp["from_"] = from_
    if to:
        rng += " AND {col} <= :to_"; rp["to_"] = to
    pay_rng, inv_rng = rng.format(col="p.paid_on"), rng.format(col="i.issue_date")
    base = {"b": bid, "today": today, **sp, **rp}
    active = scalar(db, f"SELECT count(*) FROM subscriptions s WHERE s.business_id = :b AND s.status = 'active'{sw if not status else sw.replace('AND s.status = :sstatus', '')}", **{k: v for k, v in base.items() if k != 'sstatus'})
    collected = scalar(db, f"SELECT COALESCE(sum(p.amount),0) FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN subscriptions s ON s.id = i.subscription_id WHERE p.business_id = :b AND p.status = 'recorded'{pay_rng}{sw}", **base)
    invoiced = scalar(db, f"SELECT COALESCE(sum(i.total),0) FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id WHERE i.business_id = :b AND i.status <> 'cancelled'{inv_rng}{sw}", **base)
    outstanding = scalar(db, f"SELECT COALESCE(sum(i.total - i.amount_paid),0) FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id WHERE i.business_id = :b AND i.status = 'confirmed'{sw}", **base)
    overdue = one(db, f"SELECT count(*) AS count, COALESCE(sum(i.total - i.amount_paid),0) AS amount FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id WHERE i.business_id = :b AND i.status = 'confirmed' AND i.total - i.amount_paid > 0 AND i.due_date < :today{sw}", **base)
    by_method = all_(db, f"SELECT p.method, count(*) AS count, sum(p.amount) AS amount FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN subscriptions s ON s.id = i.subscription_id WHERE p.business_id = :b AND p.status = 'recorded'{pay_rng}{sw} GROUP BY p.method ORDER BY amount DESC", **base)
    months = all_(db, f"""SELECT m.month, COALESCE(c.collected, 0) AS collected, COALESCE(v.invoiced, 0) AS invoiced FROM
                          (SELECT to_char(date_trunc('month', d), 'YYYY-MM') AS month FROM generate_series(date_trunc('month', CAST(:today AS date)) - interval '11 months', date_trunc('month', CAST(:today AS date)), interval '1 month') d) m
                          LEFT JOIN (SELECT to_char(date_trunc('month', p.paid_on), 'YYYY-MM') AS month, sum(p.amount) AS collected FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN subscriptions s ON s.id = i.subscription_id WHERE p.business_id = :b AND p.status = 'recorded'{sw} GROUP BY 1) c ON c.month = m.month
                          LEFT JOIN (SELECT to_char(date_trunc('month', i.issue_date), 'YYYY-MM') AS month, sum(i.total) AS invoiced FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id WHERE i.business_id = :b AND i.status <> 'cancelled'{sw} GROUP BY 1) v ON v.month = m.month ORDER BY m.month""", **base)
    recent = all_(db, f"""SELECT i.id, i.number, c.name AS customer, (i.total - i.amount_paid) AS balance, (:today - i.due_date) AS days_overdue FROM invoices i JOIN customer_profiles c ON c.id = i.customer_id JOIN subscriptions s ON s.id = i.subscription_id
                          WHERE i.business_id = :b AND i.status = 'confirmed' AND i.total - i.amount_paid > 0 AND i.due_date < :today{sw} ORDER BY i.due_date LIMIT 5""", **base)
    renewals = scalar(db, f"SELECT count(*) FROM subscriptions s WHERE s.business_id = :b AND s.status IN ('active','paused') AND s.expiry_date <= :today + interval '30 days'{sw}", **base)
    by_status = all_(db, f"SELECT s.status, count(*) AS count FROM subscriptions s WHERE s.business_id = :b{sw} GROUP BY s.status ORDER BY s.status", **{k: v for k, v in base.items() if k != 'sstatus'})
    return {"data": ser({"active_subscriptions": active, "revenue_collected": collected, "invoiced_total": invoiced, "outstanding_total": outstanding, "overdue": overdue,
                        "payments_count": sum(r["count"] for r in raw_all(db, f"SELECT count(*) AS count FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN subscriptions s ON s.id = i.subscription_id WHERE p.business_id = :b AND p.status = 'recorded'{pay_rng}{sw}", **base)),
                        "payments_by_method": by_method, "revenue_by_month": months, "recent_overdue_invoices": recent, "mrr": _mrr(db, bid, sw, sp), "upcoming_renewals": renewals,
                        "subscriptions_by_status": by_status, "currency": ctx.business.currency})}


@router.get("/revenue")
def revenue(from_: dt.date | None = Query(None, alias="from"), to: dt.date | None = None, customer_id: uuid.UUID | None = None, plan_id: uuid.UUID | None = None, status: str | None = None,
            ctx: TenantContext = Depends(require("reports.view")), db: Session = Depends(get_db)):
    sw, sp = _filters(from_, to, customer_id, plan_id, status)
    rng, rp = "", {}
    if from_:
        rng += " AND p.paid_on >= :from_"; rp["from_"] = from_
    if to:
        rng += " AND p.paid_on <= :to_"; rp["to_"] = to
    base = {"b": ctx.business_id, **sp, **rp}
    j = "FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN subscriptions s ON s.id = i.subscription_id JOIN customer_profiles c ON c.id = i.customer_id"
    return {"data": {
        "total": scalar(db, f"SELECT COALESCE(sum(p.amount),0) {j} WHERE p.business_id = :b AND p.status = 'recorded'{rng}{sw}", **base).__str__(),
        "by_month": all_(db, f"SELECT to_char(date_trunc('month', p.paid_on), 'YYYY-MM') AS month, sum(p.amount) AS collected {j} WHERE p.business_id = :b AND p.status = 'recorded'{rng}{sw} GROUP BY 1 ORDER BY 1", **base),
        "by_method": all_(db, f"SELECT p.method, count(*) AS count, sum(p.amount) AS amount {j} WHERE p.business_id = :b AND p.status = 'recorded'{rng}{sw} GROUP BY 1 ORDER BY 3 DESC", **base),
        "top_customers": all_(db, f"SELECT c.id, c.name, sum(p.amount) AS amount {j} WHERE p.business_id = :b AND p.status = 'recorded'{rng}{sw} GROUP BY c.id, c.name ORDER BY 3 DESC LIMIT 10", **base),
        "currency": ctx.business.currency}}


@router.get("/receivables")
def receivables(customer_id: uuid.UUID | None = None, plan_id: uuid.UUID | None = None, ctx: TenantContext = Depends(require("reports.view")), db: Session = Depends(get_db)):
    today = business_today(db, ctx.business_id)
    sw, sp = _filters(None, None, customer_id, plan_id, None)
    base = {"b": ctx.business_id, "today": today, **sp}
    j = "FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id JOIN customer_profiles c ON c.id = i.customer_id WHERE i.business_id = :b AND i.status = 'confirmed' AND i.total - i.amount_paid > 0"
    buckets = all_(db, f"""SELECT bucket, count(*) AS count, sum(balance) AS amount FROM (SELECT (i.total - i.amount_paid) AS balance,
                           CASE WHEN i.due_date >= :today THEN 'current' WHEN :today - i.due_date <= 30 THEN '1-30' WHEN :today - i.due_date <= 60 THEN '31-60' ELSE '60+' END AS bucket {j}{sw}) t GROUP BY bucket""", **base)
    order = {"current": 0, "1-30": 1, "31-60": 2, "60+": 3}
    have = {b["bucket"]: b for b in buckets}
    full = [have.get(k, {"bucket": k, "count": 0, "amount": "0.00"}) for k in order]
    rows = all_(db, f"""SELECT i.id, i.number, c.id AS customer_id, c.name AS customer_name, c.email AS customer_email, i.issue_date, i.due_date, i.total, (i.total - i.amount_paid) AS balance,
                        GREATEST(:today - i.due_date, 0) AS days_overdue {j}{sw} ORDER BY i.due_date LIMIT 100""", **base)
    return {"data": {"buckets": full, "invoices": rows, "total_outstanding": str(scalar(db, f"SELECT COALESCE(sum(i.total - i.amount_paid),0) {j}{sw}", **base)), "currency": ctx.business.currency}}


@router.get("/subscriptions-summary")
def subscriptions_summary(customer_id: uuid.UUID | None = None, plan_id: uuid.UUID | None = None, status: str | None = None, ctx: TenantContext = Depends(require("reports.view")), db: Session = Depends(get_db)):
    sw, sp = _filters(None, None, customer_id, plan_id, status)
    base = {"b": ctx.business_id, **sp}
    return {"data": {
        "by_status": all_(db, f"SELECT s.status, count(*) AS count FROM subscriptions s WHERE s.business_id = :b{sw} GROUP BY s.status ORDER BY s.status", **base),
        "by_plan": all_(db, f"SELECT p.id, p.name, count(*) AS count FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.business_id = :b{sw} GROUP BY p.id, p.name ORDER BY count DESC", **base),
        "mrr": str(_mrr(db, ctx.business_id, sw, sp)), "currency": ctx.business.currency}}
