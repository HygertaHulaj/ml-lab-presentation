from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(BACKEND_DIR / ".env", BACKEND_DIR.parent / ".env"),
                                      env_prefix="MLLAB_", extra="ignore")

    app_name: str = "ML Learning Lab API"
    database_url: str = "postgresql+asyncpg://mllab:mllab@localhost:5432/mllab"
    # Create tables on startup (used for SQLite tests / quick demos). Production uses Alembic.
    auto_create_tables: bool = False
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    # optional extra origins as a regular expression, e.g. https://.*\.netlify\.app for the online version
    cors_origin_regex: str | None = None
    storage_dir: Path = BACKEND_DIR / "storage"

    max_upload_mb: float = 5.0
    max_rows: int = 100_000
    max_columns: int = 100
    max_concurrent_trainings: int = 2
    training_timeout_s: float = 120.0
    model_cache_size: int = 32


@lru_cache
def get_settings() -> Settings:
    return Settings()
