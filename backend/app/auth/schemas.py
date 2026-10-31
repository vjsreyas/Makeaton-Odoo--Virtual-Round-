import re
import uuid
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator

from app.auth.passwords import MAX_LENGTH, validate_password

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _email(value: str) -> str:
    if len(value) > 254 or not _EMAIL_RE.match(value):
        raise ValueError("Must be a valid email address")
    return value


Email = Annotated[str, AfterValidator(_email)]
NewPassword = Annotated[str, AfterValidator(validate_password)]
OptionalNewPassword = Annotated[
    str | None, AfterValidator(lambda value: value if value is None else validate_password(value))
]
Slug = Annotated[str, Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9-]+$")]


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class RegisterRequest(_Base):
    business_slug: Slug
    full_name: str = Field(min_length=1, max_length=200)
    email: Email
    password: NewPassword


class LoginRequest(_Base):
    email: Email
    password: str = Field(min_length=1, max_length=MAX_LENGTH)


class SwitchContextRequest(_Base):
    context: Literal["platform"] | None = None
    business_id: uuid.UUID | None = None
    type: Literal["business_admin", "business_staff", "customer"] | None = None

    @model_validator(mode="after")
    def exactly_one_target(self) -> "SwitchContextRequest":
        if (self.context is None) == (self.business_id is None):
            raise ValueError("Provide exactly one of context or business_id")
        if self.context is not None and self.type is not None:
            raise ValueError("type is only valid together with business_id")
        return self


class JoinBusinessRequest(_Base):
    business_slug: Slug


class ForgotPasswordRequest(_Base):
    email: Email


class ResetPasswordRequest(_Base):
    token: str = Field(min_length=1, max_length=256)
    new_password: OptionalNewPassword = None


class ChangePasswordRequest(_Base):
    current_password: str = Field(min_length=1, max_length=MAX_LENGTH)
    new_password: NewPassword
