"""YouTube connector — watch history, search history, and engagement via YouTube Data API v3."""

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

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


class YouTubeConnector(BaseConnector):
    connector_id = "youtube"
    display_name = "YouTube"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("YOUTUBE_CLIENT_ID", ""),
            client_secret=os.getenv("YOUTUBE_CLIENT_SECRET", ""),
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=[
                "https://www.googleapis.com/auth/youtube.readonly",
            ],
        ))
        self._access_token: str | None = None
        self._refresh_token: str | None = None
        self._token_expires: float = 0
        self._last_sync: float | None = None
        self._status = ConnectorStatus.DISCONNECTED

    async def authenticate(self, credentials: dict) -> AuthResult:
        auth_code = credentials.get("auth_code")
        if auth_code:
            result = await self._oauth.exchange_code(auth_code)
            if result.success:
                self._access_token = result.access_token
                self._refresh_token = result.refresh_token
                self._token_expires = result.expires_at or 0
                self._status = ConnectorStatus.CONNECTED
            return result

        # Return auth URL for the user to visit
        url = self._oauth.get_authorization_url(state="youtube")
        return AuthResult(success=False, error=f"Visit to authorize: {url}")

    async def _ensure_token(self) -> bool:
        if self._access_token and time.time() < self._token_expires - 300:
            return True
        if self._refresh_token:
            result = await self._oauth.refresh_access_token(self._refresh_token)
            if result.success:
                self._access_token = result.access_token
                self._token_expires = result.expires_at or 0
                return True
        self._status = ConnectorStatus.ERROR
        return False

    async def fetch_data(self, since: datetime | None = None) -> list[BehavioralEvent]:
        if not await self._ensure_token():
            return []

        self._status = ConnectorStatus.SYNCING
        events: list[BehavioralEvent] = []

        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self._access_token}"}

                # Liked videos — indicates strong interest
                response = await client.get(
                    f"{YOUTUBE_API_BASE}/videos",
                    params={"part": "snippet", "myRating": "like", "maxResults": 50},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        snippet = item.get("snippet", {})
                        published = snippet.get("publishedAt", "")
                        events.append(BehavioralEvent(
                            type=MarkerType.SEARCH_QUERY,
                            source="youtube",
                            confidence=0.8,
                            context=EventContext(
                                app="YouTube",
                                window_title=snippet.get("title", ""),
                                domain="youtube.com",
                                domain_category=DomainCategory.ENTERTAINMENT,
                            ),
                            metadata={
                                "action": "liked",
                                "video_id": item.get("id"),
                                "channel": snippet.get("channelTitle", ""),
                                "category": snippet.get("categoryId", ""),
                                "tags": snippet.get("tags", [])[:10],
                            },
                        ))

                # Subscriptions — indicates ongoing interests
                response = await client.get(
                    f"{YOUTUBE_API_BASE}/subscriptions",
                    params={"part": "snippet", "mine": True, "maxResults": 50},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        snippet = item.get("snippet", {})
                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="youtube",
                            confidence=0.7,
                            context=EventContext(
                                app="YouTube",
                                window_title=snippet.get("title", ""),
                                domain="youtube.com",
                                domain_category=DomainCategory.ENTERTAINMENT,
                            ),
                            metadata={
                                "action": "subscribed",
                                "channel_id": snippet.get("resourceId", {}).get("channelId"),
                                "channel": snippet.get("title", ""),
                                "description": snippet.get("description", "")[:200],
                            },
                        ))

                # Search history via YouTube Activities
                response = await client.get(
                    f"{YOUTUBE_API_BASE}/activities",
                    params={"part": "snippet,contentDetails", "mine": True, "maxResults": 50},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        snippet = item.get("snippet", {})
                        activity_type = snippet.get("type", "")
                        if activity_type in ("upload", "playlistItem", "like", "favorite"):
                            events.append(BehavioralEvent(
                                type=MarkerType.SEARCH_QUERY,
                                source="youtube",
                                confidence=0.75,
                                context=EventContext(
                                    app="YouTube",
                                    window_title=snippet.get("title", ""),
                                    domain="youtube.com",
                                    domain_category=DomainCategory.ENTERTAINMENT,
                                ),
                                metadata={
                                    "action": activity_type,
                                    "published_at": snippet.get("publishedAt"),
                                },
                            ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("YouTube sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("YouTube sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
