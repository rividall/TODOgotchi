from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://poringfield:changeme@db:5432/poringfield"

    # Auth / JWT
    SECRET_KEY: str = "CHANGE_ME_TO_LONG_RANDOM_STRING"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3004,https://porings.buenalynch.com"

    # App
    APP_NAME: str = "poringField"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # File uploads
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Admin key for machine-to-machine admin API (X-Admin-Key header)
    ADMIN_API_KEY: str = ""
    # Comma-separated emails granted in-app moderation access
    ADMIN_EMAILS: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def admin_emails(self) -> set[str]:
        return {e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()}

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
