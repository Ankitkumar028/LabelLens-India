"""Gemini LLM Provider for food label extraction via Google AI Studio API."""

from typing import Any, Dict
from app.config import settings
from app.models.extraction import LabelExtraction
from app.providers.base import LLMProvider


class GeminiLLMProvider(LLMProvider):
    """Integrates with Google Gemini Vision API (free tier fallback)."""

    def __init__(self, api_key: str = "", model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key or settings.gemini_api_key
        self.model_name = model_name or settings.gemini_model

    @property
    def name(self) -> str:
        return "gemini"

    async def extract(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> LabelExtraction:
        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY environment variable is not set. Set GEMINI_API_KEY or use LLM_PROVIDER=mock."
            )
        # Detailed Gemini vision prompt & client logic will be expanded in Phase 3
        raise NotImplementedError("Gemini provider implementation is activated in Phase 3.")

    async def health_check(self) -> Dict[str, Any]:
        has_key = bool(self.api_key)
        return {
            "status": "ready" if has_key else "missing_api_key",
            "provider": self.name,
            "model": self.model_name,
            "configured": has_key,
        }
