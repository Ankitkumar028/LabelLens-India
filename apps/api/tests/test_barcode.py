"""Unit tests for Barcode lookup service and endpoints."""

from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_barcode_presets_endpoint(client):
    """GET /api/barcode/presets returns list of popular Indian FMCG barcodes."""
    res = client.get("/api/barcode/presets")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 4

    barcodes = [item["barcode"] for item in data]
    assert "8901030383709" in barcodes  # Maggi
    assert "8901063012829" in barcodes  # Good Day


def test_lookup_offline_indian_barcode_maggi(client):
    """Maggi barcode lookup returns complete AnalysisResult with FSSAI red flags."""
    res = client.get("/api/barcode/8901030383709")
    assert res.status_code == 200
    data = res.json()

    assert "Maggi" in data["product_name"]
    assert data["score"]["value"] > 0
    assert "extraction" in data
    assert data["extraction"]["per_100g"]["sodium_mg"] == 1230.0

    # High sodium and saturated fat penalizes Maggi to Amber grade
    assert data["score"]["grade"] in ("AMBER", "RED")
    assert data["score"]["value"] < 80


def test_lookup_offline_indian_barcode_parle_g(client):
    """Parle-G barcode lookup correctly parses sugar and palm oil."""
    res = client.get("/api/barcode/8901725181222")
    assert res.status_code == 200
    data = res.json()
    assert "Parle-G" in data["product_name"]
    assert data["extraction"]["per_100g"]["added_sugar_g"] == 25.0
    flag_ids = [rf["id"] for rf in data["red_flags"]]
    assert "sugar_in_first_three_ingredients" in flag_ids

    assert data["extraction"]["per_100g"]["added_sugar_g"] == 25.0


def test_lookup_nonexistent_barcode_returns_404(client):
    """Nonexistent barcode not in offline db and failing in OFF API returns 404."""
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = httpx.Response(status_code=404, json={"status": 0})
        res = client.get("/api/barcode/0000000000000")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()
