import uuid

from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import service as audit
from app.auth.service import get_user_by_email, issue_invite_token, void_unused_invites_without_profile
from app.core.config import get_settings
from app.core.db import unit_of_work
from app.core.errors import AppError
from app.core.pagination import PageParams, envelope, order_by
from app.models import Business, CustomerProfile, Membership, User
from app.notifications.outbox import enqueue_email

SORTABLE = {"created_at": Business.created_at, "name": Business.name, "slug": Business.slug, "id": Business.id}


def _counts(db: Session, business_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict[str, int]]:
    result = {bid: {"admin_count": 0, "staff_count": 0, "customer_count": 0} for bid in business_ids}
    if not business_ids:
        return result
    for bid, role, n in db.execute(
        select(Membership.business_id, Membership.role, func.count())
        .where(Membership.business_id.in_(business_ids), Membership.is_active.is_(True))
        .group_by(Membership.business_id, Membership.role)
    ):
        result[bid]["admin_count" if role == "business_admin" else "staff_count"] = n
    for bid, n in db.execute(
        select(CustomerProfile.business_id, func.count())
        .where(CustomerProfile.business_id.in_(business_ids))
        .group_by(CustomerProfile.business_id)
    ):
        result[bid]["customer_count"] = n
    return result


def _serialize(business: Business, counts: dict[str, int]) -> dict:
    return {
        "id": business.id,
        "name": business.name,
        "slug": business.slug,
        "status": business.status,
        "timezone": business.timezone,
        "currency": business.currency,
        "legal_name": business.legal_name,
        "contact_email": business.contact_email,
        "created_at": business.created_at,
        **counts,
    }


def _get(db: Session, business_id: uuid.UUID, lock: bool = False) -> Business:
    query = select(Business).where(Business.id == business_id)
    if lock:
        query = query.with_for_update()
    business = db.scalar(query)
    if business is None:
        raise AppError("NOT_FOUND", "Business not found", status_code=404)
    return business


def _detail(db: Session, business: Business) -> dict:
    return _serialize(business, _counts(db, [business.id])[business.id])


def list_businesses(db: Session, params: PageParams, *, q, status, sort) -> dict:
    conditions = []
    if q:
        pattern = f"%{q}%"
        conditions.append(or_(Business.name.ilike(pattern), Business.slug.ilike(pattern)))
    if status:
        conditions.append(Business.status == status)
    base = select(Business).where(*conditions)
    total = db.scalar(select(func.count()).select_from(base.subquery()))
    rows = db.scalars(base.order_by(*order_by(sort, SORTABLE, "-created_at")).limit(params.page_size).offset(params.offset)).all()
    counts = _counts(db, [b.id for b in rows])
    return envelope([_serialize(b, counts[b.id]) for b in rows], total, params)


def get_business(db: Session, business_id: uuid.UUID) -> dict:
    return _detail(db, _get(db, business_id))


def _send_admin_invitation(db: Session, business: Business, user: User) -> None:
    raw = issue_invite_token(db, user)
    link = f"{get_settings().app_base_url}/accept-invitation?token={raw}"
    enqueue_email(
        db,
        to_email=user.email,
        subject=f"Set up {business.name} on Brightloop",
        body=f"Hello {user.full_name},\n\nYou are the administrator of {business.name} on Brightloop. "
        f"Use this link to set your password (valid for 7 days):\n{link}\n",
        kind="auth.admin_invitation",
        user_id=user.id,
        business_id=business.id,
        sensitive=True,
    )


def create_business(db: Session, actor: User, body) -> dict:
    settings = get_settings()
    with unit_of_work(db):
        business = Business(
            name=body.name,
            slug=body.slug,
            timezone=body.timezone or settings.default_timezone,
            currency=body.currency or "INR",
            contact_email=body.admin_email,
        )
        db.add(business)
        try:
            db.flush()
        except IntegrityError:
            raise AppError("SLUG_TAKEN", "This business slug is already in use", status_code=409)
        for kind in ("subscription", "invoice"):
            db.execute(
                text("INSERT INTO number_sequences (business_id, kind) VALUES (:b, :k)"), {"b": business.id, "k": kind}
            )
        user = get_user_by_email(db, body.admin_email)
        if user is None:
            user = User(email=body.admin_email, full_name=body.admin_full_name)
            db.add(user)
            db.flush()
        db.add(Membership(business_id=business.id, user_id=user.id, role="business_admin"))
        db.flush()
        if user.password_hash is None:
            _send_admin_invitation(db, business, user)
        else:
            enqueue_email(
                db,
                to_email=user.email,
                subject=f"You are now administrator of {business.name}",
                body=f"Hello {user.full_name},\n\nYou were made administrator of {business.name} on Brightloop. "
                "Switch to that business after signing in.\n",
                kind="platform.admin_added",
                user_id=user.id,
                business_id=business.id,
            )
        audit.record(
            db,
            "platform.business_create",
            actor_user_id=actor.id,
            actor_role="platform_admin",
            entity_type="business",
            entity_id=business.id,
            after={"name": business.name, "slug": business.slug, "admin_user_id": user.id},
        )
    return _detail(db, business)


def update_business(db: Session, actor: User, business_id: uuid.UUID, body) -> dict:
    with unit_of_work(db):
        business = _get(db, business_id, lock=True)
        fields = body.model_dump(exclude_unset=True)
        before = {k: getattr(business, k) for k in fields}
        for key, value in fields.items():
            setattr(business, key, value)
        audit.record(
            db,
            "platform.business_update",
            actor_user_id=actor.id,
            actor_role="platform_admin",
            entity_type="business",
            entity_id=business.id,
            before=before,
            after=fields,
        )
    return _detail(db, business)


def set_status(db: Session, actor: User, business_id: uuid.UUID, status: str) -> dict:
    with unit_of_work(db):
        business = _get(db, business_id, lock=True)
        if business.status == status:
            raise AppError(
                "INVALID_STATE_TRANSITION",
                f"Business is already {status}",
                status_code=409,
            )
        before = business.status
        business.status = status
        audit.record(
            db,
            "platform.business_suspend" if status == "suspended" else "platform.business_activate",
            actor_user_id=actor.id,
            actor_role="platform_admin",
            entity_type="business",
            entity_id=business.id,
            before={"status": before},
            after={"status": status},
        )
    return _detail(db, business)


def resend_admin_invite(db: Session, actor: User, business_id: uuid.UUID) -> dict:
    with unit_of_work(db):
        business = _get(db, business_id, lock=True)
        pending = db.scalars(
            select(User)
            .join(Membership, Membership.user_id == User.id)
            .where(
                Membership.business_id == business.id,
                Membership.role == "business_admin",
                Membership.is_active.is_(True),
                User.password_hash.is_(None),
                User.is_active.is_(True),
            )
        ).all()
        if not pending:
            raise AppError("INVALID_STATE_TRANSITION", "No pending administrator invitation", status_code=409)
        for user in pending:
            void_unused_invites_without_profile(db, user.id)
            _send_admin_invitation(db, business, user)
        audit.record(
            db,
            "platform.admin_invite_resend",
            actor_user_id=actor.id,
            actor_role="platform_admin",
            entity_type="business",
            entity_id=business.id,
            after={"invites_sent": len(pending)},
        )
    return {"invites_sent": len(pending)}
