"""Application settings and environment configuration."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration loaded from environment or .env file."""

    # LLM Provider: "mock" | "gemini" | "vllm"
    llm_provider: str = "mock"

    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"
    log_level: str = "info"

    # Rules Engine
    rules_config_path: str = "config/rules.yaml"

    # Image upload limits
    max_image_size_mb: int = 8
    image_retention_hours: int = 24

    # Gemini API settings
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-lite-latest"

    # vLLM API settings
    vllm_api_base: str = "http://localhost:8001/v1"
    vllm_model: str = "Qwen/Qwen2.5-VL-7B-Instruct"

    # Storage
    database_url: str = "sqlite:///./scans.db"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def resolve_rules_path(self) -> Path:
        """Resolve the rules.yaml path whether running locally or inside Docker container."""
        # 1. Exact path if it exists
        candidate = Path(self.rules_config_path)
        if candidate.is_file():
            return candidate

        # 2. Relative to apps/api directory
        base_dir = Path(__file__).resolve().parent.parent
        candidate = base_dir / self.rules_config_path
        if candidate.is_file():
            return candidate

        # 3. In app root
        candidate = base_dir / "config" / "rules.yaml"
        if candidate.is_file():
            return candidate

        # 4. Project root config
        root_candidate = base_dir.parent.parent / "apps" / "api" / "config" / "rules.yaml"
        if root_candidate.is_file():
            return root_candidate

        raise FileNotFoundError(f"Could not find rules configuration at {self.rules_config_path}")


settings = Settings()
