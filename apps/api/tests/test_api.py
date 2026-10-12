"""Tests for FastAPI endpoints: /api/analyze and /api/scans/{id}."""

import io
from fastapi.testclient import TestClient


def test_analyze_endpoint_with_valid_image(client: TestClient, sample_jpeg_bytes: bytes):
    """POST /api/analyze with valid image returns 200 and complete AnalysisResult."""
    files = {"file": ("label.jpg", sample_jpeg_bytes, "image/jpeg")}
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    assert "scan_id" in data
    assert "score" in data
    assert "red_flags" in data
    assert "extraction" in data
    assert data["disclaimer"] == "Informational only, not medical advice."
    assert data["score"]["value"] >= 0
    assert data["score"]["grade"] in ("GREEN", "AMBER", "RED")
    assert data["processing_time_ms"] > 0

    # Retrieve via GET /api/scans/{id}
    scan_id = data["scan_id"]
    get_res = client.get(f"/api/scans/{scan_id}")
    assert get_res.status_code == 200
    assert get_res.json()["scan_id"] == scan_id


def test_analyze_endpoint_with_preset_selection(client: TestClient, sample_png_bytes: bytes):
    """POST /api/analyze supporting mock preset selection for frontend / e2e tests."""
    files = {"file": ("muesli.png", sample_png_bytes, "image/png")}
    data_payload = {"preset": "healthy_protein_muesli"}
    response = client.post("/api/analyze", files=files, data=data_payload)
    assert response.status_code == 200

    data = response.json()
    assert data["product_name"] == "Organic Nut & Seed Muesli"
    assert data["score"]["grade"] == "GREEN"


def test_analyze_empty_file_returns_400(client: TestClient):
    """POST /api/analyze with empty file returns 400 Bad Request."""
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_analyze_corrupt_file_returns_400(client: TestClient):
    """POST /api/analyze with non-image payload returns 400 Bad Request."""
    files = {"file": ("fake.jpg", b"not-an-image-payload", "image/jpeg")}
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "invalid image" in response.json()["detail"].lower()


def test_get_nonexistent_scan_returns_404(client: TestClient):
    """GET /api/scans/{id} with unknown ID returns 404 Not Found."""
    response = client.get("/api/scans/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
