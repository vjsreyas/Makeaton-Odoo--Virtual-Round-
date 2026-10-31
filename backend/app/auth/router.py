from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth import service
from app.auth.dependencies import AuthContext, get_auth_context, get_claims, get_current_user
from app.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    JoinBusinessRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SwitchContextRequest,
)
from app.auth.tokens import TokenClaims
from app.core.db import get_db
from app.core.client_ip import get_client_ip
from app.core.errors import AppError
from app.models import Business, User

router = APIRouter(prefix="/auth", tags=["auth"])
public_router = APIRouter(prefix="/public", tags=["public"])


@public_router.get("/businesses/{slug}")
def public_business(slug: str, db: Session = Depends(get_db)) -> dict:
    business = service.find_business_by_slug(db, slug)
    if business is None or business.status != "active":
        raise AppError("NOT_FOUND", "Business not found", status_code=404)
    return {"data": {"name": business.name, "slug": business.slug}}


@router.post("/register", status_code=201)
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    return {"data": service.register(db, **body.model_dump(), client_ip=get_client_ip(request))}


@router.post("/login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    return {"data": service.login(db, email=body.email, password=body.password, client_ip=get_client_ip(request))}


@router.post("/switch-context")
def switch_context(body: SwitchContextRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return {"data": service.switch_context(db, user, body)}


@router.post("/join-business")
def join_business(body: JoinBusinessRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return {"data": service.join_business(db, user, body.business_slug)}


@router.post("/forgot-password", status_code=202)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    service.forgot_password(db, email=body.email)
    return {"data": {"message": "If the email is registered, a reset link has been sent"}}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    return {"data": service.reset_password(db, token=body.token, new_password=body.new_password)}


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    claims: TokenClaims = Depends(get_claims),
    db: Session = Depends(get_db),
) -> dict:
    result = service.change_password(
        db,
        user,
        current_password=body.current_password,
        new_password=body.new_password,
        context_type=claims.context_type,
        business_id=claims.business_id,
    )
    return {"data": result}


@router.get("/me")
def me(ctx: AuthContext = Depends(get_auth_context), db: Session = Depends(get_db)) -> dict:
    business: Business | None = ctx.business
    return {
        "data": {
            "user": {"id": ctx.user.id, "full_name": ctx.user.full_name, "email": ctx.user.email},
            "active_context": {"type": ctx.kind, "business_id": business.id if business else None},
            "role": ctx.kind,
            "permissions": service.permissions_for(db, ctx.kind, ctx.membership_id),
            "business": (
                {"id": business.id, "name": business.name, "currency": business.currency, "timezone": business.timezone}
                if business
                else None
            ),
            "contexts": service.list_contexts(db, ctx.user),
        }
    }
