import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import service as audit
from app.auth.service import issue_customer_invitation
from app.catalog import schemas as s
from app.core.db import get_db
from app.core.errors import AppError
from app.core.pagination import PageParams, envelope, order_by, page_params
from app.core.sql import all_, guard, invalid, not_found, one, patch_sql, run, scalar
from app.models import Business, CustomerProfile, User
from app.tenancy.context import TenantContext, require, require_admin

router = APIRouter(tags=["catalog"])


def _paged(db: Session, base: str, count: str, params: PageParams, order: str, **p: Any) -> dict:
    total = scalar(db, count, **p)
    rows = all_(db, f"{base} ORDER BY {order} LIMIT :_limit OFFSET :_offset", _limit=params.page_size, _offset=params.offset, **p)
    return envelope(rows, int(total or 0), params)


def _order(sort: str | None, allowed: dict[str, str], default: str) -> str:
    value = sort or default
    key = value.lstrip("-")
    if key not in allowed:
        raise invalid("sort", f"Must be one of: {', '.join(sorted(allowed))}")
    return f"{allowed[key]} {'DESC' if value.startswith('-') else 'ASC'}, id"


def _audit(db: Session, ctx: TenantContext, action: str, entity: str, entity_id, after=None, before=None) -> None:
    audit.record(db, action, actor_user_id=ctx.user.id, actor_role=ctx.role, business_id=ctx.business_id,
                 entity_type=entity, entity_id=entity_id, before=before, after=after)


PRODUCT_SQL = """SELECT p.*, (SELECT count(*) FROM product_variants v WHERE v.product_id = p.id) AS variants_count FROM products p WHERE p.business_id = :b"""


def _variants(db: Session, ctx: TenantContext, product_id) -> list[dict]:
    return all_(db, "SELECT id, product_id, attribute, value, extra_price, is_active FROM product_variants WHERE business_id = :b AND product_id = :p ORDER BY attribute, value", b=ctx.business_id, p=product_id)


def _product(db: Session, ctx: TenantContext, product_id) -> dict:
    row = one(db, PRODUCT_SQL + " AND p.id = :id", b=ctx.business_id, id=product_id)
    if not row:
        raise not_found("Product")
    row["variants"] = _variants(db, ctx, product_id)
    return row


@router.get("/products")
def list_products(q: str | None = Query(None, max_length=100), is_active: bool | None = None, sort: str | None = None,
                  params: PageParams = Depends(page_params), ctx: TenantContext = Depends(require("products.view")), db: Session = Depends(get_db)):
    where, p = "", {"b": ctx.business_id}
    if q:
        where += " AND p.name ILIKE :q"; p["q"] = f"%{q}%"
    if is_active is not None:
        where += " AND p.is_active = :a"; p["a"] = is_active
    order = _order(sort, {"name": "p.name", "created_at": "p.created_at", "sales_price": "p.sales_price"}, "name")
    out = _paged(db, PRODUCT_SQL + where, f"SELECT count(*) FROM products p WHERE p.business_id = :b{where}", params, order, **p)
    return out


@router.post("/products", status_code=201)
def create_product(body: s.ProductIn, ctx: TenantContext = Depends(require("products.create")), db: Session = Depends(get_db)):
    pid = uuid.uuid4()
    with guard(db):
        run(db, "INSERT INTO products (id, business_id, name, product_type, sales_price, cost_price, notes, default_tax_rule_id) VALUES (:id,:b,:n,:t,:sp,:cp,:no,:tx)",
            id=pid, b=ctx.business_id, n=body.name, t=body.product_type, sp=body.sales_price, cp=body.cost_price, no=body.notes, tx=body.default_tax_rule_id)
        for v in body.variants:
            run(db, "INSERT INTO product_variants (business_id, product_id, attribute, value, extra_price) VALUES (:b,:p,:a,:v,:e)", b=ctx.business_id, p=pid, a=v.attribute, v=v.value, e=v.extra_price)
        _audit(db, ctx, "product.create", "product", pid, after={"name": body.name})
    return {"data": _product(db, ctx, pid)}


