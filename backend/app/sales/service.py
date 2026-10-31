import datetime as dt
import uuid
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.audit import service as audit
from app.billing.calculator import money
from app.billing.schedule import period_start
from app.core.errors import AppError
from app.core.sql import all_, invalid, next_number, not_found, one, raw_all, raw_one, run, scalar
from app.sales.schemas import LineIn


def local_today(timezone: str) -> dt.date:
    return dt.datetime.now(ZoneInfo(timezone)).date()


def business_today(db: Session, business_id) -> dt.date:
    return local_today(scalar(db, "SELECT timezone FROM businesses WHERE id = :b", b=business_id))


def resolve_lines(db: Session, business_id, plan: dict | None, lines: list[LineIn]) -> list[dict[str, Any]]:
    resolved = []
    for index, line in enumerate(lines):
        field = f"lines[{index}]"
        product = raw_one(db, "SELECT * FROM products WHERE id = :p AND business_id = :b", p=line.product_id, b=business_id)
        if not product or not product["is_active"]:
            raise invalid(f"{field}.product_id", "Product not found or inactive")
        variant = None
        if line.variant_id:
            variant = raw_one(db, "SELECT * FROM product_variants WHERE id = :v AND product_id = :p AND business_id = :b", v=line.variant_id, p=line.product_id, b=business_id)
            if not variant or not variant["is_active"]:
                raise invalid(f"{field}.variant_id", "Variant does not belong to this product or is inactive")
        extra = variant["extra_price"] if variant else Decimal("0.00")
        is_plan_product = plan is not None and plan["product_id"] == product["id"]
        if is_plan_product and line.quantity < plan["min_quantity"]:
            raise invalid(f"{field}.quantity", f"Minimum quantity for this plan is {plan['min_quantity']}")
        base = plan["price"] if is_plan_product else product["sales_price"]
        unit = line.unit_price if line.unit_price is not None else base + extra
        tax_id = line.tax_rule_id or product["default_tax_rule_id"]
        if tax_id and not raw_one(db, "SELECT 1 AS x FROM tax_rules WHERE id = :t AND business_id = :b AND is_active", t=tax_id, b=business_id):
            raise invalid(f"{field}.tax_rule_id", "Tax rule not found or inactive")
        description = product["name"] + (f" – {variant['attribute']}: {variant['value']}" if variant else "")
        resolved.append({"product_id": product["id"], "variant_id": line.variant_id, "quantity": line.quantity, "unit_price": unit, "tax_rule_id": tax_id, "description": description})
    return resolved


def write_lines(db: Session, business_id, sub_id, lines: list[dict]) -> None:
    run(db, "DELETE FROM subscription_lines WHERE subscription_id = :s AND business_id = :b", s=sub_id, b=business_id)
    for position, ln in enumerate(lines):
        run(db, """INSERT INTO subscription_lines (business_id, subscription_id, product_id, variant_id, description, quantity, unit_price, tax_rule_id, position)
                   VALUES (:b,:s,:p,:v,:d,:q,:u,:t,:pos)""", b=business_id, s=sub_id, p=ln["product_id"], v=ln["variant_id"], d=ln["description"], q=ln["quantity"], u=ln["unit_price"], t=ln["tax_rule_id"], pos=position)


def _lines_with_amounts(db: Session, sub_id) -> tuple[list[dict], dict]:
    rows = raw_all(db, """SELECT sl.id, sl.product_id, sl.variant_id, sl.description, sl.quantity, sl.unit_price, sl.tax_rule_id, COALESCE(t.rate_percent, 0) AS tax_rate
                          FROM subscription_lines sl LEFT JOIN tax_rules t ON t.id = sl.tax_rule_id WHERE sl.subscription_id = :s ORDER BY sl.position, sl.id""", s=sub_id)
    subtotal = tax_total = Decimal("0.00")
    for row in rows:
        amount = money(row["unit_price"] * row["quantity"])
        tax = money(amount * row["tax_rate"] / 100)
        row["amount"], row["tax_amount"] = amount, tax
        subtotal += amount
        tax_total += tax
    return rows, {"subtotal": subtotal, "tax_total": tax_total, "total": subtotal + tax_total}


