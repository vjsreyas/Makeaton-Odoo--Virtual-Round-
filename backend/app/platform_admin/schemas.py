import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.auth.schemas import Email

_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$")
_CURRENCY_RE = re.compile(r"^[A-Z]{3}$")


def _timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError, OSError):
        raise ValueError("Must be a valid IANA timezone")
    return value


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class BusinessCreateRequest(_Base):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=50)
    admin_full_name: str = Field(min_length=1, max_length=200)
    admin_email: Email
    timezone: str | None = Field(default=None, max_length=64)
    currency: str | None = None

    @field_validator("slug")
    @classmethod
    def check_slug(cls, value: str) -> str:
        value = value.lower()
        if not _SLUG_RE.match(value):
            raise ValueError("Use lowercase letters, digits and hyphens; must start and end with a letter or digit")
        return value

    @field_validator("timezone")
    @classmethod
    def check_timezone(cls, value):
        return None if value is None else _timezone(value)

    @field_validator("currency")
    @classmethod
    def check_currency(cls, value):
        if value is None:
            return None
        value = value.upper()
        if not _CURRENCY_RE.match(value):
            raise ValueError("Must be a 3-letter currency code")
        return value


class BusinessUpdateRequest(_Base):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    legal_name: str | None = Field(default=None, max_length=200)
    contact_email: Email | None = None

    @model_validator(mode="after")
    def something_to_change(self):
        if not self.model_fields_set & {"name", "legal_name", "contact_email"}:
            raise ValueError("Provide at least one field to change")
        return self