@router.get("/products/{product_id}")
def get_product(product_id: uuid.UUID, ctx: TenantContext = Depends(require("products.view")), db: Session = Depends(get_db)):
    return {"data": _product(db, ctx, product_id)}


@router.patch("/products/{product_id}")
def patch_product(product_id: uuid.UUID, body: s.ProductPatch, ctx: TenantContext = Depends(require("products.update")), db: Session = Depends(get_db)):
    fields = body.model_dump(exclude_unset=True)
    _product(db, ctx, product_id)
    if fields:
        with guard(db):
            sql, p = patch_sql("products", fields, "id = :_id AND business_id = :_b")
            run(db, sql, **p, _id=product_id, _b=ctx.business_id)
            _audit(db, ctx, "product.update", "product", product_id, after=fields)
    return {"data": _product(db, ctx, product_id)}


@router.post("/products/{product_id}/deactivate")
def deactivate_product(product_id: uuid.UUID, ctx: TenantContext = Depends(require("products.update")), db: Session = Depends(get_db)):
    _product(db, ctx, product_id)
    with guard(db):
        run(db, "UPDATE products SET is_active = false WHERE id = :i AND business_id = :b", i=product_id, b=ctx.business_id)
        _audit(db, ctx, "product.deactivate", "product", product_id)
    return {"data": _product(db, ctx, product_id)}


@router.get("/products/{product_id}/variants")
def list_variants(product_id: uuid.UUID, ctx: TenantContext = Depends(require("products.view")), db: Session = Depends(get_db)):
    _product(db, ctx, product_id)
    return {"data": _variants(db, ctx, product_id)}


@router.post("/products/{product_id}/variants", status_code=201)
def create_variant(product_id: uuid.UUID, body: s.VariantIn, ctx: TenantContext = Depends(require("products.create")), db: Session = Depends(get_db)):
    _product(db, ctx, product_id)
    vid = uuid.uuid4()
    with guard(db):
        run(db, "INSERT INTO product_variants (id, business_id, product_id, attribute, value, extra_price) VALUES (:id,:b,:p,:a,:v,:e)", id=vid, b=ctx.business_id, p=product_id, a=body.attribute, v=body.value, e=body.extra_price)
        _audit(db, ctx, "variant.create", "product_variant", vid, after=body.model_dump(mode="json"))
    return {"data": one(db, "SELECT id, product_id, attribute, value, extra_price, is_active FROM product_variants WHERE id = :i", i=vid)}


@router.patch("/variants/{variant_id}")
def patch_variant(variant_id: uuid.UUID, body: s.VariantPatch, ctx: TenantContext = Depends(require("products.update")), db: Session = Depends(get_db)):
    if not one(db, "SELECT id FROM product_variants WHERE id = :i AND business_id = :b", i=variant_id, b=ctx.business_id):
        raise not_found("Variant")
    fields = body.model_dump(exclude_unset=True)
    if fields:
        with guard(db):
            sql, p = patch_sql("product_variants", fields, "id = :_id AND business_id = :_b")
            run(db, sql, **p, _id=variant_id, _b=ctx.business_id)
            _audit(db, ctx, "variant.update", "product_variant", variant_id, after=body.model_dump(mode="json", exclude_unset=True))
    return {"data": one(db, "SELECT id, product_id, attribute, value, extra_price, is_active FROM product_variants WHERE id = :i", i=variant_id)}


PLAN_SQL = "SELECT pl.*, p.name AS product_name FROM plans pl JOIN products p ON p.id = pl.product_id WHERE pl.business_id = :b"


def _plan(db: Session, ctx: TenantContext, plan_id) -> dict:
    row = one(db, PLAN_SQL + " AND pl.id = :id", b=ctx.business_id, id=plan_id)
    if not row:
        raise not_found("Plan")
    return row


