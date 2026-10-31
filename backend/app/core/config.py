from functools import lru_cache

from pydantic import Field
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


@lru_cache
def get_settings() -> Settings:
    return Settings()
