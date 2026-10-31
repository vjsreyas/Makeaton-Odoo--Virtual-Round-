import uuid

from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import service as audit
from app.auth import permissions as grants
from app.auth.service import get_user_by_email, issue_invite_token
from app.core.config import get_settings
from app.core.db import unit_of_work
from app.core.errors import AppError
from app.core.pagination import PageParams, envelope, order_by
from app.models import Membership, StaffPermission, User
from app.notifications.outbox import enqueue_email
from app.tenancy.catalog import DEFAULT_STAFF_PERMISSIONS
from app.tenancy.context import TenantContext, forbidden

SORTABLE = {"created_at": Membership.created_at, "full_name": User.full_name, "email": User.email, "id": Membership.id}


def _status(member: Membership, user: User) -> str:
    if not member.is_active:
        return "inactive"
    return "active" if user.password_hash is not None else "invited"


def _serialize(member: Membership, user: User, explicit: list[str]) -> dict:
    return {
        "id": member.id,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": member.role,
        "is_active": member.is_active,
        "status": _status(member, user),
        "permissions": grants.grants_for_role(member.role, explicit),
        "created_at": member.created_at,
    }


def _explicit_permissions(db: Session, membership_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[str]]:
    result: dict[uuid.UUID, list[str]] = {mid: [] for mid in membership_ids}
    if membership_ids:
        rows = db.execute(
            select(StaffPermission.membership_id, StaffPermission.permission).where(
                StaffPermission.membership_id.in_(membership_ids)
            )
        )
        for membership_id, code in rows:
            result[membership_id].append(code)
    return result


def _not_found() -> AppError:
    return AppError("NOT_FOUND", "Team member not found", status_code=404)


def _load(db: Session, ctx: TenantContext, membership_id: uuid.UUID, lock: bool = False) -> tuple[Membership, User]:
    query = (
        select(Membership, User)
        .join(User, User.id == Membership.user_id)
        .where(Membership.business_id == ctx.business_id, Membership.id == membership_id)
    )
    if lock:
        query = query.with_for_update(of=Membership)
    row = db.execute(query).first()
    if row is None:
        raise _not_found()
    return row[0], row[1]


def _require_staff(member: Membership) -> None:
    if member.role != "business_staff":
        raise forbidden("Business Admin memberships are managed by the platform")


def list_team(db: Session, ctx: TenantContext, params: PageParams, *, q, role, is_active, sort) -> dict:
    conditions = [Membership.business_id == ctx.business_id]
    if q:
        pattern = f"%{q}%"
        conditions.append(or_(User.full_name.ilike(pattern), User.email.ilike(pattern)))
    if role:
        conditions.append(Membership.role == role)
    if is_active is not None:
        conditions.append(Membership.is_active.is_(is_active))
    base = select(Membership, User).join(User, User.id == Membership.user_id).where(*conditions)
    total = db.scalar(select(func.count()).select_from(base.subquery()))
    rows = db.execute(base.order_by(*order_by(sort, SORTABLE, "-created_at")).limit(params.page_size).offset(params.offset)).all()
    explicit = _explicit_permissions(db, [m.id for m, _ in rows])
    return envelope([_serialize(m, u, explicit[m.id]) for m, u in rows], total, params)


def get_member(db: Session, ctx: TenantContext, membership_id: uuid.UUID) -> dict:
    member, user = _load(db, ctx, membership_id)
    return _serialize(member, user, _explicit_permissions(db, [member.id])[member.id])


def _replace_permissions(db: Session, ctx: TenantContext, member: Membership, codes: list[str]) -> None:
    db.execute(delete(StaffPermission).where(StaffPermission.membership_id == member.id))
    for code in codes:
        db.add(StaffPermission(business_id=ctx.business_id, membership_id=member.id, permission=code))
    db.flush()


def _send_invitation(db: Session, ctx: TenantContext, user: User) -> None:
    raw = issue_invite_token(db, user)
    link = f"{get_settings().app_base_url}/accept-invitation?token={raw}"
    enqueue_email(
        db,
        to_email=user.email,
        subject=f"You have been invited to {ctx.business.name}",
        body=f"Hello {user.full_name},\n\n{ctx.business.name} invited you to join its team on Brightloop. "
        f"Use this link to set your password (valid for 7 days):\n{link}\n",
        kind="auth.team_invitation",
        user_id=user.id,
        business_id=ctx.business_id,
        sensitive=True,
    )


