import re

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

MIN_LENGTH = 9
MAX_LENGTH = 128

_hasher = PasswordHasher()
_DUMMY_HASH = _hasher.hash("dummy-password-for-constant-time-checks")


def password_policy_error(password: str) -> str | None:
    if len(password) < MIN_LENGTH:
        return f"Must be at least {MIN_LENGTH} characters"
    if len(password) > MAX_LENGTH:
        return f"Must be at most {MAX_LENGTH} characters"
    if not re.search(r"[A-Z]", password):
        return "Must contain an uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Must contain a lowercase letter"
    if not re.search(r"[^A-Za-z0-9\s]", password):
        return "Must contain a special character"
    return None


def validate_password(password: str) -> str:
    error = password_policy_error(password)
    if error:
        raise ValueError(error)
    return password


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    if password_hash is None:
        try:
            _hasher.verify(_DUMMY_HASH, password)
        except VerificationError:
            pass
        return False
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)
