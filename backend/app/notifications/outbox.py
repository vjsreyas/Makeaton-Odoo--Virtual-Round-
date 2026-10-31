import logging
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_session_factory
from app.models import Notification
from app.notifications.crypto import DecryptionError, decrypt_body, encrypt_body, is_encrypted

logger = logging.getLogger("app.notifications")

MAX_ATTEMPTS = 5
RETRY_DELAYS = [timedelta(seconds=30), timedelta(minutes=2), timedelta(minutes=10), timedelta(hours=1)]
BATCH_SIZE = 20
REDACTED_BODY = "[redacted after delivery]"
SECRET_BEARING_PREFIX = "auth."


def enqueue_email(
    db: Session,
    *,
    to_email: str,
    subject: str,
    body: str,
    kind: str,
    user_id=None,
    business_id=None,
    sensitive: bool = False,
) -> Notification:
    notification_id = uuid.uuid4()
    stored_body = encrypt_body(body, _aad(notification_id, to_email, kind)) if sensitive else body
    notification = Notification(
        id=notification_id,
        channel="email",
        kind=kind,
        to_email=to_email,
        subject=subject,
        body=stored_body,
        user_id=user_id,
        business_id=business_id,
    )
    db.add(notification)
    return notification


def _aad(notification_id, to_email: str | None, kind: str) -> str:
    return f"{notification_id}|{to_email}|{kind}"


def read_body(notification: Notification) -> str:
    if is_encrypted(notification.body):
        return decrypt_body(notification.body, _aad(notification.id, notification.to_email, notification.kind))
    return notification.body


def _send(notification: Notification) -> None:
    settings = get_settings()
    body = read_body(notification)
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = notification.to_email
    message["Subject"] = notification.subject or ""
    message.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.send_message(message)


def _scrub(notification: Notification) -> None:
    if notification.kind.startswith(SECRET_BEARING_PREFIX):
        notification.body = REDACTED_BODY


def dispatch_pending(db: Session | None = None) -> int:
    owns_session = db is None
    session = db or get_session_factory()()
    delivered = 0
    try:
        now = datetime.now(timezone.utc)
        rows = session.scalars(
            select(Notification)
            .where(
                Notification.channel == "email",
                Notification.status == "pending",
                or_(Notification.next_attempt_at.is_(None), Notification.next_attempt_at <= now),
            )
            .order_by(Notification.created_at)
            .limit(BATCH_SIZE)
            .with_for_update(skip_locked=True)
        ).all()
        for notification in rows:
            notification.attempts += 1
            try:
                _send(notification)
            except DecryptionError:
                notification.last_error = "DecryptionError: body could not be decrypted"
                notification.status = "failed"
                _scrub(notification)
                logger.error("email body could not be decrypted", extra={"notification_id": str(notification.id)})
            except Exception as exc:
                notification.last_error = f"{type(exc).__name__}: {exc}"[:500]
                if notification.attempts >= MAX_ATTEMPTS:
                    notification.status = "failed"
                    _scrub(notification)
                else:
                    delay = RETRY_DELAYS[min(notification.attempts - 1, len(RETRY_DELAYS) - 1)]
                    notification.next_attempt_at = now + delay
                logger.warning(
                    "email delivery failed",
                    extra={"notification_id": str(notification.id), "attempts": notification.attempts},
                )
            else:
                notification.status = "sent"
                notification.sent_at = now
                notification.last_error = None
                _scrub(notification)
                delivered += 1
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        if owns_session:
            session.close()
    return delivered
