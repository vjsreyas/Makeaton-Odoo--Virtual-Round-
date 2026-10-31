import datetime as dt
import uuid
from contextlib import contextmanager
from decimal import Decimal
from typing import Any, Iterator

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError

UNIQUE_MESSAGES = {
    "uq_product_variants_product_attribute_value": "This variant already exists for the product",
    "uq_customer_profiles_business_email": "A customer with this email already exists",
    "uq_subscriptions_business_number": "Subscription number already exists",
}


def ser(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dt.datetime):
        if value.tzinfo is not None:
            return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")
        return value.isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, dict):
        return {k: ser(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [ser(v) for v in value]
    return value


def raw_all(db: Session, sql: str, **params: Any) -> list[dict[str, Any]]:
    return [dict(r._mapping) for r in db.execute(text(sql), params)]


def raw_one(db: Session, sql: str, **params: Any) -> dict[str, Any] | None:
    row = db.execute(text(sql), params).first()
    return dict(row._mapping) if row else None


def all_(db: Session, sql: str, **params: Any) -> list[dict[str, Any]]:
    return [ser(r) for r in raw_all(db, sql, **params)]


def one(db: Session, sql: str, **params: Any) -> dict[str, Any] | None:
    row = raw_one(db, sql, **params)
    return ser(row) if row else None


def scalar(db: Session, sql: str, **params: Any) -> Any:
    return db.execute(text(sql), params).scalar()


def run(db: Session, sql: str, **params: Any) -> None:
    db.execute(text(sql), params)


def not_found(what: str = "Record") -> AppError:
    return AppError("NOT_FOUND", f"{what} not found", status_code=404)


def invalid(field: str, message: str) -> AppError:
    return AppError(
        "VALIDATION_ERROR",
        "Request validation failed",
        status_code=422,
        details=[{"field": field, "message": message}],
    )


@contextmanager
def guard(db: Session) -> Iterator[Session]:
    try:
        yield db
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        sqlstate = getattr(exc.orig, "sqlstate", None)
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None) or ""
        if sqlstate == "23505":
            raise AppError("CONFLICT", UNIQUE_MESSAGES.get(constraint, "A record with these values already exists"), status_code=409)
        if sqlstate == "23503":
            raise AppError("NOT_FOUND", "Referenced record not found", status_code=404)
        if sqlstate == "23514":
            raise AppError("VALIDATION_ERROR", "A value violates a business rule", status_code=422,
                           details=[{"field": constraint, "message": "A value violates a business rule"}])
        raise
    except BaseException:
        db.rollback()
        raise


def next_number(db: Session, business_id: uuid.UUID, kind: str, prefix: str) -> str:
    value = scalar(
        db,
        "UPDATE number_sequences SET next_value = next_value + 1 WHERE business_id = :b AND kind = :k RETURNING next_value - 1",
        b=business_id, k=kind,
    )
    if value is None:
        run(db, "INSERT INTO number_sequences (business_id, kind, next_value) VALUES (:b, :k, 2)", b=business_id, k=kind)
        value = 1
    return f"{prefix}-{int(value):06d}"


def patch_sql(table: str, fields: dict[str, Any], where: str) -> tuple[str, dict[str, Any]]:
    sets = ", ".join(f'"{k}" = :{k}' for k in fields)
    return f"UPDATE {table} SET {sets} WHERE {where}", fields
