import logging

from fastapi import APIRouter

from app.core.db import check_db
from app.core.errors import AppError

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, dict[str, str]]:
    try:
        check_db()
    except Exception:
        logger.exception("health check: database unreachable")
        raise AppError("SERVICE_UNAVAILABLE", "Database unavailable", status_code=503)
    return {"data": {"status": "ok", "database": "ok"}}
