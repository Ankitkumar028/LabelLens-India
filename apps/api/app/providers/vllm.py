"""vLLM Provider running on AMD GPU droplet with ROCm (Qwen2.5-VL-7B-Instruct)."""

from typing import Any, Dict
from app.config import settings
from app.models.extraction import LabelExtraction
from app.providers.base import LLMProvider


class VLLMLLMProvider(LLMProvider):
    """Integrates with OpenAI-compatible vLLM server running on AMD MI300X."""

    def __init__(self, api_base: str = "", model_name: str = ""):
        self.api_base = api_base or settings.vllm_api_base
        self.model_name = model_name or settings.vllm_model

    @property
    def name(self) -> str:
        return "vllm"

    async def extract(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> LabelExtraction:
        # Full vLLM inference client wired in Phase 5 on AMD droplet
        raise NotImplementedError("vLLM provider implementation is activated in Phase 5 on GPU droplet.")

    async def health_check(self) -> Dict[str, Any]:
        return {
            "status": "ready",
            "provider": self.name,
            "api_base": self.api_base,
            "model": self.model_name,
        }
