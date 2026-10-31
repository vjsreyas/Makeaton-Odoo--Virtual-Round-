from dataclasses import dataclass
from typing import Callable

import uuid
from fastapi import Depends
from sqlalchemy.orm import Session

from app.auth import permissions
from app.auth.dependencies import AuthContext, get_auth_context
from app.auth.service import permissions_for
from app.core.db import get_db
from app.core.errors import AppError
from app.models import Business, User
from app.tenancy.catalog import is_grantable


@dataclass
class TenantContext:
    user: User
    business: Business
    role: str
    membership_id: uuid.UUID
    grants: list[str]

    @property
    def business_id(self) -> uuid.UUID:
        return self.business.id

    @property
    def is_admin(self) -> bool:
        return self.role == "business_admin"

    def allows(self, code: str) -> bool:
        return permissions.permission_granted(self.grants, code)


def forbidden(message: str = "You do not have access to this resource") -> AppError:
    return AppError("FORBIDDEN", message, status_code=403)


def get_tenant_context(ctx: AuthContext = Depends(get_auth_context), db: Session = Depends(get_db)) -> TenantContext:
    if ctx.kind not in ("business_admin", "business_staff") or ctx.business is None or ctx.membership_id is None:
        raise forbidden()
    return TenantContext(
        user=ctx.user,
        business=ctx.business,
        role=ctx.kind,
        membership_id=ctx.membership_id,
        grants=permissions_for(db, ctx.kind, ctx.membership_id),
    )


def require_admin(ctx: TenantContext = Depends(get_tenant_context)) -> TenantContext:
    if not ctx.is_admin:
        raise forbidden("Business Admin access required")
    return ctx


def require(code: str) -> Callable[..., TenantContext]:
    if not is_grantable(code):
        raise ValueError(f"unknown permission code {code!r}")

    def dependency(ctx: TenantContext = Depends(get_tenant_context)) -> TenantContext:
        if not ctx.allows(code):
            raise forbidden(f"Missing permission: {code}")
        return ctx

    return dependency


def require_platform(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
    if ctx.kind != "platform":
        raise forbidden("Platform Admin access required")
    return ctx
