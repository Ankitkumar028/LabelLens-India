"""vLLM Provider running on AMD GPU droplet with ROCm (Qwen2.5-VL-7B-Instruct)."""

import base64
import json
import re
from typing import Any, Dict, Optional
import httpx
from fastapi import HTTPException, status

from app.config import settings
from app.models.extraction import LabelExtraction
from app.providers.base import LLMProvider

VLLM_EXTRACTION_PROMPT = """You are an expert food safety analyst specializing in Indian packaged food labelling regulations (FSSAI).
Analyze the packaging image and output a strict JSON object with this exact contract:
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

CRITICAL RULES:
1. Output null for any nutrient or field not visibly declared on the label. Never guess. Missing = red flag.
2. List all ingredients in the exact sequence declared on the packaging.
3. Identify all sugar aliases (maltodextrin, invert syrup, liquid glucose, dextrose, jaggery, etc.).
4. Identify all fat sources, particularly hydrogenated vegetable fat, vanaspati, or palmolein.
5. Check for 14-digit FSSAI license number and green/brown veg logo.
"""


class VLLMLLMProvider(LLMProvider):
    """Integrates with OpenAI-compatible vLLM server running on AMD MI300X with ROCm."""

    def __init__(self, api_base: str = "", model_name: str = "", api_key: str = ""):
        self.api_base = (api_base or settings.vllm_api_base).rstrip("/")
        self.model_name = model_name or settings.vllm_model or "Qwen/Qwen2.5-VL-7B-Instruct"
        self.api_key = api_key or ""
        self.timeout_seconds = 60.0

    @property
    def name(self) -> str:
        return "vllm"

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
        """Send image to vLLM OpenAI-compatible vision completion endpoint."""
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{base64_image}"

        url = f"{self.api_base}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VLLM_EXTRACTION_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_uri}},
                    ],
                }
            ],
            "temperature": 0.1,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
            except httpx.ConnectError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Cannot connect to vLLM server at {self.api_base}. Ensure the AMD GPU droplet or container is running.",
                )
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="vLLM vision model inference timed out.",
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"vLLM server error: {str(e)}",
                )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"vLLM returned HTTP {response.status_code}: {response.text}",
            )

        data = response.json()
        try:
            choices = data.get("choices", [])
            if not choices:
                raise ValueError("No choices returned by vLLM.")
            message_content = choices[0].get("message", {}).get("content", "")
            cleaned = self._clean_json_response(message_content)
            parsed = json.loads(cleaned)
            return LabelExtraction.model_validate(parsed)
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to parse vLLM output into extraction model: {str(err)}",
            )

    async def health_check(self) -> Dict[str, Any]:
        """Check if vLLM instance is responding and model is loaded."""
        health_url = f"{self.api_base}/models"
        is_ready = False
        models_available = []

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(health_url)
                if res.status_code == 200:
                    is_ready = True
                    data = res.json()
                    models_available = [m.get("id") for m in data.get("data", [])]
        except Exception:
            pass

        return {
            "status": "ready" if is_ready else "unreachable",
            "provider": self.name,
            "api_base": self.api_base,
            "model": self.model_name,
            "models_available": models_available,
        }
