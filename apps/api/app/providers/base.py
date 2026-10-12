"""Abstract Base Class for swappable LLM Providers."""

from abc import ABC, abstractmethod
from typing import Any, Dict
from app.models.extraction import LabelExtraction


class LLMProvider(ABC):
    """Base interface for AI vision extraction models.

    Supported providers: 'mock', 'gemini', 'vllm'.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier."""
        pass

    @abstractmethod
    async def extract(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> LabelExtraction:
        """Extract structured nutrition and label information from an image.

        Must return a valid LabelExtraction model following Section 4 extraction contract.
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check availability and readiness of the provider."""
        pass
