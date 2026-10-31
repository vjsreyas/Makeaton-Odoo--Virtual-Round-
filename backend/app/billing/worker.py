import logging
import signal
import threading
import time

from app.core.config import get_settings
from app.core.db import check_db
from app.core.logging import configure_logging
from app.billing.engine import run_billing, run_maintenance
from app.core.db import get_session_factory
from app.core.errors import AppError
from app.core.sql import raw_all
from app.notifications.outbox import dispatch_pending
from app.sales.service import local_today

logger = logging.getLogger("app.billing.worker")


def sweep() -> None:
    with get_session_factory()() as session:
        businesses = raw_all(session, "SELECT id, timezone FROM businesses WHERE status = 'active'")
    for business in businesses:
        today = local_today(business["timezone"])
        try:
            run_maintenance(business["id"], today)
            result = run_billing(business["id"], today, "scheduled")
            logger.info("scheduled billing run", extra={"business_id": str(business["id"]), "status": result["status"], "created": result["created_count"], "failed": result["failed_count"]})
        except AppError as exc:
            logger.info("scheduled billing skipped", extra={"business_id": str(business["id"]), "code": exc.code})
        except Exception:
            logger.exception("scheduled billing failed", extra={"business_id": str(business["id"])})


def run() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    stop = threading.Event()

    def _handle_signal(signum: int, _frame: object) -> None:
        logger.info("shutdown signal received", extra={"signal": signum})
        stop.set()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    sweep_interval = settings.billing_sweep_minutes * 60
    next_sweep = 0.0
    logger.info(
        "worker started",
        extra={"sweep_minutes": settings.billing_sweep_minutes, "outbox_poll_seconds": settings.outbox_poll_seconds},
    )

    while not stop.is_set():
        if time.monotonic() >= next_sweep:
            try:
                from types import SimpleNamespace
                from sqlalchemy import select
                from app.models import Business
                from app.core.db import get_session_factory
                from app.domain.billing import run_billing
                with get_session_factory()() as db:
                    businesses = list(db.scalars(select(Business).where(Business.status == "active")))
                    for business in businesses:
                        ctx = SimpleNamespace(user=None, business=business, business_id=business.id, role="system")
                        try:
                            result = run_billing(db, ctx, trigger="scheduled")
                            logger.info("billing sweep completed", extra={"business_id": str(business.id), "created": result["created_count"]})
                        except Exception:
                            db.rollback()
                            logger.exception("business billing sweep failed", extra={"business_id": str(business.id)})
            except Exception:
                logger.exception("sweep tick failed")
            next_sweep = time.monotonic() + sweep_interval
        try:
            delivered = dispatch_pending()
            if delivered:
                logger.info("emails delivered", extra={"count": delivered})
        except Exception:
            logger.exception("outbox dispatch failed")
        stop.wait(settings.outbox_poll_seconds)

    logger.info("worker stopped")


if __name__ == "__main__":
    run()
