"""Pytest configuration and shared fixtures."""

import io
import json
from pathlib import Path
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.models.extraction import LabelExtraction
from app.rules.engine import RulesEngine


@pytest.fixture(scope="session")
def rules_path() -> Path:
    return settings.resolve_rules_path()


@pytest.fixture(scope="session")
def rules_engine(rules_path: Path) -> RulesEngine:
    return RulesEngine(rules_path)


@pytest.fixture
def client(rules_engine: RulesEngine):
    app.state.rules_engine = rules_engine
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_jpeg_bytes() -> bytes:
    """Generate a valid in-memory JPEG image for testing upload endpoints."""
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.fixture
def sample_png_bytes() -> bytes:
    """Generate a valid in-memory PNG image."""
    img = Image.new("RGBA", (150, 150), color=(120, 200, 100, 255))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def fixtures_dir() -> Path:
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def load_fixture(fixtures_dir: Path):
    def _loader(filename: str) -> LabelExtraction:
        path = fixtures_dir / filename
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return LabelExtraction.model_validate(data)

    return _loader
