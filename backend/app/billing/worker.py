import logging
import signal
import threading
import time

from app.core.config import get_settings
from app.core.db import check_db
from app.core.logging import configure_logging
from app.notifications.outbox import dispatch_pending

logger = logging.getLogger("app.billing.worker")


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
                check_db()
                logger.info("sweep tick: database reachable (billing not implemented yet)")
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
