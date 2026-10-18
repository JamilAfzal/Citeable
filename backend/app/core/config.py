from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Citeable API"
    environment: str = "development"  # development | production
    secret_key: str
    database_url: str = "sqlite+aiosqlite:///./citeable.db"
    auto_create_tables: bool = True  # dev only; use Alembic in production

    superadmin_email: str = "admin@citeable.com"
    superadmin_password: str = "Admin12345!"
    superadmin_name: str = "Super Admin"

    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "citeable-api"
    jwt_audience: str = "citeable-web"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    refresh_reuse_grace_seconds: int = 10

    verify_token_hours: int = 24
    reset_token_minutes: int = 30
    max_failed_logins: int = 5
    lockout_minutes: int = 15
    require_verified_email: bool = True

    frontend_url: str = "http://localhost:5173"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    google_client_id: str = ""

    email_backend: str = "console"  # console | resend
    resend_api_key: str = ""
    email_from: str = "Citeable <no-reply@example.com>"

    @field_validator("secret_key")
    @classmethod
    def _strong_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"
