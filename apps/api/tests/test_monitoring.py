"""Tests for Prometheus metrics, alert rules, and observability."""

from pathlib import Path
import yaml
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_metrics_endpoint_exports_prometheus_format(client):
    """GET /metrics returns Prometheus format with registered LabelLens metrics."""
    # First trigger /health to generate request counter
    client.get("/health")

    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    body = response.text

    assert "http_requests_total" in body
    assert "http_request_duration_seconds" in body
    assert "labellens_scans_total" in body
    assert "labellens_red_flags_total" in body


def test_scan_increments_observability_metrics(client, sample_jpeg_bytes: bytes):
    """Running an analysis increments Prometheus scan and red flag counters."""
    # Run scan
    res = client.post(
        "/api/analyze",
        data={"preset": "hidden_sugar_cereal"},
        files={"file": ("cereal.jpg", sample_jpeg_bytes, "image/jpeg")},
    )
    assert res.status_code == 200


    # Inspect /metrics
    metrics_res = client.get("/metrics")
    assert metrics_res.status_code == 200
    metrics_text = metrics_res.text

    assert 'labellens_scans_total{' in metrics_text
    assert 'labellens_red_flags_total{' in metrics_text


def test_prometheus_alert_rules_yaml_validity():
    """Verify Prometheus alert rules YAML can be parsed and contains required alerts."""
    rules_path = Path(__file__).resolve().parent.parent.parent.parent / "infra" / "monitoring" / "prometheus" / "alert_rules.yml"
    if not rules_path.exists():
        pytest.skip("infra directory not mounted in container image")

    with open(rules_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)


    assert "groups" in data
    group = data["groups"][0]
    rule_names = [r["alert"] for r in group["rules"]]

    assert "APIInstanceDown" in rule_names
    assert "HighRequestLatency" in rule_names
    assert "High5xxErrorRate" in rule_names
    assert "CriticalFSSAIRedFlagSpike" in rule_names