@router.get("/plans")
def list_plans(q: str | None = None, is_active: bool | None = None, sort: str | None = None, params: PageParams = Depends(page_params),
               ctx: TenantContext = Depends(require("plans.view")), db: Session = Depends(get_db)):
    where, p = "", {"b": ctx.business_id}
    if q:
        where += " AND pl.name ILIKE :q"; p["q"] = f"%{q}%"
    if is_active is not None:
        where += " AND pl.is_active = :a"; p["a"] = is_active
    order = _order(sort, {"name": "pl.name", "created_at": "pl.created_at", "price": "pl.price"}, "name")
    return _paged(db, PLAN_SQL + where, f"SELECT count(*) FROM plans pl WHERE pl.business_id = :b{where}", params, order, **p)


@router.post("/plans", status_code=201)
def create_plan(body: s.PlanIn, ctx: TenantContext = Depends(require("plans.create")), db: Session = Depends(get_db)):
    if body.available_to and body.available_to < body.available_from:
        raise invalid("available_to", "Must not be before available_from")
    pid = uuid.uuid4()
    with guard(db):
        run(db, """INSERT INTO plans (id, business_id, name, product_id, price, billing_interval, min_quantity, available_from, available_to,
                   auto_close_on_expiry, allow_early_close, allow_pause, allow_renewal)
                   VALUES (:id,:b,:n,:p,:pr,:i,:mq,:af,:at,:ac,:ae,:ap,:ar)""",
            id=pid, b=ctx.business_id, n=body.name, p=body.product_id, pr=body.price, i=body.billing_interval, mq=body.min_quantity,
            af=body.available_from, at=body.available_to, ac=body.auto_close_on_expiry, ae=body.allow_early_close, ap=body.allow_pause, ar=body.allow_renewal)
        _audit(db, ctx, "plan.create", "plan", pid, after={"name": body.name})
    return {"data": _plan(db, ctx, pid)}


@router.get("/plans/{plan_id}")
def get_plan(plan_id: uuid.UUID, ctx: TenantContext = Depends(require("plans.view")), db: Session = Depends(get_db)):
    return {"data": _plan(db, ctx, plan_id)}


@router.patch("/plans/{plan_id}")
def patch_plan(plan_id: uuid.UUID, body: s.PlanPatch, ctx: TenantContext = Depends(require("plans.update")), db: Session = Depends(get_db)):
    _plan(db, ctx, plan_id)
    fields = body.model_dump(exclude_unset=True)
    if fields:
        with guard(db):
            sql, p = patch_sql("plans", fields, "id = :_id AND business_id = :_b")
            run(db, sql, **p, _id=plan_id, _b=ctx.business_id)
            _audit(db, ctx, "plan.update", "plan", plan_id, after=body.model_dump(mode="json", exclude_unset=True))
    return {"data": _plan(db, ctx, plan_id)}


@router.post("/plans/{plan_id}/deactivate")
def deactivate_plan(plan_id: uuid.UUID, ctx: TenantContext = Depends(require("plans.update")), db: Session = Depends(get_db)):
    _plan(db, ctx, plan_id)
    with guard(db):
        run(db, "UPDATE plans SET is_active = false WHERE id = :i AND business_id = :b", i=plan_id, b=ctx.business_id)
        _audit(db, ctx, "plan.deactivate", "plan", plan_id)
    return {"data": _plan(db, ctx, plan_id)}


def _tax(db: Session, ctx: TenantContext, tax_id) -> dict:
    row = one(db, "SELECT * FROM tax_rules WHERE id = :i AND business_id = :b", i=tax_id, b=ctx.business_id)
    if not row:
        raise not_found("Tax rule")
    return row


@router.get("/tax-rules")
def list_taxes(ctx: TenantContext = Depends(require("taxes.view")), db: Session = Depends(get_db)):
    return {"data": all_(db, "SELECT * FROM tax_rules WHERE business_id = :b ORDER BY name", b=ctx.business_id)}