def allowed_actions(sub: dict, plan: dict, has_lines: bool, today: dt.date) -> list[str]:
    status = sub["status"]
    actions: list[str] = []
    if status == "draft":
        if has_lines:
            actions.append("send-quotation")
        actions.append("close")
    elif status == "quotation":
        actions += ["confirm", "close"]
    elif status == "confirmed" and sub["start_date"] <= today:
        actions.append("activate")
    elif status == "active":
        if plan["allow_pause"]:
            actions.append("pause")
        if plan["allow_early_close"]:
            actions.append("close")
        if plan["allow_renewal"]:
            actions.append("renew")
    elif status == "paused":
        actions.append("resume")
        if plan["allow_early_close"]:
            actions.append("close")
    return actions


def get_subscription(db: Session, business_id, sub_id, customer_id=None) -> dict:
    sub = raw_one(db, "SELECT s.*, c.name AS customer_name, c.email AS customer_email FROM subscriptions s JOIN customer_profiles c ON c.id = s.customer_id WHERE s.id = :i AND s.business_id = :b" + (" AND s.customer_id = :c" if customer_id else ""),
                  i=sub_id, b=business_id, c=customer_id)
    if not sub:
        raise not_found("Subscription")
    plan = raw_one(db, "SELECT * FROM plans WHERE id = :p", p=sub["plan_id"])
    lines, totals = _lines_with_amounts(db, sub_id)
    today = business_today(db, business_id)
    out = {k: sub[k] for k in ("id", "number", "status", "billing_interval", "quotation_valid_until", "start_date", "expiry_date", "payment_terms_days", "next_period_start", "close_reason", "notes", "confirmed_at", "activated_at", "closed_at", "created_at")}
    out["customer"] = {"id": sub["customer_id"], "name": sub["customer_name"], "email": sub["customer_email"]}
    out["plan"] = {"id": plan["id"], "name": plan["name"], "billing_interval": plan["billing_interval"], "allow_pause": plan["allow_pause"], "allow_early_close": plan["allow_early_close"], "allow_renewal": plan["allow_renewal"], "auto_close_on_expiry": plan["auto_close_on_expiry"]}
    out["template_id"] = sub["template_id"]
    out["lines"] = [{"id": l["id"], "product_id": l["product_id"], "variant_id": l["variant_id"], "description": l["description"], "quantity": l["quantity"], "unit_price": l["unit_price"], "tax_rule_id": l["tax_rule_id"], "tax_rate": l["tax_rate"], "amount": l["amount"], "tax_amount": l["tax_amount"]} for l in lines]
    out["totals"] = totals
    out["allowed_actions"] = allowed_actions(sub, plan, bool(lines), today)
    return one_ser(out)


def one_ser(value):
    from app.core.sql import ser
    return ser(value)


def create_subscription(db: Session, actor: dict, body) -> uuid.UUID:
    bid = actor["business_id"]
    template = None
    if body.template_id:
        template = raw_one(db, "SELECT * FROM quotation_templates WHERE id = :t AND business_id = :b AND is_active", t=body.template_id, b=bid)
        if not template:
            raise invalid("template_id", "Template not found or inactive")
    plan_id = body.plan_id or (template["plan_id"] if template else None)
    if plan_id is None:
        raise invalid("plan_id", "A plan or a template is required")
    plan = raw_one(db, "SELECT * FROM plans WHERE id = :p AND business_id = :b", p=plan_id, b=bid)
    if not plan or not plan["is_active"]:
        raise invalid("plan_id", "Plan not found or inactive")
    if body.expiry_date <= body.start_date:
        raise invalid("expiry_date", "Must be after the start date")
    if plan["available_from"] > body.start_date or (plan["available_to"] and plan["available_to"] < body.start_date):
        raise invalid("plan_id", "Plan is not available on the start date")
    customer = raw_one(db, "SELECT is_active FROM customer_profiles WHERE id = :c AND business_id = :b", c=body.customer_id, b=bid)
    if not customer or not customer["is_active"]:
        raise invalid("customer_id", "Customer not found or inactive")
    if body.lines is not None:
        line_inputs = body.lines
    elif template:
        line_inputs = [LineIn(product_id=r["product_id"], variant_id=r["variant_id"], quantity=r["quantity"]) for r in raw_all(db, "SELECT * FROM quotation_template_lines WHERE template_id = :t ORDER BY position", t=template["id"])]
    else:
        line_inputs = []
    lines = resolve_lines(db, bid, plan, line_inputs)
    terms = body.payment_terms_days if body.payment_terms_days is not None else (template["payment_terms_days"] if template else scalar(db, "SELECT default_payment_terms_days FROM businesses WHERE id = :b", b=bid))
    sub_id = uuid.uuid4()
    number = next_number(db, bid, "subscription", "SUB")
    run(db, """INSERT INTO subscriptions (id, business_id, number, customer_id, plan_id, template_id, status, billing_interval, start_date, expiry_date, payment_terms_days, notes, created_by)
               VALUES (:i,:b,:n,:c,:p,:t,'draft',:bi,:sd,:ed,:pt,:no,:cb)""",
        i=sub_id, b=bid, n=number, c=body.customer_id, p=plan["id"], t=body.template_id, bi=plan["billing_interval"], sd=body.start_date, ed=body.expiry_date, pt=terms, no=body.notes, cb=actor.get("user_id"))
    write_lines(db, bid, sub_id, lines)
    log(db, actor, "subscription.create", sub_id, after={"number": number, "status": "draft"})
    return sub_id


