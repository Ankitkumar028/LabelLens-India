"""Tests for swappable LLM providers and provider factory."""

import pytest
from app.providers.factory import get_llm_provider
from app.providers.mock import MockLLMProvider
from app.providers.gemini import GeminiLLMProvider
from app.providers.vllm import VLLMLLMProvider


def test_provider_factory_resolution():
    """Verify that factory resolves mock, gemini, and vllm correctly."""
    mock_p = get_llm_provider("mock")
    assert isinstance(mock_p, MockLLMProvider)
    assert mock_p.name == "mock"

    gemini_p = get_llm_provider("gemini")
    assert isinstance(gemini_p, GeminiLLMProvider)
    assert gemini_p.name == "gemini"

    vllm_p = get_llm_provider("vllm")
    assert isinstance(vllm_p, VLLMLLMProvider)
    assert vllm_p.name == "vllm"


def test_provider_factory_invalid_provider():
    """Factory must raise ValueError when given an unknown provider name."""
    with pytest.raises(ValueError, match="Unsupported LLM_PROVIDER"):
        get_llm_provider("non_existent_provider")


@pytest.mark.asyncio
async def test_mock_provider_extraction():
    """Mock provider extracts valid LabelExtraction matching Section 4 contract."""
    provider = MockLLMProvider()
    health = await provider.health_check()
    assert health["status"] == "ready"
    assert "presets_available" in health

    # Test default preset
    result = await provider.extract(b"dummy_bytes")
    assert result.product_name == "Choco Crunch Biscuits"
    assert result.per_100g is not None
    assert result.per_100g.energy_kcal == 480.0
    assert result.confidence > 0.9

    # Test explicit preset
    healthy_result = await provider.extract(b"dummy_bytes", preset="healthy_protein_muesli")
    assert healthy_result.product_name == "Organic Nut & Seed Muesli"
    assert healthy_result.per_100g.total_sugar_g == 4.5


@pytest.mark.asyncio
async def test_gemini_and_vllm_health_checks():
    """Gemini and vLLM health checks return provider status."""
    gemini_p = GeminiLLMProvider(api_key="")
    g_health = await gemini_p.health_check()
    assert g_health["status"] == "missing_api_key"
    assert g_health["provider"] == "gemini"

    vllm_p = VLLMLLMProvider(api_base="http://localhost:8001/v1", model_name="Qwen2.5-VL")
    v_health = await vllm_p.health_check()
    assert v_health["status"] in ("ready", "unreachable")
    assert v_health["provider"] == "vllm"

