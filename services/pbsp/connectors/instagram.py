"""Instagram connector — media engagement, saved posts, and interests via Instagram Basic Display API."""

from __future__ import annotations

import os
import time
import logging
from datetime import datetime

import httpx

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from connectors.oauth_handler import OAuthHandler, OAuthConfig
from core.schemas import BehavioralEvent, EventContext, MarkerType, DomainCategory, ConnectorStatus

logger = logging.getLogger(__name__)

INSTAGRAM_API = "https://graph.instagram.com"


class InstagramConnector(BaseConnector):
    connector_id = "instagram"
    display_name = "Instagram"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("INSTAGRAM_APP_ID", os.getenv("FACEBOOK_APP_ID", "")),
            client_secret=os.getenv("INSTAGRAM_APP_SECRET", os.getenv("FACEBOOK_APP_SECRET", "")),
            auth_url="https://api.instagram.com/oauth/authorize",
            token_url="https://api.instagram.com/oauth/access_token",
            scopes=[
                "user_profile",
                "user_media",
            ],
        ))
        self._access_token: str | None = None
        self._token_expires: float = 0
        self._last_sync: float | None = None
        self._status = ConnectorStatus.DISCONNECTED

    async def authenticate(self, credentials: dict) -> AuthResult:
        auth_code = credentials.get("auth_code")
        if auth_code:
            result = await self._oauth.exchange_code(auth_code)
            if result.success:
                self._access_token = result.access_token
                self._token_expires = result.expires_at or 0
                self._status = ConnectorStatus.CONNECTED
                # Exchange for long-lived token
                await self._exchange_long_lived_token()
            return result

        url = self._oauth.get_authorization_url(state="instagram")
        return AuthResult(success=False, error=f"Visit to authorize: {url}")

    async def _exchange_long_lived_token(self) -> None:
        """Exchange short-lived token for a 60-day long-lived token."""
        if not self._access_token:
            return
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{INSTAGRAM_API}/access_token",
                    params={
                        "grant_type": "ig_exchange_token",
                        "client_secret": self._oauth.config.client_secret,
                        "access_token": self._access_token,
                    },
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    self._access_token = data.get("access_token", self._access_token)
                    self._token_expires = time.time() + data.get("expires_in", 5184000)
        except Exception:
            logger.debug("Failed to exchange for long-lived token", exc_info=True)

    async def _ensure_token(self) -> bool:
        if self._access_token and time.time() < self._token_expires - 86400:
            return True
        # Try to refresh long-lived token
        if self._access_token:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{INSTAGRAM_API}/refresh_access_token",
                        params={
                            "grant_type": "ig_refresh_token",
                            "access_token": self._access_token,
                        },
                        timeout=30,
                    )
                    if response.status_code == 200:
                        data = response.json()
                        self._access_token = data.get("access_token", self._access_token)
                        self._token_expires = time.time() + data.get("expires_in", 5184000)
                        return True
            except Exception:
                pass
        self._status = ConnectorStatus.ERROR
        return False

    async def fetch_data(self, since: datetime | None = None) -> list[BehavioralEvent]:
        if not await self._ensure_token():
            return []

        self._status = ConnectorStatus.SYNCING
        events: list[BehavioralEvent] = []

        try:
            async with httpx.AsyncClient() as client:
                # Get user's media
                response = await client.get(
                    f"{INSTAGRAM_API}/me/media",
                    params={
                        "fields": "id,caption,media_type,timestamp,permalink",
                        "limit": 50,
                        "access_token": self._access_token,
                    },
                    timeout=30,
                )

                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", []):
                        media_type = item.get("media_type", "IMAGE")
                        caption = item.get("caption", "")
                        posted_at = item.get("timestamp", "")

                        # Extract hashtags from caption
                        hashtags = []
                        if caption:
                            hashtags = [
                                word.lstrip("#")
                                for word in caption.split()
                                if word.startswith("#")
                            ][:10]

                        events.append(BehavioralEvent(
                            type=MarkerType.SEARCH_QUERY,
                            source="instagram",
                            confidence=0.7,
                            context=EventContext(
                                app="Instagram",
                                window_title=f"Post ({media_type.lower()})",
                                domain="instagram.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "posted",
                                "media_id": item.get("id"),
                                "media_type": media_type,
                                "hashtags": hashtags,
                                "has_caption": bool(caption),
                                "caption_length": len(caption) if caption else 0,
                                "timestamp": posted_at,
                            },
                        ))

                # Get user profile info
                response = await client.get(
                    f"{INSTAGRAM_API}/me",
                    params={
                        "fields": "id,username,media_count",
                        "access_token": self._access_token,
                    },
                    timeout=30,
                )

                if response.status_code == 200:
                    profile = response.json()
                    events.append(BehavioralEvent(
                        type=MarkerType.DAILY_PATTERN,
                        source="instagram",
                        confidence=0.6,
                        context=EventContext(
                            app="Instagram",
                            window_title="Profile Stats",
                            domain="instagram.com",
                            domain_category=DomainCategory.SOCIAL,
                        ),
                        metadata={
                            "action": "profile_stats",
                            "username": profile.get("username", ""),
                            "media_count": profile.get("media_count", 0),
                        },
                    ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Instagram sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Instagram sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
