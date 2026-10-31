from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

Money = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]
Name = Annotated[str, Field(min_length=1, max_length=200)]

class Input(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

class Product(Input):
    name: Name
    product_type: str = 'software'
    sales_price: Money
    cost_price: Money = Decimal('0')
    notes: str | None = None
    default_tax_rule_id: UUID | None = None
    is_active: bool = True

class Variant(Input):
    attribute: Name
    value: Name
    extra_price: Money = Decimal('0')
    is_active: bool = True

class Plan(Input):
    name: Name
    product_id: UUID
    price: Money
    billing_interval: Literal['daily','weekly','monthly','yearly']
    min_quantity: int = Field(1, ge=1)
    available_from: date
    available_to: date | None = None
    auto_close_on_expiry: bool = False
    allow_early_close: bool = False
    allow_pause: bool = False
    allow_renewal: bool = False
    is_active: bool = True

class Tax(Input):
    name: Name
    rate_percent: Decimal = Field(ge=0, le=100, max_digits=7, decimal_places=4)
    is_active: bool = True

class Discount(Input):
    name: Name
    discount_type: Literal['fixed','percentage']
    value: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    scope: Literal['product','subscription']
    product_id: UUID | None = None
    min_purchase_amount: Money = Decimal('0')
    min_quantity: int = Field(0, ge=0)
    starts_on: date
    ends_on: date | None = None
    usage_limit: int | None = Field(None, ge=0)
    is_active: bool = True

class Customer(Input):
    name: Name
    email: str = Field(pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$', max_length=254)
    phone: str | None = None
    billing_address: str | None = None
    tax_id: str | None = None
    is_active: bool = True

class Line(Input):
    product_id: UUID
    variant_id: UUID | None = None
    quantity: int = Field(1, ge=1)
    unit_price: Money | None = None
    tax_rule_id: UUID | None = None

class Template(Input):
    name: Name
    plan_id: UUID
    validity_days: int = Field(14, ge=1, le=365)
    payment_terms_days: int = Field(15, ge=0, le=365)
    notes: str | None = None
    is_active: bool = True
    lines: list[Line] = Field(min_length=1, max_length=100)

class Subscription(Input):
    customer_id: UUID
    plan_id: UUID | None = None
    template_id: UUID | None = None
    start_date: date
    expiry_date: date
    payment_terms_days: int = Field(15, ge=0, le=365)
    notes: str | None = None
    lines: list[Line] = Field(default_factory=list, max_length=100)

class Action(Input):
    reason: str | None = None
    expiry_date: date | None = None

class Billing(Input):
    as_of_date: date | None = None
    subscription_id: UUID | None = None

class Payment(Input):
    method: Literal['cash','bank_transfer','card','upi','cheque','other']
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    paid_on: date
    reference: str | None = Field(None, max_length=200)
    notes: str | None = None

class Bulk(Input):
    ids: list[UUID] = Field(min_length=1, max_length=100)

class Settings(Input):
    name: Name | None = None
    timezone: str | None = None
    currency: str | None = Field(None, pattern='^[A-Z]{3}$')
    auto_confirm_invoices: bool | None = None
    default_payment_terms_days: int | None = Field(None, ge=0, le=365)
    customer_self_service: bool | None = None
    legal_name: str | None = None
    address: str | None = None
    tax_id: str | None = None
    contact_email: str | None = None
