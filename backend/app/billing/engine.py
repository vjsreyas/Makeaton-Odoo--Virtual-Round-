import datetime as dt
import logging
import uuid
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session as _Session

from app.audit import service as audit
from app.billing.calculator import LineInput, RuleInput, calculate
from app.billing.schedule import period_end, period_start
from app.core.db import get_engine
from app.core.errors import AppError
from app.core.sql import next_number, raw_all, raw_one, run, scalar, ser


def Session(bind, **kw):
    return _Session(bind, expire_on_commit=False, join_transaction_mode="create_savepoint")


logger = logging.getLogger("app.billing.engine")
MAX_PERIODS_PER_RUN = 50


class BillingFailure(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def advisory_keys(business_id: uuid.UUID) -> tuple[int, int]:
    raw = business_id.bytes
    return (int.from_bytes(raw[0:4], "big", signed=True), int.from_bytes(raw[4:8], "big", signed=True))


def _record_item(session: Session, business_id, run_id, sub_id, period, outcome, code=None, message=None, invoice_id=None) -> None:
    run(session, """INSERT INTO billing_run_items (business_id, billing_run_id, subscription_id, period_start, outcome, reason_code, message, invoice_id)
                    VALUES (:b,:r,:s,:p,:o,:c,:m,:i)""", b=business_id, r=run_id, s=sub_id, p=period, o=outcome, c=code, m=message, i=invoice_id)


def _process_period(session: Session, business: dict, sub_id, as_of: dt.date, run_id) -> tuple[str, dt.date | None]:
    bid = business["id"]
    sub = raw_one(session, "SELECT * FROM subscriptions WHERE id = :i AND status = 'active' FOR UPDATE SKIP LOCKED", i=sub_id)
    if not sub:
        return "locked", None
    if sub["next_period_start"] is None or sub["next_period_start"] > as_of:
        return "done", None
    k = sub["next_period_index"]
    interval, start_date, expiry = sub["billing_interval"], sub["start_date"], sub["expiry_date"]
    pstart = period_start(interval, start_date, k)
    if pstart > expiry:
        run(session, "UPDATE subscriptions SET next_period_start = NULL WHERE id = :i", i=sub_id)
        return "done", None
    pend = period_end(interval, start_date, k, expiry)

    rows = raw_all(session, """SELECT sl.*, p.name AS product_name, p.is_active AS product_active, t.rate_percent, t.is_active AS tax_active, t.name AS tax_name
                               FROM subscription_lines sl JOIN products p ON p.id = sl.product_id LEFT JOIN tax_rules t ON t.id = sl.tax_rule_id
                               WHERE sl.subscription_id = :s ORDER BY sl.position, sl.id""", s=sub_id)
    if not rows:
        raise BillingFailure("CALCULATION_ERROR", "Subscription has no lines")
    for row in rows:
        if not row["product_active"]:
            raise BillingFailure("PRODUCT_INACTIVE", f"Product '{row['product_name']}' is inactive")
        if row["tax_rule_id"] and not row["tax_active"]:
            raise BillingFailure("TAX_RULE_INACTIVE", f"Tax rule '{row['tax_name']}' is inactive")

    rule_rows = raw_all(session, """SELECT * FROM discount_rules WHERE business_id = :b AND is_active AND starts_on <= :d AND (ends_on IS NULL OR ends_on >= :d)
                                    AND (usage_limit IS NULL OR times_used < usage_limit) ORDER BY id FOR UPDATE""", b=bid, d=as_of)
    rules = [RuleInput(r["id"], r["discount_type"], r["value"], r["scope"], r["product_id"], r["min_purchase_amount"], r["min_quantity"], r["starts_on"], r["ends_on"], r["usage_limit"], r["times_used"]) for r in rule_rows]
    inputs = [LineInput(str(r["id"]), r["product_id"], r["quantity"], r["unit_price"], r["rate_percent"] or Decimal("0")) for r in rows]
    calc = calculate(inputs, rules, as_of)

    customer = raw_one(session, "SELECT * FROM customer_profiles WHERE id = :c", c=sub["customer_id"])
    snapshot = {"name": customer["name"], "email": customer["email"], "phone": customer["phone"], "billing_address": customer["billing_address"], "tax_id": customer["tax_id"]}
    number = next_number(session, bid, "invoice", "INV")
    invoice_id = uuid.uuid4()
    inserted = scalar(session, """INSERT INTO invoices (id, business_id, number, customer_id, subscription_id, period_start, period_end, status, issue_date, due_date,
                                  subtotal, discount_total, tax_total, total, customer_snapshot, currency)
                                  VALUES (:i,:b,:n,:c,:s,:ps,:pe,'draft',:iss,:due,:st,:dt,:tt,:tot,CAST(:snap AS jsonb),:cur)
                                  ON CONFLICT (subscription_id, period_start) DO NOTHING RETURNING id""",
                      i=invoice_id, b=bid, n=number, c=sub["customer_id"], s=sub_id, ps=pstart, pe=pend, iss=as_of, due=as_of + dt.timedelta(days=sub["payment_terms_days"]),
                      st=calc.subtotal, dt=calc.discount_total, tt=calc.tax_total, tot=calc.total, snap=__import__("json").dumps(snapshot), cur=business["currency"])
    next_k = k + 1
    next_start = period_start(interval, start_date, next_k)
    next_start = None if next_start > expiry else next_start
    run(session, "UPDATE subscriptions SET next_period_index = :k, next_period_start = :s WHERE id = :i", k=next_k, s=next_start, i=sub_id)
    if inserted is None:
        _record_item(session, bid, run_id, sub_id, pstart, "skipped", "ALREADY_INVOICED", "An invoice already exists for this period")
        return "skipped", next_start

    results = {r.key: r for r in calc.lines}
    for row in rows:
        res = results[str(row["id"])]
        run(session, """INSERT INTO invoice_lines (business_id, invoice_id, product_id, variant_id, description, quantity, unit_price, gross_amount, discount_amount, taxable_amount, tax_rule_id, tax_rate, tax_amount, line_total)
                        VALUES (:b,:i,:p,:v,:d,:q,:u,:g,:da,:ta,:t,:tr,:tx,:lt)""",
            b=bid, i=invoice_id, p=row["product_id"], v=row["variant_id"], d=row["description"], q=row["quantity"], u=row["unit_price"], g=res.gross, da=res.discount, ta=res.taxable,
            t=row["tax_rule_id"], tr=res.tax_rate, tx=res.tax, lt=res.total)
    for rule_id, amount in calc.applied_rules.items():
        run(session, "INSERT INTO discount_redemptions (business_id, discount_rule_id, invoice_id, amount) VALUES (:b,:r,:i,:a)", b=bid, r=rule_id, i=invoice_id, a=amount)
        run(session, "UPDATE discount_rules SET times_used = times_used + 1 WHERE id = :r", r=rule_id)
    if business["auto_confirm_invoices"]:
        run(session, "UPDATE invoices SET status = 'confirmed', confirmed_at = now() WHERE id = :i", i=invoice_id)
    _record_item(session, bid, run_id, sub_id, pstart, "created", invoice_id=invoice_id)
    audit.record(session, "invoice.create", business_id=bid, actor_role="system", entity_type="invoice", entity_id=invoice_id, after={"number": number, "total": calc.total, "period_start": pstart})
    return "created", next_start


def _bill_subscription(engine, business: dict, sub_id, as_of, run_id, counts: dict) -> None:
    for _ in range(MAX_PERIODS_PER_RUN + 1):
        period_marker = None
        with Session(engine) as session:
            try:
                if counts["periods"].get(str(sub_id), 0) >= MAX_PERIODS_PER_RUN:
                    due = raw_one(session, "SELECT next_period_start FROM subscriptions WHERE id = :i", i=sub_id)
                    if due and due["next_period_start"] and due["next_period_start"] <= as_of:
                        _record_item(session, business["id"], run_id, sub_id, due["next_period_start"], "skipped", "CATCHUP_LIMIT", "Catch-up limit reached; resumes in the next run")
                        session.commit()
                        counts["skipped"] += 1
                    return
                period_marker = raw_one(session, "SELECT next_period_start FROM subscriptions WHERE id = :i", i=sub_id)
                period_marker = period_marker["next_period_start"] if period_marker else None
                outcome, _ = _process_period(session, business, sub_id, as_of, run_id)
                session.commit()
            except BillingFailure as failure:
                session.rollback()
                _record_failure(engine, business["id"], run_id, sub_id, period_marker, failure.code, failure.message)
                counts["failed"] += 1
                return
            except Exception as exc:
                session.rollback()
                logger.exception("billing failed", extra={"subscription_id": str(sub_id)})
                _record_failure(engine, business["id"], run_id, sub_id, period_marker, "CALCULATION_ERROR", str(exc)[:300])
                counts["failed"] += 1
                return
        if outcome == "created":
            counts["created"] += 1
            counts["periods"][str(sub_id)] = counts["periods"].get(str(sub_id), 0) + 1
        elif outcome == "skipped":
            counts["skipped"] += 1
            counts["periods"][str(sub_id)] = counts["periods"].get(str(sub_id), 0) + 1
        elif outcome == "locked":
            with Session(engine) as session:
                _record_item(session, business["id"], run_id, sub_id, as_of, "skipped", "LOCKED_BY_OTHER", "Subscription is being processed elsewhere")
                session.commit()
            counts["skipped"] += 1
            return
        else:
            return


def _record_failure(engine, business_id, run_id, sub_id, period, code, message) -> None:
    with Session(engine) as session:
        _record_item(session, business_id, run_id, sub_id, period or dt.date.today(), "failed", code, message)
        session.commit()


def run_billing(business_id: uuid.UUID, as_of: dt.date, trigger: str, triggered_by=None, subscription_id=None, bind=None) -> dict:
    engine = bind if bind is not None else get_engine()
    owns_lock_conn = not isinstance(engine, Connection)
    lock_conn = engine.connect().execution_options(isolation_level="AUTOCOMMIT") if owns_lock_conn else engine
    k1, k2 = advisory_keys(business_id)
    try:
        acquired = lock_conn.execute(text("SELECT pg_try_advisory_lock(:a, :b)"), {"a": k1, "b": k2}).scalar()
        if not acquired:
            with Session(engine) as session:
                running = raw_one(session, "SELECT id FROM billing_runs WHERE business_id = :b AND status = 'running' ORDER BY started_at DESC LIMIT 1", b=business_id)
            raise AppError("BILLING_RUN_IN_PROGRESS", "A billing run is already in progress for this business", status_code=409,
                           details=[{"field": "run_id", "message": str(running["id"]) if running else ""}])
        with Session(engine) as session:
            business = raw_one(session, "SELECT * FROM businesses WHERE id = :b", b=business_id)
            run_id = uuid.uuid4()
            if business["status"] != "active":
                run(session, "INSERT INTO billing_runs (id, business_id, trigger, as_of_date, status, finished_at, triggered_by) VALUES (:i,:b,:t,:d,'failed',now(),:u)", i=run_id, b=business_id, t=trigger, d=as_of, u=triggered_by)
                session.commit()
                return _run_row(engine, run_id)
            run(session, "INSERT INTO billing_runs (id, business_id, trigger, as_of_date, status, triggered_by) VALUES (:i,:b,:t,:d,'running',:u)", i=run_id, b=business_id, t=trigger, d=as_of, u=triggered_by)
            session.commit()
            query = "SELECT id FROM subscriptions WHERE business_id = :b AND status = 'active' AND next_period_start IS NOT NULL AND next_period_start <= :d"
            params = {"b": business_id, "d": as_of}
            if subscription_id:
                query += " AND id = :s"
                params["s"] = subscription_id
            candidates = [r["id"] for r in raw_all(session, query + " ORDER BY id", **params)]
        counts = {"created": 0, "skipped": 0, "failed": 0, "periods": {}}
        for sub_id in candidates:
            _bill_subscription(engine, business, sub_id, as_of, run_id, counts)
        with Session(engine) as session:
            status = "completed" if counts["failed"] == 0 else "completed_with_errors"
            run(session, "UPDATE billing_runs SET status = :s, finished_at = now(), created_count = :c, skipped_count = :k, failed_count = :f WHERE id = :i", s=status, c=counts["created"], k=counts["skipped"], f=counts["failed"], i=run_id)
            if triggered_by:
                run(session, "INSERT INTO notifications (business_id, user_id, channel, kind, subject, body) VALUES (:b,:u,'in_app','billing.run','Billing run finished',:m)",
                    b=business_id, u=triggered_by, m=f"Created {counts['created']}, skipped {counts['skipped']}, failed {counts['failed']} for {as_of}.")
            audit.record(session, "billing_run.finish", actor_user_id=triggered_by, actor_role="system" if trigger == "scheduled" else "business_admin", business_id=business_id, entity_type="billing_run", entity_id=run_id,
                         after={"created": counts["created"], "skipped": counts["skipped"], "failed": counts["failed"], "as_of": as_of})
            session.commit()
        return _run_row(engine, run_id)
    finally:
        try:
            lock_conn.execute(text("SELECT pg_advisory_unlock(:a, :b)"), {"a": k1, "b": k2})
        finally:
            if owns_lock_conn:
                lock_conn.close()


def _run_row(engine, run_id) -> dict:
    with Session(engine) as session:
        return ser(raw_one(session, "SELECT * FROM billing_runs WHERE id = :i", i=run_id))


def run_maintenance(business_id: uuid.UUID, today: dt.date, bind=None) -> dict:
    engine = bind if bind is not None else get_engine()
    stats = {"activated": 0, "auto_closed": 0, "quotes_expired": 0}
    with Session(engine) as session:
        for sub in raw_all(session, "SELECT id FROM subscriptions WHERE business_id = :b AND status = 'confirmed' AND start_date <= :t FOR UPDATE", b=business_id, t=today):
            run(session, "UPDATE subscriptions SET status = 'active', activated_at = now(), next_period_index = 0, next_period_start = start_date WHERE id = :i", i=sub["id"])
            audit.record(session, "subscription.activate", business_id=business_id, actor_role="system", entity_type="subscription", entity_id=sub["id"], before={"status": "confirmed"}, after={"status": "active"})
            stats["activated"] += 1
        for sub in raw_all(session, """SELECT s.id, s.status FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.business_id = :b AND s.status IN ('active','paused') AND s.expiry_date < :t AND p.auto_close_on_expiry FOR UPDATE OF s""", b=business_id, t=today):
            run(session, "UPDATE subscriptions SET status = 'closed', closed_at = now(), close_reason = 'auto', next_period_start = NULL WHERE id = :i", i=sub["id"])
            audit.record(session, "subscription.close", business_id=business_id, actor_role="system", entity_type="subscription", entity_id=sub["id"], before={"status": sub["status"]}, after={"status": "closed", "close_reason": "auto"})
            stats["auto_closed"] += 1
        for sub in raw_all(session, "SELECT id FROM subscriptions WHERE business_id = :b AND status = 'quotation' AND quotation_valid_until < :t FOR UPDATE", b=business_id, t=today):
            run(session, "UPDATE subscriptions SET status = 'closed', closed_at = now(), close_reason = 'expired_quote' WHERE id = :i", i=sub["id"])
            audit.record(session, "subscription.close", business_id=business_id, actor_role="system", entity_type="subscription", entity_id=sub["id"], before={"status": "quotation"}, after={"status": "closed", "close_reason": "expired_quote"})
            stats["quotes_expired"] += 1
        session.commit()
    return stats