def log(db: Session, actor: dict, action: str, sub_id, before=None, after=None) -> None:
    audit.record(db, action, actor_user_id=actor.get("user_id"), actor_role=actor.get("role"), business_id=actor["business_id"], entity_type="subscription", entity_id=sub_id, before=before, after=after)


def _lock(db: Session, bid, sub_id, customer_id=None) -> tuple[dict, dict]:
    sub = raw_one(db, "SELECT * FROM subscriptions WHERE id = :i AND business_id = :b" + (" AND customer_id = :c" if customer_id else "") + " FOR UPDATE", i=sub_id, b=bid, c=customer_id)
    if not sub:
        raise not_found("Subscription")
    plan = raw_one(db, "SELECT * FROM plans WHERE id = :p", p=sub["plan_id"])
    return sub, plan


def _bad(message: str) -> AppError:
    return AppError("INVALID_STATE_TRANSITION", message, status_code=409)


def _not_allowed(message: str) -> AppError:
    return AppError("ACTION_NOT_ALLOWED_BY_PLAN", message, status_code=409)


def transition(db: Session, actor: dict, sub_id, action: str, payload: dict | None = None, customer_id=None) -> None:
    bid = actor["business_id"]
    sub, plan = _lock(db, bid, sub_id, customer_id)
    today = business_today(db, bid)
    status = sub["status"]
    payload = payload or {}

    def set_status(new: str, **extra: Any) -> None:
        sets = ", ".join(["status = :st"] + [f"{k} = :{k}" for k in extra])
        run(db, f"UPDATE subscriptions SET {sets} WHERE id = :i", st=new, i=sub_id, **extra)
        log(db, actor, f"subscription.{action}", sub_id, before={"status": status}, after={"status": new, **{k: v for k, v in extra.items() if k != 'i'}})

    now = dt.datetime.now(dt.timezone.utc)
    if action == "send-quotation":
        if status != "draft":
            raise _bad("Only a draft can be sent as a quotation")
        if not scalar(db, "SELECT count(*) FROM subscription_lines WHERE subscription_id = :s", s=sub_id):
            raise _bad("Add at least one line before sending the quotation")
        validity = scalar(db, "SELECT validity_days FROM quotation_templates WHERE id = :t", t=sub["template_id"]) if sub["template_id"] else 30
        set_status("quotation", quotation_valid_until=today + dt.timedelta(days=validity))
    elif action == "confirm":
        if status != "quotation":
            raise _bad("Only a quotation can be confirmed")
        if sub["quotation_valid_until"] and today > sub["quotation_valid_until"]:
            raise _bad("The quotation has expired")
        set_status("confirmed", confirmed_at=now)
    elif action == "activate":
        if status != "confirmed":
            raise _bad("Only a confirmed subscription can be activated")
        if sub["start_date"] > today:
            raise _bad("The start date has not been reached")
        run(db, "UPDATE subscriptions SET next_period_index = 0, next_period_start = start_date WHERE id = :i", i=sub_id)
        set_status("active", activated_at=now)
    elif action == "pause":
        if status != "active":
            raise _bad("Only an active subscription can be paused")
        if not plan["allow_pause"]:
            raise _not_allowed("This plan does not allow pausing")
        run(db, "INSERT INTO subscription_pauses (business_id, subscription_id, paused_on) VALUES (:b,:s,:d)", b=bid, s=sub_id, d=today)
        set_status("paused")
    elif action == "resume":
        if status != "paused":
            raise _bad("Only a paused subscription can be resumed")
        pause = raw_one(db, "SELECT * FROM subscription_pauses WHERE subscription_id = :s AND resumed_on IS NULL", s=sub_id)
        run(db, "UPDATE subscription_pauses SET resumed_on = :d WHERE subscription_id = :s AND resumed_on IS NULL", d=today, s=sub_id)
        _skip_paused_periods(db, bid, sub, pause["paused_on"] if pause else today, today, actor)
        set_status("active")
    elif action == "close":
        if status in ("draft", "quotation"):
            set_status("closed", closed_at=now, close_reason="rejected")
        elif status in ("active", "paused"):
            if not plan["allow_early_close"]:
                raise _not_allowed("This plan does not allow early closure")
            set_status("closed", closed_at=now, close_reason="early", next_period_start=None)
        else:
            raise _bad("This subscription cannot be closed from its current state")
    elif action == "renew":
        if status != "active":
            raise _bad("Only an active subscription can be renewed")
        if not plan["allow_renewal"]:
            raise _not_allowed("This plan does not allow renewal")
        expiry = payload["expiry_date"]
        if expiry <= sub["expiry_date"]:
            raise _bad("The new expiry date must be after the current one")
        extra: dict[str, Any] = {"expiry_date": expiry}
        if sub["next_period_start"] is None:
            candidate = period_start(sub["billing_interval"], sub["start_date"], sub["next_period_index"])
            if candidate <= expiry:
                extra["next_period_start"] = candidate
        set_status("active", **extra)
    else:
        raise not_found("Action")


