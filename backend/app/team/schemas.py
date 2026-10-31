from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.auth.schemas import Email
from app.tenancy.catalog import is_grantable


def _validate_permissions(values: list[str]) -> list[str]:
    cleaned = list(dict.fromkeys(v.strip() for v in values))
    for code in cleaned:
        if not is_grantable(code):
            raise ValueError(f"Unknown or non-grantable permission: {code}")
    return cleaned


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class TeamCreateRequest(_Base):
    full_name: str = Field(min_length=1, max_length=200)
    email: Email
    permissions: list[str] | None = Field(default=None, max_length=100)

    @field_validator("permissions")
    @classmethod
    def check_permissions(cls, value):
        return None if value is None else _validate_permissions(value)


class TeamUpdateRequest(_Base):
    is_active: bool | None = None
    permissions: list[str] | None = Field(default=None, max_length=100)

    @field_validator("permissions")
    @classmethod
    def check_permissions(cls, value):
        return None if value is None else _validate_permissions(value)

    @model_validator(mode="after")
    def something_to_change(self):
        if self.is_active is None and self.permissions is None:
            raise ValueError("Provide is_active and/or permissions")
        return self


class PermissionsRequest(_Base):
    permissions: list[str] = Field(max_length=100)

    @field_validator("permissions")
    @classmethod
    def check_permissions(cls, value):
        return _validate_permissions(value)
