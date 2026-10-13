"""Cryptographically secure user authentication service with PBKDF2-HMAC-SHA256."""

from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
import secrets
from typing import Any, Dict, Optional, Tuple
import uuid

from fastapi import HTTPException, status

from app.auth.database import get_db_connection, init_auth_db
from app.auth.models import UserOut


class AuthService:
    """Manages user registration, password verification, session issuance, and BYOK storage."""

    def __init__(self):
        init_auth_db()

    @staticmethod
    def hash_password(password: str) -> Tuple[str, str]:
        """Generate a random 16-byte salt and hash using PBKDF2-HMAC-SHA256 with 120,000 iterations."""
        salt = os.urandom(16).hex()
        pwd_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120000,
        ).hex()
        return pwd_hash, salt

    @staticmethod
    def verify_password(password: str, expected_hash: str, salt: str) -> bool:
        """Verify password using constant-time comparison against timing attacks."""
        candidate_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120000,
        ).hex()
        return secrets.compare_digest(candidate_hash, expected_hash)

    def register(self, username: Optional[str], email: str, password: str) -> Tuple[UserOut, str]:
        """Register a new user account and generate an active session token."""
        clean_email = email.strip().lower()
        if not clean_email or "@" not in clean_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide a valid email address.",
            )

        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Check unique email
            cursor.execute(
                "SELECT id FROM users WHERE LOWER(email) = ?",
                (clean_email,),
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists. Please sign in instead.",
                )

            # Determine clean username
            if username and username.strip():
                clean_user = username.strip()
            else:
                clean_user = clean_email.split("@")[0]

            # Ensure username is unique; if taken, append a short random suffix
            cursor.execute("SELECT id FROM users WHERE LOWER(username) = ?", (clean_user.lower(),))
            if cursor.fetchone():
                clean_user = f"{clean_user}_{secrets.token_hex(2)}"

            user_id = str(uuid.uuid4())
            pwd_hash, salt = self.hash_password(password)
            created_at = datetime.now(timezone.utc).isoformat()

            cursor.execute(
                """
                INSERT INTO users (id, username, email, password_hash, salt, created_at, saved_byok)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, clean_user, clean_email, pwd_hash, salt, created_at, None),
            )

            token = self._create_session(cursor, user_id)
            conn.commit()

        user_out = UserOut(
            id=user_id,
            username=clean_user,
            email=clean_email,
            created_at=created_at,
            saved_byok=None,
        )
        return user_out, token

    def login(self, username_or_email: str, password: str) -> Tuple[UserOut, str]:
        """Authenticate user credentials and issue a session token."""
        identifier = username_or_email.strip().lower()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, username, email, password_hash, salt, created_at, saved_byok
                FROM users
                WHERE LOWER(email) = ? OR LOWER(username) = ?
                """,
                (identifier, identifier),
            )

            row = cursor.fetchone()
            if not row or not self.verify_password(password, row["password_hash"], row["salt"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password. Please verify your credentials.",
                )

            user_id = row["id"]
            token = self._create_session(cursor, user_id)
            conn.commit()

            saved_byok = None
            if row["saved_byok"]:
                try:
                    saved_byok = json.loads(row["saved_byok"])
                except Exception:
                    pass

            user_out = UserOut(
                id=user_id,
                username=row["username"],
                email=row["email"],
                created_at=row["created_at"],
                saved_byok=saved_byok,
            )
            return user_out, token

    def get_user_by_token(self, token: str) -> Optional[UserOut]:
        """Retrieve user for an active session token."""
        if not token:
            return None

        clean_token = token.replace("Bearer ", "").strip()
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT u.id, u.username, u.email, u.created_at, u.saved_byok
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ? AND s.expires_at > ?
                """,
                (clean_token, now_iso),
            )
            row = cursor.fetchone()
            if not row:
                return None

            saved_byok = None
            if row["saved_byok"]:
                try:
                    saved_byok = json.loads(row["saved_byok"])
                except Exception:
                    pass

            return UserOut(
                id=row["id"],
                username=row["username"],
                email=row["email"],
                created_at=row["created_at"],
                saved_byok=saved_byok,
            )

    def save_byok(self, user_id: str, byok_data: Dict[str, Any]) -> None:
        """Save user's custom BYOK preferences."""
        # Sanitize data
        clean_data = {
            "provider": byok_data.get("provider", "gemini"),
            "model": byok_data.get("model", ""),
            "base_url": byok_data.get("base_url", ""),
            "has_key": bool(byok_data.get("api_key")),
        }
        # If API key is provided, store it masked or for user session
        if byok_data.get("api_key"):
            clean_data["api_key"] = byok_data["api_key"]

        json_str = json.dumps(clean_data)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET saved_byok = ? WHERE id = ?",
                (json_str, user_id),
            )
            conn.commit()

    def logout(self, token: str) -> None:
        """Invalidate the session token."""
        clean_token = token.replace("Bearer ", "").strip()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE token = ?", (clean_token,))
            conn.commit()

    @staticmethod
    def _create_session(cursor, user_id: str) -> str:
        """Create a 30-day session token."""
        token = secrets.token_hex(32)
        created_at = datetime.now(timezone.utc).isoformat()
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        cursor.execute(
            """
            INSERT INTO sessions (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (token, user_id, expires_at, created_at),
        )
        return token