def _skip_paused_periods(db: Session, bid, sub: dict, paused_on: dt.date, resume_on: dt.date, actor: dict) -> None:
    k = sub["next_period_index"]
    start = sub["next_period_start"]
    skipped: list[tuple[int, dt.date]] = []
    while start is not None and start < resume_on and start >= paused_on:
        skipped.append((k, start))
        k += 1
        start = period_start(sub["billing_interval"], sub["start_date"], k)
        if start > sub["expiry_date"]:
            start = None
    if not skipped:
        return
    run(db, "UPDATE subscriptions SET next_period_index = :k, next_period_start = :s WHERE id = :i", k=k, s=start, i=sub["id"])
    run_id = uuid.uuid4()
    run(db, "INSERT INTO billing_runs (id, business_id, trigger, as_of_date, status, finished_at, skipped_count, triggered_by) VALUES (:i,:b,'manual',:d,'completed',now(),:n,:u)",
        i=run_id, b=bid, d=resume_on, n=len(skipped), u=actor.get("user_id"))
    for _, ps in skipped:
        run(db, "INSERT INTO billing_run_items (business_id, billing_run_id, subscription_id, period_start, outcome, reason_code, message) VALUES (:b,:r,:s,:p,'skipped','SUBSCRIPTION_PAUSED','Period started while the subscription was paused')",
            b=bid, r=run_id, s=sub["id"], p=ps)


def update_subscription(db: Session, actor: dict, sub_id, body) -> None:
    bid = actor["business_id"]
    sub, plan = _lock(db, bid, sub_id)
    if sub["status"] not in ("draft", "quotation"):
        raise _bad("Only drafts and quotations can be edited")
    fields = body.model_dump(exclude_unset=True, exclude={"lines"})
    start = fields.get("start_date", sub["start_date"])
    expiry = fields.get("expiry_date", sub["expiry_date"])
    if expiry <= start:
        raise invalid("expiry_date", "Must be after the start date")
    if "start_date" in fields and (plan["available_from"] > start or (plan["available_to"] and plan["available_to"] < start)):
        raise invalid("start_date", "Plan is not available on this start date")
    if fields:
        sets = ", ".join(f"{k} = :{k}" for k in fields)
        run(db, f"UPDATE subscriptions SET {sets} WHERE id = :_i", _i=sub_id, **fields)
    if body.lines is not None:
        write_lines(db, bid, sub_id, resolve_lines(db, bid, plan, body.lines))
    log(db, actor, "subscription.update", sub_id, after=body.model_dump(mode="json", exclude_unset=True))
