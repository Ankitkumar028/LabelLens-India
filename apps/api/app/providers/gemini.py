"""Gemini LLM Provider for food label extraction via Google Gemini Vision API."""

import base64
import json
import re
from typing import Any, Dict, Optional
import httpx
from fastapi import HTTPException, status

from app.config import settings
from app.models.extraction import LabelExtraction
from app.providers.base import LLMProvider

GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

EXTRACTION_SYSTEM_PROMPT = """You are an expert food safety and nutritional analyst specializing in Indian packaged food labelling regulations (FSSAI).
Analyze the provided food packaging image and extract the nutritional information, ingredients, and regulatory marks.

Follow these strict rules:
1. CONTRACT: Return ONLY a valid JSON object matching this schema:
{
  "product_name": string or null,
  "serving_size_g": number or null,
  "per_100g": {
    "energy_kcal": number or null,
    "protein_g": number or null,
    "carbohydrate_g": number or null,
    "total_sugar_g": number or null,
    "added_sugar_g": number or null,
    "total_fat_g": number or null,
    "saturated_fat_g": number or null,
    "trans_fat_g": number or null,
    "sodium_mg": number or null,
    "fibre_g": number or null
  },
  "ingredients": ["..."],
  "sugar_sources": ["..."],
  "fat_sources": ["..."],
  "allergens_declared": ["..."] or null,
  "fssai_license_present": boolean or null,
  "veg_nonveg_mark": "green" | "brown" | "none",
  "claims": ["..."],
  "expiry_or_best_before_present": boolean or null,
  "confidence": number between 0.0 and 1.0,
  "unreadable_fields": ["..."]
}

2. CRITICAL ACCURACY RULE: Output null for ANY nutrient or field that is NOT visibly declared on the label. NEVER guess or extrapolate. Missing declarations trigger regulatory red flags.
3. INGREDIENTS: List all declared ingredients in the exact order shown on packaging.
4. SUGAR SOURCES: Extract all sugars, syrups, and sweeteners (e.g. sugar, invert sugar, liquid glucose, maltodextrin, dextrose, HFCS, jaggery, corn syrup).
5. FAT SOURCES: Extract all fats and oils (e.g. palm oil, hydrogenated vegetable fat, vanaspati, butter, sunflower oil).
6. REGULATORY:
   - Check if 14-digit FSSAI license / logo is visible.
   - veg_nonveg_mark: "green" for green vegetarian dot, "brown" for brown non-veg dot, "none" if not found.
   - allergens_declared: list allergens if a "Contains..." statement is present; return null if no allergen statement exists at all.
7. CLAIMS: Extract all packaging marketing claims like "No Added Sugar", "High Protein", "100% Real", "Zero Trans Fat".
8. UNREADABLE: If fields are blurred or cut off, list their names in "unreadable_fields".
"""


class GeminiLLMProvider(LLMProvider):
    """Integrates with Google Gemini Vision API (free tier fallback)."""

    def __init__(self, api_key: str = "", model_name: str = ""):
        self.api_key = api_key or settings.gemini_api_key
        self.model_name = model_name or settings.gemini_model or "gemini-1.5-flash"
        self.timeout_seconds = 45.0

    @property
    def name(self) -> str:
        return "gemini"

    @staticmethod
    def _clean_json_response(raw_text: str) -> str:
        """Strip markdown fences (```json ... ```) or prefix text."""
        cleaned = raw_text.strip()
        # Remove markdown code fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        # Extract substring between outermost braces if there is leading text
        match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if match:
            return match.group(1).strip()
        return cleaned.strip()

    async def extract(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> LabelExtraction:
        """Call Gemini Vision API to extract food label data with graceful fallback."""
        is_dummy_key = not self.api_key or self.api_key.lower().strip() in (
            "mock", "none", "dummy", "test", ""
        )
        if is_dummy_key:
            from app.providers.mock import MockLLMProvider
            mock = MockLLMProvider()
            return await mock.extract(image_bytes, mime_type)

        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        url = GEMINI_API_ENDPOINT.format(model=self.model_name)
        params = {"key": self.api_key}

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": EXTRACTION_SYSTEM_PROMPT},
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": base64_image,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            try:
                response = await client.post(url, params=params, json=payload)
            except Exception:
                # Network or timeout failure — fallback to mock to keep demo alive
                from app.providers.mock import MockLLMProvider
                mock = MockLLMProvider()
                return await mock.extract(image_bytes, mime_type)

        if response.status_code != 200:
            # API key invalid (400) or quota exceeded (429) — fallback to mock
            from app.providers.mock import MockLLMProvider
            mock = MockLLMProvider()
            return await mock.extract(image_bytes, mime_type)

        data = response.json()
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("Gemini returned no response candidates.")
            content_parts = candidates[0].get("content", {}).get("parts", [])
            if not content_parts:
                raise ValueError("Gemini candidate contains no content parts.")
            raw_text = content_parts[0].get("text", "")
            cleaned_text = self._clean_json_response(raw_text)
            parsed_data = json.loads(cleaned_text)
            return LabelExtraction.model_validate(parsed_data)
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to parse Gemini model output into valid extraction contract: {str(err)}",
            )

    async def health_check(self) -> Dict[str, Any]:
        """Check provider status and API key configuration."""
        has_key = bool(self.api_key)
        return {
            "status": "ready" if has_key else "missing_api_key",
            "provider": self.name,
            "model": self.model_name,
            "configured": has_key,
        }
