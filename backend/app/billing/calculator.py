import datetime as dt
import uuid
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


@dataclass
class LineInput:
    key: str
    product_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0")


@dataclass
class RuleInput:
    id: uuid.UUID
    discount_type: str
    value: Decimal
    scope: str
    product_id: uuid.UUID | None
    min_purchase_amount: Decimal
    min_quantity: int
    starts_on: dt.date
    ends_on: dt.date | None
    usage_limit: int | None
    times_used: int


@dataclass
class LineResult:
    key: str
    gross: Decimal
    discount: Decimal
    taxable: Decimal
    tax_rate: Decimal
    tax: Decimal
    total: Decimal


@dataclass
class Calculation:
    lines: list[LineResult]
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    applied_rules: dict[uuid.UUID, Decimal] = field(default_factory=dict)


def _eligible(rule: RuleInput, on: dt.date) -> bool:
    if rule.starts_on > on or (rule.ends_on is not None and rule.ends_on < on):
        return False
    return rule.usage_limit is None or rule.times_used < rule.usage_limit


def _benefit(rule: RuleInput, base: Decimal) -> Decimal:
    if rule.discount_type == "percentage":
        return money(base * rule.value / 100)
    return min(rule.value, base)


def calculate(lines: list[LineInput], rules: list[RuleInput], on: dt.date) -> Calculation:
    gross = {ln.key: money(ln.unit_price * ln.quantity) for ln in lines}
    active = sorted((r for r in rules if _eligible(r, on)), key=lambda r: str(r.id))
    discounts = {ln.key: Decimal("0.00") for ln in lines}
    applied: dict[uuid.UUID, Decimal] = {}

    for ln in lines:
        best: tuple[Decimal, RuleInput] | None = None
        for rule in active:
            if rule.scope != "product" or rule.product_id != ln.product_id:
                continue
            if gross[ln.key] < rule.min_purchase_amount or ln.quantity < rule.min_quantity:
                continue
            benefit = _benefit(rule, gross[ln.key])
            if benefit > 0 and (best is None or benefit > best[0]):
                best = (benefit, rule)
        if best:
            discounts[ln.key] = best[0]
            applied[best[1].id] = applied.get(best[1].id, Decimal("0.00")) + best[0]

    subtotal = sum(gross.values(), Decimal("0.00"))
    total_qty = sum(ln.quantity for ln in lines)
    after_product = {k: gross[k] - discounts[k] for k in gross}
    base = sum(after_product.values(), Decimal("0.00"))
    best_sub: tuple[Decimal, RuleInput] | None = None
    for rule in active:
        if rule.scope != "subscription":
            continue
        if subtotal < rule.min_purchase_amount or total_qty < rule.min_quantity:
            continue
        benefit = _benefit(rule, base)
        if benefit > 0 and (best_sub is None or benefit > best_sub[0]):
            best_sub = (benefit, rule)
    if best_sub and base > 0:
        benefit, rule = best_sub
        shares = {k: money(benefit * after_product[k] / base) for k in after_product}
        remainder = benefit - sum(shares.values(), Decimal("0.00"))
        if remainder != 0:
            largest = max(after_product, key=lambda k: after_product[k])
            shares[largest] += remainder
        for k, share in shares.items():
            discounts[k] += share
        applied[rule.id] = applied.get(rule.id, Decimal("0.00")) + benefit

    results = []
    for ln in lines:
        taxable = max(gross[ln.key] - discounts[ln.key], Decimal("0.00"))
        tax = money(taxable * ln.tax_rate / 100)
        results.append(LineResult(ln.key, gross[ln.key], discounts[ln.key], taxable, ln.tax_rate, tax, taxable + tax))
    discount_total = sum((r.discount for r in results), Decimal("0.00"))
    tax_total = sum((r.tax for r in results), Decimal("0.00"))
    return Calculation(results, subtotal, discount_total, tax_total, subtotal - discount_total + tax_total, applied)
