import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.db import get_db
from app.core.pagination import PageParams, page_params
from app.platform_admin import service
from app.platform_admin.schemas import BusinessCreateRequest, BusinessUpdateRequest
from app.tenancy.context import require_platform

router = APIRouter(prefix="/platform", tags=["platform"])


@router.get("/businesses")
def list_businesses(
    q: str | None = Query(None, max_length=100),
    status: Literal["active", "suspended"] | None = None,
    sort: str | None = Query(None, max_length=30),
    params: PageParams = Depends(page_params),
    _: AuthContext = Depends(require_platform),
    db: Session = Depends(get_db),
) -> dict:
    return service.list_businesses(db, params, q=q, status=status, sort=sort)


@router.post("/businesses", status_code=201)
def create_business(body: BusinessCreateRequest, ctx: AuthContext = Depends(require_platform), db: Session = Depends(get_db)) -> dict:
    return {"data": service.create_business(db, ctx.user, body)}


@router.get("/businesses/{business_id}")
def get_business(business_id: uuid.UUID, _: AuthContext = Depends(require_platform), db: Session = Depends(get_db)) -> dict:
    return {"data": service.get_business(db, business_id)}


@router.patch("/businesses/{business_id}")
def update_business(
    business_id: uuid.UUID, body: BusinessUpdateRequest, ctx: AuthContext = Depends(require_platform), db: Session = Depends(get_db)
) -> dict:
    return {"data": service.update_business(db, ctx.user, business_id, body)}


@router.post("/businesses/{business_id}/suspend")
def suspend(business_id: uuid.UUID, ctx: AuthContext = Depends(require_platform), db: Session = Depends(get_db)) -> dict:
    return {"data": service.set_status(db, ctx.user, business_id, "suspended")}


@router.post("/businesses/{business_id}/activate")
def activate(business_id: uuid.UUID, ctx: AuthContext = Depends(require_platform), db: Session = Depends(get_db)) -> dict:
    return {"data": service.set_status(db, ctx.user, business_id, "active")}


@router.post("/businesses/{business_id}/resend-admin-invite")
def resend_admin_invite(business_id: uuid.UUID, ctx: AuthContext = Depends(require_platform), db: Session = Depends(get_db)) -> dict:
    return {"data": service.resend_admin_invite(db, ctx.user, business_id)}
