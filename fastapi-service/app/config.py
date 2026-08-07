from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_provider: Literal["huggingface", "anthropic", "openai"] = "huggingface"

    hf_token: str | None = None
    hf_model: str = "deepseek-ai/DeepSeek-V3-0324"

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-5"

    agent_model: str = "claude-haiku-4-5-20251001"
    max_review_loops: int = 6

    openai_api_key: str | None = None
    openai_model: str = "gpt-4"

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8501"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
