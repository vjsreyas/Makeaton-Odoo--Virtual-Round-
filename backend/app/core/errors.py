import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_var

logger = logging.getLogger(__name__)

_STATUS_CODES = {
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    429: "RATE_LIMITED",
}


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []


def error_response(
    status_code: int, code: str, message: str, details: list[dict[str, Any]] | None = None
) -> JSONResponse:
    body = {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "request_id": request_id_var.get(),
        }
    }
    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {
                "field": ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "path")),
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        return error_response(422, "VALIDATION_ERROR", "Request validation failed", details)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _STATUS_CODES.get(exc.status_code, "HTTP_ERROR")
        return error_response(exc.status_code, code, str(exc.detail))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled exception")
        return error_response(500, "INTERNAL_ERROR", "Internal server error")
