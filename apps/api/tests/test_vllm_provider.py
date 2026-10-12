"""Unit tests for VLLMLLMProvider with mocked HTTP endpoints."""

import json
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi import HTTPException

from app.models.extraction import LabelExtraction
from app.providers.vllm import VLLMLLMProvider


def test_vllm_clean_json_response():
    """Verify vLLM markdown code blocks are properly stripped."""
    provider = VLLMLLMProvider(api_base="http://localhost:8001/v1")
    raw = "```json\n{\"product_name\": \"Muesli\", \"confidence\": 0.95}\n```"
    cleaned = provider._clean_json_response(raw)
    assert json.loads(cleaned)["product_name"] == "Muesli"


@pytest.mark.asyncio
async def test_vllm_successful_extraction_mocked():
    """Mock vLLM OpenAI-compatible response and parse into LabelExtraction."""
    provider = VLLMLLMProvider(api_base="http://localhost:8001/v1")

    mock_vllm_response = {
        "id": "chatcmpl-mock-vllm-rocm",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": json.dumps({
                        "product_name": "Qwen Extracted Oats",
                        "serving_size_g": 40.0,
                        "per_100g": {
                            "energy_kcal": 400.0,
                            "protein_g": 12.0,
                            "carbohydrate_g": 65.0,
                            "total_sugar_g": 1.0,
                            "added_sugar_g": 0.0,
                            "total_fat_g": 8.0,
                            "saturated_fat_g": 1.5,
                            "trans_fat_g": 0.0,
                            "sodium_mg": 10.0,
                            "fibre_g": 10.0,
                        },
                        "ingredients": ["Rolled Oats"],
                        "sugar_sources": [],
                        "fat_sources": [],
                        "allergens_declared": [],
                        "fssai_license_present": True,
                        "veg_nonveg_mark": "green",
                        "claims": ["High Fibre"],
                        "expiry_or_best_before_present": True,
                        "confidence": 0.99,
                        "unreadable_fields": [],
                    }),
                }
            }
        ],
    }

    mock_res = httpx.Response(status_code=200, json=mock_vllm_response)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_res
        result = await provider.extract(b"dummy_bytes", mime_type="image/jpeg")

    assert isinstance(result, LabelExtraction)
    assert result.product_name == "Qwen Extracted Oats"
    assert result.per_100g.protein_g == 12.0
    assert result.veg_nonveg_mark == "green"


@pytest.mark.asyncio
async def test_vllm_connection_error_raises_503():
    """When vLLM server is unreachable, provider raises 503 Service Unavailable."""
    provider = VLLMLLMProvider(api_base="http://192.0.2.1:8000/v1")

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        with pytest.raises(HTTPException) as exc:
            await provider.extract(b"dummy_bytes")
        assert exc.value.status_code == 503
        assert "Cannot connect to vLLM" in exc.value.detail


@pytest.mark.asyncio
async def test_vllm_health_check():
    """Verify vLLM health check against models endpoint."""
    provider = VLLMLLMProvider(api_base="http://localhost:8001/v1")
    mock_models_response = {
        "data": [{"id": "Qwen/Qwen2.5-VL-7B-Instruct"}]
    }

    mock_res = httpx.Response(status_code=200, json=mock_models_response)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_res
        h = await provider.health_check()

    assert h["status"] == "ready"
    assert "Qwen/Qwen2.5-VL-7B-Instruct" in h["models_available"]
