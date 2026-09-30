from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str | None = None
    allowed_origins: str = "http://localhost:3000"
    api_rate_limit: str = "30/minute"
    material_max_file_size_bytes: int = 25 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> str:
        if isinstance(value, list):
            return ",".join(str(origin) for origin in value)
        return str(value)

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @field_validator("supabase_url")
    @classmethod
    def validate_supabase_url(cls, value: str) -> str:
        if not value.startswith("https://") and "localhost" not in value:
            raise ValueError("SUPABASE_URL harus menggunakan HTTPS di luar localhost.")
        return value.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()