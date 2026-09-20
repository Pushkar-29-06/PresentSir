from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    database_url: str = Field(min_length=1)
    redis_url: str = Field(min_length=1)
    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"

    access_token_minutes: int = Field(default=15, gt=0)
    refresh_token_days: int = Field(default=7, gt=0)

    cors_origins: str = "http://localhost:5173"

    api_port: int = 8000
    realtime_port: int = 8008

    enforce_lecture_time: bool = True
    start_early_minutes: int = 10
    qr_grace_steps: int = 1

    registration_window_minutes: int = Field(default=15, gt=0)

    rate_limit_requests: int = Field(default=10, gt=0)
    rate_limit_window_seconds: int = Field(default=60, gt=0)

    @field_validator("jwt_secret")
    @classmethod
    def reject_placeholder_secret(cls, value: str) -> str:
        if value in {"change-me", "PASTE_YOUR_GENERATED_SECRET_HERE"}:
            raise ValueError("JWT_SECRET must be replaced with a generated secret")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()