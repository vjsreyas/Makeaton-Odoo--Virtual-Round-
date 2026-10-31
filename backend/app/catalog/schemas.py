import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.auth.schemas import Email

Money = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]
Interval = Literal["daily", "weekly", "monthly", "yearly"]


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class VariantIn(_Base):
    attribute: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=100)
    extra_price: Money = Decimal("0.00")


class VariantPatch(_Base):
    attribute: str | None = Field(default=None, min_length=1, max_length=100)
    value: str | None = Field(default=None, min_length=1, max_length=100)
    extra_price: Money | None = None
    is_active: bool | None = None


class ProductIn(_Base):
    name: str = Field(min_length=1, max_length=200)
    product_type: str = Field(default="general", min_length=1, max_length=100)
    sales_price: Money
    cost_price: Money = Decimal("0.00")
    notes: str | None = Field(default=None, max_length=5000)
    default_tax_rule_id: uuid.UUID | None = None
    variants: list[VariantIn] = Field(default_factory=list, max_length=100)


class ProductPatch(_Base):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    product_type: str | None = Field(default=None, min_length=1, max_length=100)
    sales_price: Money | None = None
    cost_price: Money | None = None
    notes: str | None = Field(default=None, max_length=5000)
    default_tax_rule_id: uuid.UUID | None = None
    is_active: bool | None = None


class PlanIn(_Base):
    name: str = Field(min_length=1, max_length=200)
    product_id: uuid.UUID
    price: Money
    billing_interval: Interval
    min_quantity: int = Field(default=1, ge=1, le=1_000_000)
    available_from: dt.date
    available_to: dt.date | None = None
    auto_close_on_expiry: bool = False
    allow_early_close: bool = False
    allow_pause: bool = False
    allow_renewal: bool = False


class PlanPatch(_Base):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    price: Money | None = None
    billing_interval: Interval | None = None
    min_quantity: int | None = Field(default=None, ge=1, le=1_000_000)
    available_from: dt.date | None = None
    available_to: dt.date | None = None
    auto_close_on_expiry: bool | None = None
    allow_early_close: bool | None = None
    allow_pause: bool | None = None
    allow_renewal: bool | None = None
    is_active: bool | None = None


class TaxIn(_Base):
    name: str = Field(min_length=1, max_length=100)
    rate_percent: Annotated[Decimal, Field(ge=0, le=100, max_digits=7, decimal_places=4)]


class TaxPatch(_Base):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    rate_percent: Annotated[Decimal, Field(ge=0, le=100, max_digits=7, decimal_places=4)] | None = None
    is_active: bool | None = None


class DiscountIn(_Base):
    name: str = Field(min_length=1, max_length=100)
    discount_type: Literal["fixed", "percentage"]
    value: Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
    scope: Literal["product", "subscription"]
    product_id: uuid.UUID | None = None
    min_purchase_amount: Money = Decimal("0.00")
    min_quantity: int = Field(default=0, ge=0)
    starts_on: dt.date
    ends_on: dt.date | None = None
    usage_limit: int | None = Field(default=None, ge=0)


class DiscountPatch(_Base):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    value: Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)] | None = None
    min_purchase_amount: Money | None = None
    min_quantity: int | None = Field(default=None, ge=0)
    starts_on: dt.date | None = None
    ends_on: dt.date | None = None
    usage_limit: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class CustomerIn(_Base):
    name: str = Field(min_length=1, max_length=200)
    email: Email
    phone: str | None = Field(default=None, max_length=50)
    billing_address: str | None = Field(default=None, max_length=1000)
    tax_id: str | None = Field(default=None, max_length=100)


class CustomerPatch(_Base):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    billing_address: str | None = Field(default=None, max_length=1000)
    tax_id: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None
