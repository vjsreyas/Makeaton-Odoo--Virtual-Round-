import logging

from app.core.config import get_settings
from app.core.logging import configure_logging

logger = logging.getLogger("app.seed")


def run() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    if not settings.seed_demo:
        logger.info("demo seed skipped (SEED_DEMO is false)")
        return
    logger.warning("SEED_DEMO is true but no demo data is defined yet (WP-DEMO)")


if __name__ == "__main__":
    run()
