"""OpenAI Vision Provider supporting Bring-Your-Own-Key (BYOK) with GPT-4o / GPT-4o-mini."""

import base64
import json
import re
from typing import Any, Dict, Optional
import httpx
from fastapi import HTTPException, status

from app.models.extraction import LabelExtraction
from app.providers.base import LLMProvider
from app.providers.gemini import EXTRACTION_SYSTEM_PROMPT


class OpenAILLMProvider(LLMProvider):
    """Integrates with OpenAI Vision API (GPT-4o, GPT-4o-mini) for food label extraction."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        api_base: Optional[str] = None,
    ):
        self.api_key = (api_key or "").strip()
        self.model_name = model_name or "gpt-4o-mini"
        self.api_base = (api_base or "https://api.openai.com/v1").rstrip("/")
        self.timeout_seconds = 45.0

    @property
    def name(self) -> str:
        return "openai"

    @staticmethod
    def _clean_json_response(raw_text: str) -> str:
        """Strip markdown fences (```json ... ```) or prefix text."""
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if match:
            return match.group(1).strip()
        return cleaned.strip()

    async def extract(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> LabelExtraction:
        """Extract food label data using OpenAI GPT-4o vision."""
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenAI API key is missing. Please provide your OpenAI API key in AI Settings.",
            )

        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{base64_image}"

        url = f"{self.api_base}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": EXTRACTION_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all packaged food label information in strict JSON matching the schema.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": data_uri,
                                "detail": "high",
                            },
                        },
                    ],
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 1500,
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="OpenAI request timed out while processing image.",
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to connect to OpenAI endpoint: {str(e)}",
                )

        if response.status_code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid OpenAI API key. Please check your key in AI Settings.",
            )
        elif response.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="OpenAI rate limit or quota exceeded. Please check your OpenAI account billing.",
            )
        elif response.status_code != 200:
            error_msg = response.text[:200]
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API error ({response.status_code}): {error_msg}",
            )

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned an empty response.",
            )

        raw_content = choices[0].get("message", {}).get("content", "")
        cleaned_json = self._clean_json_response(raw_content)

        try:
            parsed = json.loads(cleaned_json)
            return LabelExtraction.model_validate(parsed)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse OpenAI JSON output: {str(e)}",
            )

    async def health_check(self) -> Dict[str, Any]:
        """Check provider configuration and test connection."""
        has_key = bool(self.api_key)
        return {
            "status": "ready" if has_key else "missing_api_key",
            "provider": self.name,
            "model": self.model_name,
            "configured": has_key,
        }
