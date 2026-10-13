"""Authentication models for secure user registration, session tokens, and BYOK storage."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, description="Unique username")
    email: str = Field(pattern=r"^[^@]+@[^@]+\.[^@]+$", description="User email address")
    password: str = Field(min_length=6, max_length=128, description="User password")


class LoginRequest(BaseModel):
    username_or_email: str = Field(min_length=3, description="Username or email")
    password: str = Field(min_length=1, description="Password")


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    created_at: str
    saved_byok: Optional[Dict[str, Any]] = None


class AuthResponse(BaseModel):
    user: UserOut
    token: str
    token_type: str = "Bearer"


class SaveByokRequest(BaseModel):
    provider: str = Field(description="gemini | openai | vllm | mock")
    api_key: Optional[str] = Field(default="", description="Personal API key")
    model: Optional[str] = Field(default="", description="Model name override")
    base_url: Optional[str] = Field(default="", description="Custom endpoint URL")


class TestProviderRequest(BaseModel):
    provider: str = Field(description="gemini | openai | vllm | mock")
    api_key: Optional[str] = Field(default="", description="API key to test")
    model: Optional[str] = Field(default="", description="Optional model to test")
    base_url: Optional[str] = Field(default="", description="Optional endpoint base URL")
