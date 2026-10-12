"""Factory for creating swappable LLM providers based on environment configuration."""

from typing import Optional
from app.config import settings
from app.providers.base import LLMProvider
from app.providers.mock import MockLLMProvider
from app.providers.gemini import GeminiLLMProvider
from app.providers.vllm import VLLMLLMProvider


def get_llm_provider(provider_name: Optional[str] = None) -> LLMProvider:
    """Return an instantiated LLMProvider based on parameter or LLM_PROVIDER env var.

    Accepts: 'mock', 'gemini', 'vllm'.
    """
    target = (provider_name or settings.llm_provider).lower().strip()

    if target == "mock":
        return MockLLMProvider()
    elif target == "gemini":
        return GeminiLLMProvider()
    elif target == "vllm":
        return VLLMLLMProvider()
    else:
        raise ValueError(
            f"Unsupported LLM_PROVIDER: '{target}'. Supported providers are: mock, gemini, vllm"
        )
