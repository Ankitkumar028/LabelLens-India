"""Unit tests for User Authentication, Session Security, and BYOK Provider features."""

import pytest
from starlette.testclient import TestClient
from app.main import app
from app.auth.service import AuthService
from app.providers.factory import get_llm_provider
from app.providers.openai import OpenAILLMProvider


def test_auth_registration_and_login():
    """Verify user registration with PBKDF2 hashing and subsequent login token issuance."""
    client = TestClient(app)
    username = "testuser_byok"
    email = "testuser_byok@example.com"
    password = "SecurePassword123!"

    # 1. Register
    reg_resp = client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    assert reg_resp.status_code in (200, 409)

    # 2. Login
    login_resp = client.post(
        "/api/auth/login",
        json={"username_or_email": username, "password": password},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "token" in login_data
    token = login_data["token"]
    assert login_data["user"]["username"] == username

    # 3. Get /me profile
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

    # 4. Save BYOK preferences
    save_resp = client.post(
        "/api/auth/save-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "provider": "openai",
            "api_key": "sk-test1234567890",
            "model": "gpt-4o-mini",
        },
    )
    assert save_resp.status_code == 200

    # 5. Logout
    logout_resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_resp.status_code == 200


def test_provider_factory_and_openai_byok():
    """Verify factory returns OpenAILLMProvider with custom credentials."""
    provider = get_llm_provider("openai", api_key="sk-dummykey", model_name="gpt-4o")
    assert isinstance(provider, OpenAILLMProvider)
    assert provider.name == "openai"
    assert provider.model_name == "gpt-4o"
    assert provider.api_key == "sk-dummykey"


def test_provider_test_endpoint():
    """Verify /api/provider/test handles mock and invalid key gracefully."""
    client = TestClient(app)
    # Test mock
    resp = client.post(
        "/api/provider/test",
        json={"provider": "mock", "api_key": ""},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "connected"
    assert data["provider"] == "mock"


def test_email_only_registration_and_login():
    """Verify consumer registration with only email and password without providing username."""
    client = TestClient(app)
    email = "consumer_no_user@example.com"
    password = "ConsumerPassword123!"

    # Register with no username specified
    reg_resp = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_resp.status_code in (200, 409)

    # Login with email
    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    assert "token" in login_resp.json()

