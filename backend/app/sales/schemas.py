import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

Money = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class LineIn(_Base):
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    quantity: int = Field(ge=1, le=1_000_000)
    unit_price: Money | None = None
    tax_rule_id: uuid.UUID | None = None


class TemplateIn(_Base):
    name: str = Field(min_length=1, max_length=200)
    plan_id: uuid.UUID
    validity_days: int = Field(default=30, ge=1, le=3650)
    payment_terms_days: int = Field(default=15, ge=0, le=365)
    notes: str | None = Field(default=None, max_length=5000)
    lines: list[LineIn] = Field(default_factory=list, max_length=100)


class TemplatePatch(_Base):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    plan_id: uuid.UUID | None = None
    validity_days: int | None = Field(default=None, ge=1, le=3650)
    payment_terms_days: int | None = Field(default=None, ge=0, le=365)
    notes: str | None = None
    is_active: bool | None = None
    lines: list[LineIn] | None = Field(default=None, max_length=100)


class SubscriptionIn(_Base):
    customer_id: uuid.UUID
    plan_id: uuid.UUID | None = None
    template_id: uuid.UUID | None = None
    start_date: dt.date
    expiry_date: dt.date
    payment_terms_days: int | None = Field(default=None, ge=0, le=365)
    notes: str | None = Field(default=None, max_length=5000)
    lines: list[LineIn] | None = Field(default=None, max_length=100)


class SubscriptionPatch(_Base):
    start_date: dt.date | None = None
    expiry_date: dt.date | None = None
    payment_terms_days: int | None = Field(default=None, ge=0, le=365)
    notes: str | None = None
    lines: list[LineIn] | None = Field(default=None, max_length=100)


class ReasonBody(_Base):
    reason: str | None = Field(default=None, max_length=500)


class RenewBody(_Base):
    expiry_date: dt.date
