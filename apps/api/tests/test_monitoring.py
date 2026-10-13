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
    assert 'labellens_pipeline_stage_requests_total{' in metrics_text
    assert 'labellens_scans_by_category_total{' in metrics_text


def test_marketing_analytics_and_event_ingestion(client):
    """Verify marketing events and demographic metrics recording."""
    # Post marketing event
    evt_res = client.post(
        "/api/analytics/event",
        json={"action": "view_landing", "metadata": {"language": "hi", "provider": "gemini"}},
    )
    assert evt_res.status_code == 200
    assert evt_res.json()["status"] == "recorded"

    # Verify metrics contain marketing dimensions
    metrics_res = client.get("/metrics")
    body = metrics_res.text
    assert "labellens_user_actions_total" in body
    assert "labellens_traffic_by_language_total" in body
    assert "labellens_users_total" in body
    assert "labellens_active_sessions_total" in body


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


def test_model_performance_metrics_exported(client, sample_jpeg_bytes: bytes):
    """Running scan and non-food checks exports model latency, quality, and rejection metrics."""
    res = client.post(
        "/api/analyze",
        data={"preset": "healthy_protein_muesli"},
        files={"file": ("muesli.jpg", sample_jpeg_bytes, "image/jpeg")},
    )
    assert res.status_code == 200

    metrics_res = client.get("/metrics")
    assert metrics_res.status_code == 200
    body = metrics_res.text

    assert "labellens_model_inference_duration_seconds" in body
    assert "labellens_model_confidence_score" in body
    assert "labellens_model_data_quality_total" in body
    assert "labellens_field_detection_total" in body
    assert "labellens_model_execution_total" in body
    assert "labellens_non_food_rejections_total" in body

