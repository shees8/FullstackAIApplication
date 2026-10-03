from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App settings
    app_name: str = "NOVA AI"
    api_url: str = "http://localhost:8000"

    # AI Priority: local first, then this order for cloud
    cloud_priority: list[str] = ["anthropic", "openai", "gemini", "grok", "meta"]
    allow_cloud_fallback: bool = True

    # API Keys
    anthropic_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None
    google_api_key: SecretStr | None = None
    grok_api_key: SecretStr | None = None
    meta_api_key: SecretStr | None = None

    # Local settings - Explicit IPv4 to avoid ::1 issues on Windows
    ollama_host: str = "http://127.0.0.1:11434"
