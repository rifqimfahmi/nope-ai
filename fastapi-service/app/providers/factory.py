from app.config import Settings, get_settings
from app.providers.anthropic_provider import AnthropicProvider
from app.providers.base import LLMProvider
from app.providers.huggingface import HuggingFaceProvider
from app.providers.openai_provider import OpenAIProvider


def get_provider(settings: Settings | None = None) -> LLMProvider:
    settings = settings or get_settings()

    if settings.llm_provider == "huggingface":
        if not settings.hf_token:
            raise RuntimeError("HF_TOKEN is required when LLM_PROVIDER=huggingface")
        return HuggingFaceProvider(token=settings.hf_token, model=settings.hf_model)

    if settings.llm_provider == "anthropic":
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic")
        return AnthropicProvider(api_key=settings.anthropic_api_key, model=settings.anthropic_model)

    if settings.llm_provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
        return OpenAIProvider(api_key=settings.openai_api_key, model=settings.openai_model)

    raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