@router.post("/tax-rules", status_code=201)
def create_tax(body: s.TaxIn, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    tid = uuid.uuid4()
    with guard(db):
        run(db, "INSERT INTO tax_rules (id, business_id, name, rate_percent) VALUES (:i,:b,:n,:r)", i=tid, b=ctx.business_id, n=body.name, r=body.rate_percent)
        _audit(db, ctx, "tax_rule.create", "tax_rule", tid, after=body.model_dump(mode="json"))
    return {"data": _tax(db, ctx, tid)}


@router.patch("/tax-rules/{tax_id}")
def patch_tax(tax_id: uuid.UUID, body: s.TaxPatch, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    before = _tax(db, ctx, tax_id)
    fields = body.model_dump(exclude_unset=True)
    if fields:
        with guard(db):
            sql, p = patch_sql("tax_rules", fields, "id = :_id AND business_id = :_b")
            run(db, sql, **p, _id=tax_id, _b=ctx.business_id)
            _audit(db, ctx, "tax_rule.update", "tax_rule", tax_id, before=before, after=body.model_dump(mode="json", exclude_unset=True))
    return {"data": _tax(db, ctx, tax_id)}


def _discount(db: Session, ctx: TenantContext, did) -> dict:
    row = one(db, "SELECT d.*, p.name AS product_name FROM discount_rules d LEFT JOIN products p ON p.id = d.product_id WHERE d.id = :i AND d.business_id = :b", i=did, b=ctx.business_id)
    if not row:
        raise not_found("Discount rule")
    return row


@router.get("/discount-rules")
def list_discounts(ctx: TenantContext = Depends(require("discounts.view")), db: Session = Depends(get_db)):
    return {"data": all_(db, "SELECT d.*, p.name AS product_name FROM discount_rules d LEFT JOIN products p ON p.id = d.product_id WHERE d.business_id = :b ORDER BY d.created_at DESC", b=ctx.business_id)}


@router.post("/discount-rules", status_code=201)
def create_discount(body: s.DiscountIn, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    if body.discount_type == "percentage" and body.value > 100:
        raise invalid("value", "A percentage cannot exceed 100")
    if (body.scope == "product") != (body.product_id is not None):
        raise invalid("product_id", "Required for product scope and not allowed for subscription scope")
    if body.ends_on and body.ends_on < body.starts_on:
        raise invalid("ends_on", "Must not be before starts_on")
    did = uuid.uuid4()
    with guard(db):
        run(db, """INSERT INTO discount_rules (id, business_id, name, discount_type, value, scope, product_id, min_purchase_amount, min_quantity, starts_on, ends_on, usage_limit)
                   VALUES (:i,:b,:n,:t,:v,:sc,:p,:mp,:mq,:so,:eo,:ul)""",
            i=did, b=ctx.business_id, n=body.name, t=body.discount_type, v=body.value, sc=body.scope, p=body.product_id,
            mp=body.min_purchase_amount, mq=body.min_quantity, so=body.starts_on, eo=body.ends_on, ul=body.usage_limit)
        _audit(db, ctx, "discount_rule.create", "discount_rule", did, after=body.model_dump(mode="json"))
    return {"data": _discount(db, ctx, did)}


@router.patch("/discount-rules/{discount_id}")
def patch_discount(discount_id: uuid.UUID, body: s.DiscountPatch, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    before = _discount(db, ctx, discount_id)
    fields = body.model_dump(exclude_unset=True)
    if fields:
        with guard(db):
            sql, p = patch_sql("discount_rules", fields, "id = :_id AND business_id = :_b")
            run(db, sql, **p, _id=discount_id, _b=ctx.business_id)
            _audit(db, ctx, "discount_rule.update", "discount_rule", discount_id, before=before, after=body.model_dump(mode="json", exclude_unset=True))
    return {"data": _discount(db, ctx, discount_id)}


@router.post("/discount-rules/{discount_id}/deactivate")
def deactivate_discount(discount_id: uuid.UUID, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)):
    _discount(db, ctx, discount_id)
    with guard(db):
        run(db, "UPDATE discount_rules SET is_active = false WHERE id = :i AND business_id = :b", i=discount_id, b=ctx.business_id)
        _audit(db, ctx, "discount_rule.deactivate", "discount_rule", discount_id)
    return {"data": _discount(db, ctx, discount_id)}


CUSTOMER_SQL = """SELECT c.id, c.name, c.email, c.phone, c.billing_address, c.tax_id, c.is_active, c.created_at,
                  (c.user_id IS NOT NULL) AS has_login,
                  (SELECT count(*) FROM subscriptions s WHERE s.customer_id = c.id) AS subscriptions_count,
                  COALESCE((SELECT sum(i.total - i.amount_paid) FROM invoices i WHERE i.customer_id = c.id AND i.status = 'confirmed'), 0) AS outstanding
                  FROM customer_profiles c WHERE c.business_id = :b"""


def _customer(db: Session, ctx: TenantContext, cid) -> dict:
    row = one(db, CUSTOMER_SQL + " AND c.id = :id", b=ctx.business_id, id=cid)
    if not row:
        raise not_found("Customer")
    return row


@router.get("/customers")
def list_customers(q: str | None = None, is_active: bool | None = None, sort: str | None = None, params: PageParams = Depends(page_params),
                   ctx: TenantContext = Depends(require("customers.view")), db: Session = Depends(get_db)):
    where, p = "", {"b": ctx.business_id}
    if q:
        where += " AND (c.name ILIKE :q OR c.email ILIKE :q)"; p["q"] = f"%{q}%"
    if is_active is not None:
        where += " AND c.is_active = :a"; p["a"] = is_active
    order = _order(sort, {"name": "c.name", "created_at": "c.created_at", "email": "c.email"}, "name")
    return _paged(db, CUSTOMER_SQL + where, f"SELECT count(*) FROM customer_profiles c WHERE c.business_id = :b{where}", params, order, **p)


@router.post("/customers", status_code=201)
def create_customer(body: s.CustomerIn, ctx: TenantContext = Depends(require("customers.create")), db: Session = Depends(get_db)):
    cid = uuid.uuid4()
    with guard(db):
        run(db, "INSERT INTO customer_profiles (id, business_id, name, email, phone, billing_address, tax_id) VALUES (:i,:b,:n,:e,:p,:a,:t)",
            i=cid, b=ctx.business_id, n=body.name, e=body.email, p=body.phone, a=body.billing_address, t=body.tax_id)
        _audit(db, ctx, "customer.create", "customer", cid, after={"name": body.name, "email": body.email})
    return {"data": _customer(db, ctx, cid)}


@router.get("/customers/{customer_id}")
def get_customer(customer_id: uuid.UUID, ctx: TenantContext = Depends(require("customers.view")), db: Session = Depends(get_db)):
    return {"data": _customer(db, ctx, customer_id)}


@router.patch("/customers/{customer_id}")
def patch_customer(customer_id: uuid.UUID, body: s.CustomerPatch, ctx: TenantContext = Depends(require("customers.update")), db: Session = Depends(get_db)):
    _customer(db, ctx, customer_id)
    fields = body.model_dump(exclude_unset=True)
    if fields:
        with guard(db):
            sql, p = patch_sql("customer_profiles", fields, "id = :_id AND business_id = :_b")
            run(db, sql, **p, _id=customer_id, _b=ctx.business_id)
            _audit(db, ctx, "customer.update", "customer", customer_id, after=fields)
    return {"data": _customer(db, ctx, customer_id)}


@router.post("/customers/{customer_id}/invite")
def invite_customer(customer_id: uuid.UUID, ctx: TenantContext = Depends(require("customers.update")), db: Session = Depends(get_db)):
    profile = db.scalar(select(CustomerProfile).where(CustomerProfile.id == customer_id, CustomerProfile.business_id == ctx.business_id))
    if profile is None:
        raise not_found("Customer")
    if profile.user_id is not None:
        raise AppError("INVALID_STATE_TRANSITION", "This customer already has a portal login", status_code=409)
    with guard(db):
        user = db.scalar(select(User).where(User.email == profile.email))
        if user is None:
            user = User(email=profile.email, full_name=profile.name)
            db.add(user)
            db.flush()
        business = db.get(Business, ctx.business_id)
        issue_customer_invitation(db, user, business, profile)
        _audit(db, ctx, "customer.invite", "customer", customer_id)
    return {"data": {"invited": True, "email": profile.email}}
