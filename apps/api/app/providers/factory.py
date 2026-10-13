"""Factory for creating swappable LLM providers with Bring-Your-Own-Key (BYOK) support."""

from typing import Optional
from app.config import settings
from app.providers.base import LLMProvider
from app.providers.mock import MockLLMProvider
from app.providers.gemini import GeminiLLMProvider
from app.providers.openai import OpenAILLMProvider
from app.providers.vllm import VLLMLLMProvider


def get_llm_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    api_base: Optional[str] = None,
) -> LLMProvider:
    """Return an instantiated LLMProvider with optional user-supplied BYOK credentials.

    Accepts: 'mock', 'gemini', 'openai', 'vllm', 'amd_rocm'.
    """
    target = (provider_name or settings.llm_provider).lower().strip()

    if target == "mock":
        return MockLLMProvider()
    elif target == "gemini":
        return GeminiLLMProvider(api_key=api_key, model_name=model_name)
    elif target == "openai":
        return OpenAILLMProvider(api_key=api_key, model_name=model_name, api_base=api_base)
    elif target in ("vllm", "amd_rocm", "rocm"):
        return VLLMLLMProvider(api_base=api_base or "", model_name=model_name or "", api_key=api_key or "")
    else:
        raise ValueError(
            f"Unsupported LLM_PROVIDER: '{target}'. Supported providers are: gemini, openai, vllm (amd_rocm), mock."
        )
