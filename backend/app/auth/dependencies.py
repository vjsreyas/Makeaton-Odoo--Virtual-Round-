import uuid
from dataclasses import dataclass

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.tokens import TokenClaims, decode_access_token, unauthenticated
from app.core.db import get_db
from app.core.errors import AppError
from app.models import Business, CustomerProfile, Membership, User

_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    user: User
    kind: str
    claims: TokenClaims
    business: Business | None = None
    membership_id: uuid.UUID | None = None
    customer_id: uuid.UUID | None = None


def get_claims(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> TokenClaims:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthenticated()
    return decode_access_token(credentials.credentials)


def get_current_user(claims: TokenClaims = Depends(get_claims), db: Session = Depends(get_db)) -> User:
    user = db.get(User, claims.user_id)
    if user is None or not user.is_active or user.token_version != claims.token_version:
        raise unauthenticated("Invalid or expired token")
    return user


def get_auth_context(
    claims: TokenClaims = Depends(get_claims),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthContext:
    kind = claims.context_type
    if kind == "none":
        if claims.business_id is not None:
            raise unauthenticated()
        return AuthContext(user=user, kind=kind, claims=claims)
    if kind == "platform":
        if not user.is_platform_admin or claims.business_id is not None:
            raise unauthenticated()
        return AuthContext(user=user, kind=kind, claims=claims)
    if kind not in ("business_admin", "business_staff", "customer") or claims.business_id is None:
        raise unauthenticated()
    ctx = AuthContext(user=user, kind=kind, claims=claims)
    if kind == "customer":
        profile = db.scalar(
            select(CustomerProfile).where(
                CustomerProfile.business_id == claims.business_id,
                CustomerProfile.user_id == user.id,
                CustomerProfile.is_active.is_(True),
            )
        )
        if profile is None:
            raise unauthenticated()
        ctx.customer_id = profile.id
    else:
        membership = db.scalar(
            select(Membership).where(
                Membership.business_id == claims.business_id,
                Membership.user_id == user.id,
                Membership.is_active.is_(True),
            )
        )
        if membership is None or membership.role != kind:
            raise unauthenticated()
        ctx.membership_id = membership.id
    business = db.get(Business, claims.business_id)
    if business is None:
        raise unauthenticated()
    if business.status != "active":
        raise AppError("BUSINESS_SUSPENDED", "This business is suspended", status_code=403)
    ctx.business = business
    return ctx
