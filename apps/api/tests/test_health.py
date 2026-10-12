"""Tests for /health and /metrics endpoints."""

from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Verify /health returns 200, correct service name, and healthy provider details."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "labellens-api"
    assert data["version"] == "1.0.0"
    assert "llm_provider" in data
    assert "provider_details" in data
    assert data["provider_details"]["status"] == "ready"


def test_metrics_endpoint(client: TestClient):
    """Verify /metrics returns Prometheus metric indicators."""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_request_duration_seconds" in response.text
