import base64
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings

PREFIX = "enc:v1:"
NONCE_BYTES = 12


class DecryptionError(Exception):
    pass


def _aesgcm() -> AESGCM:
    return AESGCM(base64.urlsafe_b64decode(get_settings().outbox_encryption_key))


def is_encrypted(stored: str) -> bool:
    return stored.startswith(PREFIX)


def encrypt_body(plaintext: str, aad: str) -> str:
    nonce = os.urandom(NONCE_BYTES)
    sealed = _aesgcm().encrypt(nonce, plaintext.encode(), aad.encode())
    return PREFIX + base64.urlsafe_b64encode(nonce + sealed).decode()


def decrypt_body(stored: str, aad: str) -> str:
    if not is_encrypted(stored):
        raise DecryptionError("body is not encrypted")
    try:
        blob = base64.urlsafe_b64decode(stored[len(PREFIX):])
        return _aesgcm().decrypt(blob[:NONCE_BYTES], blob[NONCE_BYTES:], aad.encode()).decode()
    except (InvalidTag, ValueError):
        raise DecryptionError("body could not be decrypted")
