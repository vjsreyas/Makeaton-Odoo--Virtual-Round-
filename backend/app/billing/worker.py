import logging
import signal
import threading

from app.core.config import get_settings
from app.core.db import check_db
from app.core.logging import configure_logging

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

    interval = settings.billing_sweep_minutes * 60
    logger.info("worker started", extra={"sweep_minutes": settings.billing_sweep_minutes})

    while not stop.is_set():
        try:
            check_db()
            logger.info("sweep tick: database reachable (billing not implemented yet)")
        except Exception:
            logger.exception("sweep tick failed")
        stop.wait(interval)

    logger.info("worker stopped")


if __name__ == "__main__":
    run()
