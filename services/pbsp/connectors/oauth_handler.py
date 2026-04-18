"""Generic OAuth2 flow handler for all platform connectors.

Manages authorization URL generation, auth code exchange, token storage,
and automatic refresh.  Each connector provides its own client_id,
client_secret, scopes, and endpoint URLs.
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from connectors.base import AuthResult
from storage.encryption import EncryptionManager

logger = logging.getLogger(__name__)


@dataclass
class OAuthConfig:
    client_id: str
    client_secret: str
    auth_url: str
    token_url: str
    scopes: list[str]
    redirect_uri: str = "http://127.0.0.1:8002/api/oauth/callback"


class OAuthHandler:
    """Handles the OAuth2 authorization code flow."""

    def __init__(self, config: OAuthConfig, encryption: EncryptionManager | None = None) -> None:
        self.config = config
        self.encryption = encryption

    def get_authorization_url(self, state: str = "") -> str:
        """Generate the URL the user should visit to authorize the app."""
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.config.scopes),
            "access_type": "offline",
            "prompt": "consent",
        }
        if state:
            params["state"] = state

        return f"{self.config.auth_url}?{urlencode(params)}"

    async def exchange_code(self, auth_code: str) -> AuthResult:
        """Exchange an authorization code for access + refresh tokens."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.config.token_url,
                    data={
                        "grant_type": "authorization_code",
                        "code": auth_code,
                        "redirect_uri": self.config.redirect_uri,
                        "client_id": self.config.client_id,
                        "client_secret": self.config.client_secret,
                    },
                    timeout=30,
                )

            if response.status_code != 200:
                return AuthResult(
                    success=False,
                    error=f"Token exchange failed: {response.status_code} {response.text}",
                )

            data = response.json()
            expires_in = data.get("expires_in", 3600)

            return AuthResult(
                success=True,
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                expires_at=time.time() + expires_in,
            )
        except Exception as e:
            return AuthResult(success=False, error=str(e))

    async def refresh_access_token(self, refresh_token: str) -> AuthResult:
        """Use a refresh token to get a new access token."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.config.token_url,
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                        "client_id": self.config.client_id,
                        "client_secret": self.config.client_secret,
                    },
                    timeout=30,
                )

            if response.status_code != 200:
                return AuthResult(
                    success=False,
                    error=f"Token refresh failed: {response.status_code}",
                )

            data = response.json()
            expires_in = data.get("expires_in", 3600)

            return AuthResult(
                success=True,
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token", refresh_token),
                expires_at=time.time() + expires_in,
            )
        except Exception as e:
            return AuthResult(success=False, error=str(e))

    def encrypt_token(self, token: str) -> bytes | None:
        """Encrypt a token for database storage."""
        if self.encryption and self.encryption.is_initialized:
            return self.encryption.encrypt(token)
        return token.encode("utf-8")

    def decrypt_token(self, encrypted: bytes) -> str:
        """Decrypt a token from database storage."""
        if self.encryption and self.encryption.is_initialized:
            return self.encryption.decrypt_str(encrypted)
        return encrypted.decode("utf-8")
