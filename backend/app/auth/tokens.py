import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import get_settings
from app.core.errors import AppError

ALGORITHM = "HS256"
ISSUER = "brightloop"
RESET_TOKEN_TTL = timedelta(minutes=60)
INVITE_TOKEN_TTL = timedelta(days=7)


@dataclass(frozen=True)
class TokenClaims:
    user_id: uuid.UUID
    token_version: int
    context_type: str
    business_id: uuid.UUID | None


def create_access_token(user_id: uuid.UUID, token_version: int, context_type: str, business_id: uuid.UUID | None) -> tuple[str, int]:
    settings = get_settings()
    expires_in = settings.jwt_expires_minutes * 60
    now = datetime.now(timezone.utc)
    payload = {
        "iss": ISSUER,
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        "tv": token_version,
        "ctx": context_type,
        "bid": str(business_id) if business_id else None,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM), expires_in


def unauthenticated(message: str = "Authentication required") -> AppError:
    return AppError("UNAUTHENTICATED", message, status_code=401, headers={"WWW-Authenticate": "Bearer"})


def decode_access_token(token: str) -> TokenClaims:
    try:
        payload = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            options={"require": ["exp", "iat", "sub", "iss"]},
        )
        business_id = payload.get("bid")
        return TokenClaims(
            user_id=uuid.UUID(payload["sub"]),
            token_version=int(payload["tv"]),
            context_type=str(payload["ctx"]),
            business_id=uuid.UUID(business_id) if business_id else None,
        )
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        raise unauthenticated("Invalid or expired token")


def generate_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def hash_opaque_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
