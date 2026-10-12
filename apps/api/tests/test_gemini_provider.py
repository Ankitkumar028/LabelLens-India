"""Unit tests for GeminiLLMProvider with mocked HTTP responses."""

import json
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi import HTTPException

from app.models.extraction import LabelExtraction
from app.providers.gemini import GeminiLLMProvider


def test_clean_json_response_utility():
    """Verify markdown fences and text wrappers are stripped cleanly."""
    provider = GeminiLLMProvider(api_key="test_key")

    raw_fenced = '```json\n{"product_name": "Test Product", "confidence": 0.9}\n```'
    cleaned = provider._clean_json_response(raw_fenced)
    assert json.loads(cleaned)["product_name"] == "Test Product"

    raw_prefixed = 'Here is the extracted information:\n{"product_name": "Prefixed", "confidence": 0.95}'
    cleaned_prefixed = provider._clean_json_response(raw_prefixed)
    assert json.loads(cleaned_prefixed)["product_name"] == "Prefixed"


@pytest.mark.asyncio
async def test_gemini_missing_api_key_raises_http_503():
    """Provider without API key raises 503 Service Unavailable."""
    provider = GeminiLLMProvider(api_key="")
    with pytest.raises(HTTPException) as exc:
        await provider.extract(b"fake_image_bytes")
    assert exc.value.status_code == 503
    assert "GEMINI_API_KEY" in exc.value.detail


@pytest.mark.asyncio
async def test_gemini_successful_extraction_mocked():
    """Mock Gemini API 200 response and verify parsed LabelExtraction."""
    provider = GeminiLLMProvider(api_key="mock_valid_key")

    mock_gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps({
                                "product_name": "Real Alphonso Mango Juice",
                                "serving_size_g": 200.0,
                                "per_100g": {
                                    "energy_kcal": 55.0,
                                    "protein_g": 0.5,
                                    "carbohydrate_g": 13.0,
                                    "total_sugar_g": 12.0,
                                    "added_sugar_g": 8.0,
                                    "total_fat_g": 0.0,
                                    "saturated_fat_g": 0.0,
                                    "trans_fat_g": 0.0,
                                    "sodium_mg": 20.0,
                                    "fibre_g": 0.0,
                                },
                                "ingredients": ["Water", "Mango Pulp", "Sugar"],
                                "sugar_sources": ["Sugar"],
                                "fat_sources": [],
                                "allergens_declared": [],
                                "fssai_license_present": True,
                                "veg_nonveg_mark": "green",
                                "claims": ["100% Real Mango"],
                                "expiry_or_best_before_present": True,
                                "confidence": 0.98,
                                "unreadable_fields": [],
                            })
                        }
                    ]
                }
            }
        ]
    }

    mock_res = httpx.Response(status_code=200, json=mock_gemini_response)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_res
        result = await provider.extract(b"dummy_bytes", mime_type="image/jpeg")

    assert isinstance(result, LabelExtraction)
    assert result.product_name == "Real Alphonso Mango Juice"
    assert result.per_100g.total_sugar_g == 12.0
    assert result.veg_nonveg_mark == "green"


@pytest.mark.asyncio
async def test_gemini_rate_limit_raises_http_429():
    """Gemini 429 response maps to HTTPException 429 with helpful message."""
    provider = GeminiLLMProvider(api_key="mock_key")
    mock_res = httpx.Response(status_code=429, text="Resource exhausted")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_res
        with pytest.raises(HTTPException) as exc:
            await provider.extract(b"dummy_bytes")
        assert exc.value.status_code == 429
        assert "rate limit exceeded" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_gemini_health_check_status():
    """Health check reflects whether API key is configured."""
    unconfigured = GeminiLLMProvider(api_key="")
    h1 = await unconfigured.health_check()
    assert h1["status"] == "missing_api_key"
    assert not h1["configured"]

    configured = GeminiLLMProvider(api_key="actual_key")
    h2 = await configured.health_check()
    assert h2["status"] == "ready"
    assert h2["configured"]
