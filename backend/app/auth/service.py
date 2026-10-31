import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import service as audit
from app.auth.passwords import hash_password, needs_rehash, verify_password
from app.auth import permissions
from app.auth.ratelimit import (
    LOGIN_LIMIT,
    REGISTER_IP_LIMIT,
    REGISTER_LIMIT,
    RESET_REQUEST_LIMIT,
    limiter,
)
from app.auth.schemas import SwitchContextRequest
from app.auth.tokens import (
    INVITE_TOKEN_TTL,
    RESET_TOKEN_TTL,
    create_access_token,
    generate_opaque_token,
    hash_opaque_token,
    unauthenticated,
)
from app.core.config import get_settings
from app.core.errors import AppError
from app.models import Business, CustomerProfile, Membership, PasswordResetToken, StaffPermission, User
from app.notifications.outbox import enqueue_email


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _invalid_token() -> AppError:
    return AppError(
        "VALIDATION_ERROR",
        "Request validation failed",
        status_code=422,
        details=[{"field": "token", "message": "Invalid or expired token"}],
    )


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def find_business_by_slug(db: Session, slug: str) -> Business | None:
    return db.scalar(select(Business).where(Business.slug == slug.lower()))


def get_active_business_by_slug(db: Session, slug: str) -> Business:
    business = find_business_by_slug(db, slug)
    if business is None:
        raise AppError("NOT_FOUND", "Business not found", status_code=404)
    if business.status != "active":
        raise AppError("BUSINESS_SUSPENDED", "This business is suspended", status_code=403)
    return business


def list_contexts(db: Session, user: User) -> list[dict]:
    contexts: list[dict] = []
    if user.is_platform_admin:
        contexts.append({"type": "platform", "business_id": None, "business_name": None, "business_status": None})
    staff_rows = db.execute(
        select(Membership, Business)
        .join(Business, Business.id == Membership.business_id)
        .where(Membership.user_id == user.id, Membership.is_active.is_(True))
        .order_by(Business.name, Business.id)
    ).all()
    for membership, business in staff_rows:
        contexts.append(
            {"type": membership.role, "business_id": business.id, "business_name": business.name, "business_status": business.status}
        )
    customer_rows = db.execute(
        select(CustomerProfile, Business)
        .join(Business, Business.id == CustomerProfile.business_id)
        .where(CustomerProfile.user_id == user.id, CustomerProfile.is_active.is_(True))
        .order_by(Business.name, Business.id)
    ).all()
    for _, business in customer_rows:
        contexts.append(
            {"type": "customer", "business_id": business.id, "business_name": business.name, "business_status": business.status}
        )
    return contexts


def default_context(contexts: list[dict]) -> dict | None:
    for context in contexts:
        if context["business_status"] != "suspended":
            return context
    return None


def build_session(user: User, context: dict | None) -> dict:
    context_type = context["type"] if context else "none"
    business_id = context["business_id"] if context else None
    token, expires_in = create_access_token(user.id, user.token_version, context_type, business_id)
    return {
        "access_token": token,
        "expires_in": expires_in,
        "active_context": {"type": context_type, "business_id": business_id},
    }


def _user_payload(user: User) -> dict:
    return {"id": user.id, "full_name": user.full_name, "email": user.email}


def _issue_token(db: Session, user: User, purpose: str, profile_id: uuid.UUID | None = None) -> str:
    raw = generate_opaque_token()
    ttl = RESET_TOKEN_TTL if purpose == "reset" else INVITE_TOKEN_TTL
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_opaque_token(raw),
            purpose=purpose,
            customer_profile_id=profile_id,
            expires_at=_now() + ttl,
        )
    )
    return raw


def _send_reset_email(db: Session, user: User, raw_token: str) -> None:
    link = f"{get_settings().app_base_url}/reset-password?token={raw_token}"
    enqueue_email(
        db,
        to_email=user.email,
        subject="Reset your Brightloop password",
        body=f"Hello {user.full_name},\n\nUse this link to set a new password (valid for 60 minutes):\n{link}\n\n"
        "If you did not request this, you can ignore this email.\n",
        kind="auth.password_reset",
        user_id=user.id,
        sensitive=True,
    )


def _send_invitation_email(db: Session, user: User, business: Business, raw_token: str) -> None:
    link = f"{get_settings().app_base_url}/accept-invitation?token={raw_token}"
    enqueue_email(
        db,
        to_email=user.email,
        subject=f"Confirm your access to {business.name}",
        body=f"Hello {user.full_name},\n\n{business.name} has a customer record for this email address. "
        f"Use this link to confirm it is yours and set your password (valid for 7 days):\n{link}\n\n"
        "If you did not expect this, you can ignore this email.\n",
        kind="auth.customer_invitation",
        user_id=user.id,
        business_id=business.id,
        sensitive=True,
    )


