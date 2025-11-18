from functools import lru_cache

from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application-wide configuration settings."""

    app_name: str = "Urban Simulator"
    env: str = "dev"
    api_key: str | None = None

    class Config:
        env_prefix = "URBAN_SIM_"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
