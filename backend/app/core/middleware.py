import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import request_id_var

logger = logging.getLogger("app.request")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        inbound = request.headers.get("x-request-id", "")
        request_id = inbound if 0 < len(inbound) <= 64 and inbound.isprintable() else uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
            logger.info(
                "request",
                extra={"method": request.method, "path": request.url.path, "duration_ms": elapsed_ms},
            )
            request_id_var.reset(token)
        response.headers["X-Request-ID"] = request_id
        return response