def issue_customer_invitation(db: Session, user: User, business: Business, profile: CustomerProfile) -> None:
    if profile.user_id is not None or profile.email.lower() != user.email.lower():
        return
    raw = _issue_token(db, user, "invite", profile.id)
    _send_invitation_email(db, user, business, raw)
    audit.record(
        db,
        "auth.invitation_issued",
        actor_user_id=user.id,
        business_id=business.id,
        entity_type="customer_profile",
        entity_id=profile.id,
    )


def register(db: Session, *, business_slug: str, full_name: str, email: str, password: str, client_ip: str) -> dict:
    limiter.check(f"register:{client_ip}|{email.strip().lower()}", *REGISTER_LIMIT)
    limiter.check(f"register-ip:{client_ip}", *REGISTER_IP_LIMIT)
    business = get_active_business_by_slug(db, business_slug)
    user = User(email=email, full_name=full_name, password_hash=hash_password(password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise AppError("EMAIL_ALREADY_REGISTERED", "This email is already registered", status_code=409)
    existing = db.scalar(
        select(CustomerProfile).where(CustomerProfile.business_id == business.id, CustomerProfile.email == email)
    )
    customer_id = None
    if existing is None:
        profile = CustomerProfile(business_id=business.id, user_id=user.id, name=full_name, email=email)
        db.add(profile)
        db.flush()
        customer_id = profile.id
    else:
        issue_customer_invitation(db, user, business, existing)
    audit.record(
        db,
        "auth.register",
        actor_user_id=user.id,
        actor_role="customer",
        business_id=business.id,
        entity_type="user",
        entity_id=user.id,
        after={"customer_profile_linked": customer_id is not None},
    )
    db.commit()
    return {"user_id": user.id, "customer_id": customer_id, "role": "customer"}


def login(db: Session, *, email: str, password: str, client_ip: str) -> dict:
    limiter.check(f"login:{client_ip}|{email.lower()}", *LOGIN_LIMIT)
    user = get_user_by_email(db, email)
    password_ok = verify_password(user.password_hash if user else None, password)
    if user is None or not password_ok or not user.is_active:
        audit.record(
            db,
            "auth.login_failed",
            actor_user_id=user.id if user else None,
            entity_type="user" if user else None,
            entity_id=user.id if user else None,
            after={"client_ip": client_ip},
        )
        db.commit()
        raise unauthenticated("Invalid email or password")
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    user.last_login_at = _now()
    contexts = list_contexts(db, user)
    active = default_context(contexts)
    audit.record(db, "auth.login", actor_user_id=user.id, entity_type="user", entity_id=user.id)
    db.commit()
    return {**build_session(user, active), "user": _user_payload(user), "contexts": contexts}


def switch_context(db: Session, user: User, request: SwitchContextRequest) -> dict:
    if request.context == "platform":
        if not user.is_platform_admin:
            raise AppError("FORBIDDEN", "Context not available", status_code=403)
        return build_session(user, {"type": "platform", "business_id": None})
    candidates = [c for c in list_contexts(db, user) if c["business_id"] == request.business_id]
    if request.type is not None:
        candidates = [c for c in candidates if c["type"] == request.type]
    if not candidates:
        raise AppError("FORBIDDEN", "Context not available", status_code=403)
    if len(candidates) > 1:
        raise AppError(
            "VALIDATION_ERROR",
            "Request validation failed",
            status_code=422,
            details=[{"field": "type", "message": "Required because this business offers more than one context"}],
        )
    chosen = candidates[0]
    if chosen["business_status"] == "suspended":
        raise AppError("BUSINESS_SUSPENDED", "This business is suspended", status_code=403)
    audit.record(
        db,
        "auth.context_switch",
        actor_user_id=user.id,
        actor_role=chosen["type"],
        business_id=chosen["business_id"],
        entity_type="user",
        entity_id=user.id,
    )
    db.commit()
    return build_session(user, chosen)


def join_business(db: Session, user: User, business_slug: str) -> dict:
    business = get_active_business_by_slug(db, business_slug)
    own = db.scalar(
        select(CustomerProfile).where(CustomerProfile.business_id == business.id, CustomerProfile.user_id == user.id)
    )
    if own is not None:
        return {"customer_id": own.id, "role": "customer"}
    existing = db.scalar(
        select(CustomerProfile).where(CustomerProfile.business_id == business.id, CustomerProfile.email == user.email)
    )
    customer_id = None
    if existing is None:
        profile = CustomerProfile(business_id=business.id, user_id=user.id, name=user.full_name, email=user.email)
        db.add(profile)
        db.flush()
        customer_id = profile.id
        audit.record(
            db,
            "auth.join_business",
            actor_user_id=user.id,
            actor_role="customer",
            business_id=business.id,
            entity_type="customer_profile",
            entity_id=profile.id,
        )
    else:
        issue_customer_invitation(db, user, business, existing)
    db.commit()
    return {"customer_id": customer_id, "role": "customer"}


def forgot_password(db: Session, *, email: str) -> None:
    limiter.check(f"reset:{email.lower()}", *RESET_REQUEST_LIMIT)
    user = get_user_by_email(db, email)
    if user is None or not user.is_active:
        return
    raw = _issue_token(db, user, "reset")
    _send_reset_email(db, user, raw)
    audit.record(db, "auth.password_reset_requested", actor_user_id=user.id, entity_type="user", entity_id=user.id)
    db.commit()


def _void_unused_tokens(db: Session, *conditions) -> None:
    db.execute(
        update(PasswordResetToken).where(PasswordResetToken.used_at.is_(None), *conditions).values(used_at=_now())
    )


def _field_required(field: str, message: str) -> AppError:
    return AppError(
        "VALIDATION_ERROR",
        "Request validation failed",
        status_code=422,
        details=[{"field": field, "message": message}],
    )


def reset_password(db: Session, *, token: str, new_password: str | None) -> dict:
    now = _now()
    token_hash = hash_opaque_token(token)
    owner_id = db.scalar(select(PasswordResetToken.user_id).where(PasswordResetToken.token_hash == token_hash))
    if owner_id is None:
        raise _invalid_token()
    user = db.scalar(select(User).where(User.id == owner_id).with_for_update())
    claimed = db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .values(used_at=now)
        .returning(PasswordResetToken.purpose, PasswordResetToken.customer_profile_id)
    ).first()
    if claimed is None:
        db.rollback()
        raise _invalid_token()

    def abort(error: AppError) -> AppError:
        db.rollback()
        return error

    if user is None or not user.is_active:
        raise abort(_invalid_token())
    is_reset = claimed.purpose == "reset"
    needs_password = is_reset or user.password_hash is None or user.email_verified_at is None
    if needs_password and new_password is None:
        message = "Required" if is_reset else "Required to activate this account"
        raise abort(_field_required("new_password", message))

    linked_profile = None
    if claimed.customer_profile_id is not None:
        linked_profile = db.scalar(
            select(CustomerProfile).where(CustomerProfile.id == claimed.customer_profile_id).with_for_update()
        )
        if (
            linked_profile is None
            or not linked_profile.is_active
            or linked_profile.email.lower() != user.email.lower()
            or linked_profile.user_id not in (None, user.id)
        ):
            raise abort(_invalid_token())
        linked_profile.user_id = user.id
        _void_unused_tokens(db, PasswordResetToken.customer_profile_id == linked_profile.id)

    password_changed = False
    if needs_password:
        user.password_hash = hash_password(new_password)
        user.token_version += 1
        password_changed = True
        _void_unused_tokens(db, PasswordResetToken.user_id == user.id, PasswordResetToken.purpose == "reset")
    if user.email_verified_at is None:
        user.email_verified_at = now

    action = "auth.invitation_accepted" if linked_profile is not None else (
        "auth.password_reset" if is_reset else "auth.account_activated"
    )
    audit.record(
        db,
        action,
        actor_user_id=user.id,
        business_id=linked_profile.business_id if linked_profile is not None else None,
        entity_type="customer_profile" if linked_profile is not None else "user",
        entity_id=linked_profile.id if linked_profile is not None else user.id,
        after={"password_changed": password_changed},
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _invalid_token()
    return {"message": "Password updated" if password_changed else "Invitation accepted", "password_changed": password_changed}


def change_password(db: Session, user: User, *, current_password: str, new_password: str, context_type: str, business_id) -> dict:
    limiter.check(f"change-password:{user.id}", *LOGIN_LIMIT)
    if not verify_password(user.password_hash, current_password):
        raise AppError(
            "VALIDATION_ERROR",
            "Request validation failed",
            status_code=422,
            details=[{"field": "current_password", "message": "Current password is incorrect"}],
        )
    user.password_hash = hash_password(new_password)
    user.token_version += 1
    _void_unused_tokens(db, PasswordResetToken.user_id == user.id, PasswordResetToken.purpose == "reset")
    audit.record(db, "auth.password_changed", actor_user_id=user.id, entity_type="user", entity_id=user.id)
    db.commit()
    token, expires_in = create_access_token(user.id, user.token_version, context_type, business_id)
    return {"access_token": token, "expires_in": expires_in}


def permissions_for(db: Session, role: str, membership_id: uuid.UUID | None) -> list[str]:
    explicit: list[str] = []
    if role == "business_staff" and membership_id is not None:
        explicit = list(db.scalars(select(StaffPermission.permission).where(StaffPermission.membership_id == membership_id)))
    return permissions.grants_for_role(role, explicit)


def issue_invite_token(db: Session, user: User) -> str:
    return _issue_token(db, user, "invite")


def void_unused_invites_without_profile(db: Session, user_id: uuid.UUID) -> None:
    _void_unused_tokens(
        db,
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.purpose == "invite",
        PasswordResetToken.customer_profile_id.is_(None),
    )