def create_member(db: Session, ctx: TenantContext, *, full_name: str, email: str, permissions: list[str] | None) -> dict:
    codes = list(DEFAULT_STAFF_PERMISSIONS) if permissions is None else permissions
    with unit_of_work(db):
        user = get_user_by_email(db, email)
        if user is not None:
            already = db.scalar(
                select(Membership.id).where(Membership.business_id == ctx.business_id, Membership.user_id == user.id)
            )
            if already is not None:
                raise AppError("ALREADY_MEMBER", "This person is already on the team", status_code=409)
        else:
            user = User(email=email, full_name=full_name)
            db.add(user)
            db.flush()
        member = Membership(business_id=ctx.business_id, user_id=user.id, role="business_staff")
        db.add(member)
        try:
            db.flush()
        except IntegrityError:
            raise AppError("ALREADY_MEMBER", "This person is already on the team", status_code=409)
        _replace_permissions(db, ctx, member, codes)
        if user.password_hash is None:
            _send_invitation(db, ctx, user)
        else:
            enqueue_email(
                db,
                to_email=user.email,
                subject=f"You were added to {ctx.business.name}",
                body=f"Hello {user.full_name},\n\nYou were added to the team of {ctx.business.name} on Brightloop. "
                "Switch to that business after signing in.\n",
                kind="team.added",
                user_id=user.id,
                business_id=ctx.business_id,
            )
        audit.record(
            db,
            "team.create",
            actor_user_id=ctx.user.id,
            actor_role=ctx.role,
            business_id=ctx.business_id,
            entity_type="membership",
            entity_id=member.id,
            after={"user_id": user.id, "email": user.email, "permissions": sorted(codes)},
        )
    return get_member(db, ctx, member.id)


def update_member(db: Session, ctx: TenantContext, membership_id: uuid.UUID, *, is_active, permissions) -> dict:
    with unit_of_work(db):
        member, user = _load(db, ctx, membership_id, lock=True)
        _require_staff(member)
        before = {
            "is_active": member.is_active,
            "permissions": sorted(_explicit_permissions(db, [member.id])[member.id]),
        }
        if is_active is not None:
            member.is_active = is_active
        if permissions is not None:
            _replace_permissions(db, ctx, member, permissions)
        db.flush()
        after = {
            "is_active": member.is_active,
            "permissions": sorted(_explicit_permissions(db, [member.id])[member.id]),
        }
        audit.record(
            db,
            "team.update",
            actor_user_id=ctx.user.id,
            actor_role=ctx.role,
            business_id=ctx.business_id,
            entity_type="membership",
            entity_id=member.id,
            before=before,
            after=after,
        )
    return get_member(db, ctx, membership_id)


def set_permissions(db: Session, ctx: TenantContext, membership_id: uuid.UUID, permissions: list[str]) -> dict:
    with unit_of_work(db):
        member, _ = _load(db, ctx, membership_id, lock=True)
        _require_staff(member)
        before = sorted(_explicit_permissions(db, [member.id])[member.id])
        _replace_permissions(db, ctx, member, permissions)
        audit.record(
            db,
            "team.permissions_update",
            actor_user_id=ctx.user.id,
            actor_role=ctx.role,
            business_id=ctx.business_id,
            entity_type="membership",
            entity_id=member.id,
            before={"permissions": before},
            after={"permissions": sorted(permissions)},
        )
    return get_member(db, ctx, membership_id)


def set_active(db: Session, ctx: TenantContext, membership_id: uuid.UUID, active: bool) -> dict:
    with unit_of_work(db):
        member, _ = _load(db, ctx, membership_id, lock=True)
        _require_staff(member)
        if member.is_active == active:
            raise AppError(
                "INVALID_STATE_TRANSITION",
                "Team member is already active" if active else "Team member is already inactive",
                status_code=409,
            )
        member.is_active = active
        audit.record(
            db,
            "team.activate" if active else "team.deactivate",
            actor_user_id=ctx.user.id,
            actor_role=ctx.role,
            business_id=ctx.business_id,
            entity_type="membership",
            entity_id=member.id,
            before={"is_active": not active},
            after={"is_active": active},
        )
    return get_member(db, ctx, membership_id)
