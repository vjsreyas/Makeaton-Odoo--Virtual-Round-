import math
from dataclasses import dataclass
from typing import Any

from fastapi import Query
from sqlalchemy import asc, desc

from app.core.errors import AppError

MAX_PAGE_SIZE = 100


@dataclass(frozen=True)
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def page_params(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=MAX_PAGE_SIZE),
) -> PageParams:
    return PageParams(page=page, page_size=page_size)


def envelope(items: list[Any], total: int, params: PageParams) -> dict:
    return {
        "data": items,
        "meta": {
            "page": params.page,
            "page_size": params.page_size,
            "total": total,
            "total_pages": math.ceil(total / params.page_size) if total else 0,
        },
    }


def order_by(sort: str | None, allowed: dict[str, Any], default: str):
    value = sort or default
    descending = value.startswith("-")
    key = value.lstrip("-")
    column = allowed.get(key)
    if column is None:
        raise AppError(
            "VALIDATION_ERROR",
            "Request validation failed",
            status_code=422,
            details=[{"field": "sort", "message": f"Must be one of: {', '.join(sorted(allowed))} (prefix - for descending)"}],
        )
    return [desc(column) if descending else asc(column), asc(allowed["id"]) if "id" in allowed else asc(column)]
