import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.audit import service as audit
from app.core.db import get_db
from app.core.errors import AppError
from app.core.pagination import PageParams, envelope, page_params
from app.core.sql import all_, guard, invalid, not_found, one, raw_one, run, scalar
from app.invoicing.service import invoice_detail
from app.tenancy.context import TenantContext, require

router = APIRouter(tags=["payments"])


class PaymentIn(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    method: Literal["cash", "bank_transfer", "card", "upi", "cheque", "other"]
    amount: Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
    paid_on: dt.date
    reference: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)


class VoidBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str | None = Field(default=None, max_length=500)


PAYMENT_SELECT = """SELECT p.id, p.invoice_id, i.number AS invoice_number, c.name AS customer_name, c.id AS customer_id, p.method, p.amount, p.paid_on, p.reference, p.notes, p.status, p.voided_at, p.void_reason, p.created_at
                    FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN customer_profiles c ON c.id = i.customer_id"""


def _log(db: Session, ctx: TenantContext, action: str, payment_id, after=None) -> None:
    audit.record(db, action, actor_user_id=ctx.user.id, actor_role=ctx.role, business_id=ctx.business_id, entity_type="payment", entity_id=payment_id, after=after)


@router.post("/invoices/{invoice_id}/payments", status_code=201)
def record_payment(invoice_id: uuid.UUID, body: PaymentIn, idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=200),
                   ctx: TenantContext = Depends(require("payments.create")), db: Session = Depends(get_db)):
    if idempotency_key:
        existing = one(db, PAYMENT_SELECT + " WHERE p.business_id = :b AND p.idempotency_key = :k", b=ctx.business_id, k=idempotency_key)
        if existing:
            same = (
                existing["invoice_id"] == str(invoice_id)
                and existing["method"] == body.method
                and Decimal(existing["amount"]) == body.amount
                and existing["paid_on"] == body.paid_on.isoformat()
                and (existing["reference"] or None) == (body.reference or None)
                and (existing["notes"] or None) == (body.notes or None)
            )
            if not same:
                raise AppError("IDEMPOTENCY_CONFLICT", "This Idempotency-Key was already used with a different request", status_code=409)
            return {"data": {**existing, "invoice": invoice_detail(db, ctx.business_id, invoice_id)}}
    pid = uuid.uuid4()
    with guard(db):
        inv = raw_one(db, "SELECT * FROM invoices WHERE id = :i AND business_id = :b FOR UPDATE", i=invoice_id, b=ctx.business_id)
        if not inv:
            raise not_found("Invoice")
        if inv["status"] != "confirmed":
            raise AppError("INVOICE_NOT_PAYABLE", "Only confirmed invoices with a balance can receive payments", status_code=409)
        balance = inv["total"] - inv["amount_paid"]
        if body.amount > balance:
            raise AppError("PAYMENT_EXCEEDS_BALANCE", f"The amount exceeds the outstanding balance of {balance}", status_code=422,
                           details=[{"field": "amount", "message": f"Must not exceed {balance}"}])
        run(db, """INSERT INTO payments (id, business_id, invoice_id, method, amount, paid_on, reference, notes, recorded_by, idempotency_key)
                   VALUES (:i,:b,:inv,:m,:a,:d,:r,:n,:u,:k)""", i=pid, b=ctx.business_id, inv=invoice_id, m=body.method, a=body.amount, d=body.paid_on, r=body.reference, n=body.notes, u=ctx.user.id, k=idempotency_key)
        new_paid = inv["amount_paid"] + body.amount
        run(db, "UPDATE invoices SET amount_paid = :p, status = CASE WHEN :p >= total THEN 'paid' ELSE status END, paid_at = CASE WHEN :p >= total THEN now() ELSE paid_at END WHERE id = :i", p=new_paid, i=invoice_id)
        _log(db, ctx, "payment.create", pid, after={"invoice_id": invoice_id, "amount": body.amount, "method": body.method})
    return {"data": {**one(db, PAYMENT_SELECT + " WHERE p.id = :i", i=pid), "invoice": invoice_detail(db, ctx.business_id, invoice_id)}}


@router.get("/payments")
def list_payments(from_: dt.date | None = Query(None, alias="from"), to: dt.date | None = None, method: str | None = None, customer_id: uuid.UUID | None = None, invoice_id: uuid.UUID | None = None,
                  status: Literal["recorded", "voided"] | None = None, params: PageParams = Depends(page_params), ctx: TenantContext = Depends(require("payments.view")), db: Session = Depends(get_db)):
    where, p = " WHERE p.business_id = :b", {"b": ctx.business_id}
    if from_:
        where += " AND p.paid_on >= :f"; p["f"] = from_
    if to:
        where += " AND p.paid_on <= :t"; p["t"] = to
    if method:
        where += " AND p.method = :m"; p["m"] = method
    if customer_id:
        where += " AND i.customer_id = :c"; p["c"] = customer_id
    if invoice_id:
        where += " AND p.invoice_id = :iv"; p["iv"] = invoice_id
    if status:
        where += " AND p.status = :s"; p["s"] = status
    total = scalar(db, f"SELECT count(*) FROM payments p JOIN invoices i ON i.id = p.invoice_id{where}", **p)
    rows = all_(db, f"{PAYMENT_SELECT}{where} ORDER BY p.paid_on DESC, p.created_at DESC LIMIT :_l OFFSET :_o", _l=params.page_size, _o=params.offset, **p)
    return envelope(rows, int(total or 0), params)


@router.get("/payments/{payment_id}")
def get_payment(payment_id: uuid.UUID, ctx: TenantContext = Depends(require("payments.view")), db: Session = Depends(get_db)):
    row = one(db, PAYMENT_SELECT + " WHERE p.id = :i AND p.business_id = :b", i=payment_id, b=ctx.business_id)
    if not row:
        raise not_found("Payment")
    return {"data": row}


@router.post("/payments/{payment_id}/void")
def void_payment(payment_id: uuid.UUID, body: VoidBody | None = None, ctx: TenantContext = Depends(require("payments.manage")), db: Session = Depends(get_db)):
    with guard(db):
        pay = raw_one(db, "SELECT * FROM payments WHERE id = :i AND business_id = :b FOR UPDATE", i=payment_id, b=ctx.business_id)
        if not pay:
            raise not_found("Payment")
        if pay["status"] != "recorded":
            raise AppError("INVALID_STATE_TRANSITION", "This payment is already voided", status_code=409)
        inv = raw_one(db, "SELECT * FROM invoices WHERE id = :i FOR UPDATE", i=pay["invoice_id"])
        run(db, "UPDATE payments SET status = 'voided', voided_at = now(), void_reason = :r WHERE id = :i", r=body.reason if body else None, i=payment_id)
        run(db, "UPDATE invoices SET amount_paid = amount_paid - :a, status = CASE WHEN status = 'paid' THEN 'confirmed' ELSE status END, paid_at = NULL WHERE id = :i", a=pay["amount"], i=inv["id"])
        _log(db, ctx, "payment.void", payment_id, after={"reason": body.reason if body else None})
    return {"data": {**one(db, PAYMENT_SELECT + " WHERE p.id = :i", i=payment_id), "invoice": invoice_detail(db, ctx.business_id, pay["invoice_id"])}}
