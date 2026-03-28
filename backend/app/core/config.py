from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    sentinel_env: str = "dev"

    database_url: str

    jwt_secret: str
    jwt_issuer: str = "sentinel"
    access_token_expires_minutes: int = 1440  # 24h — single admin, homelab

    frontend_origin: str = "http://localhost:3020"

    stale_threshold_minutes: int = 5
    result_retention_count: int = 1000


settings = Settings()
