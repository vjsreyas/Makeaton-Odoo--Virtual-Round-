import base64
import binascii
import ipaddress
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore", case_sensitive=False)

    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str = Field(..., description="SQLAlchemy URL, e.g. postgresql+psycopg://...")
    app_base_url: str = "http://localhost:5173"
    default_timezone: str = "Asia/Kolkata"
    billing_sweep_minutes: int = Field(60, ge=1)
    smtp_host: str = "mailpit"
    smtp_port: int = 1025
    smtp_from: str = "no-reply@brightloop.local"
    jwt_secret: str
    jwt_expires_minutes: int = Field(480, ge=1)
    rate_limit_enabled: bool = True
    seed_demo: bool = False
    outbox_poll_seconds: int = Field(5, ge=1)
    outbox_encryption_key: str
    trusted_proxies: str = ""

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_is_strong(cls, value: str) -> str:
        if len(value) < 32 or value.upper().startswith("CHANGE_ME"):
            raise ValueError("JWT_SECRET must be at least 32 characters and not the example placeholder")
        return value

    @field_validator("outbox_encryption_key")
    @classmethod
    def outbox_key_is_valid(cls, value: str) -> str:
        try:
            raw = base64.urlsafe_b64decode(value)
        except (binascii.Error, ValueError):
            raise ValueError("OUTBOX_ENCRYPTION_KEY must be URL-safe base64")
        if len(raw) != 32:
            raise ValueError("OUTBOX_ENCRYPTION_KEY must decode to exactly 32 bytes")
        return value

    @field_validator("trusted_proxies")
    @classmethod
    def trusted_proxies_are_networks(cls, value: str) -> str:
        for entry in (e.strip() for e in value.split(",") if e.strip()):
            try:
                network = ipaddress.ip_network(entry, strict=False)
            except ValueError:
                raise ValueError(f"TRUSTED_PROXIES entry {entry!r} is not an IP address or CIDR")
            if network.prefixlen == 0:
                raise ValueError("TRUSTED_PROXIES must not trust every address")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
