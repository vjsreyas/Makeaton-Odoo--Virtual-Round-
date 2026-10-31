import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.pagination import PageParams, page_params
from app.team import service
from app.team.schemas import PermissionsRequest, TeamCreateRequest, TeamUpdateRequest
from app.tenancy import catalog
from app.tenancy.context import TenantContext, require_admin

router = APIRouter(tags=["team"])


@router.get("/permissions/catalog")
def permission_catalog(_: TenantContext = Depends(require_admin)) -> dict:
    return {
        "data": {
            "permissions": [{"code": p.code, "module": p.module, "action": p.action} for p in catalog.catalog()],
            "defaults": list(catalog.DEFAULT_STAFF_PERMISSIONS),
            "admin_only": list(catalog.ADMIN_ONLY_CAPABILITIES),
        }
    }


@router.get("/team")
def list_team(
    q: str | None = Query(None, max_length=100),
    role: Literal["business_admin", "business_staff"] | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None, max_length=30),
    params: PageParams = Depends(page_params),
    ctx: TenantContext = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    return service.list_team(db, ctx, params, q=q, role=role, is_active=is_active, sort=sort)


@router.post("/team", status_code=201)
def create_member(body: TeamCreateRequest, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    return {"data": service.create_member(db, ctx, full_name=body.full_name, email=body.email, permissions=body.permissions)}


@router.get("/team/{membership_id}")
def get_member(membership_id: uuid.UUID, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    return {"data": service.get_member(db, ctx, membership_id)}


@router.patch("/team/{membership_id}")
def update_member(
    membership_id: uuid.UUID, body: TeamUpdateRequest, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    return {"data": service.update_member(db, ctx, membership_id, is_active=body.is_active, permissions=body.permissions)}


@router.put("/team/{membership_id}/permissions")
def put_permissions(
    membership_id: uuid.UUID, body: PermissionsRequest, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    return {"data": service.set_permissions(db, ctx, membership_id, body.permissions)}


@router.post("/team/{membership_id}/deactivate")
def deactivate(membership_id: uuid.UUID, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    return {"data": service.set_active(db, ctx, membership_id, False)}


@router.post("/team/{membership_id}/activate")
def activate(membership_id: uuid.UUID, ctx: TenantContext = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    return {"data": service.set_active(db, ctx, membership_id, True)}
