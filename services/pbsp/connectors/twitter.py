"""X/Twitter connector — tweets, likes, bookmarks, and engagement via API v2."""

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

TWITTER_API = "https://api.twitter.com/2"


class TwitterConnector(BaseConnector):
    connector_id = "twitter"
    display_name = "X (Twitter)"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("TWITTER_CLIENT_ID", ""),
            client_secret=os.getenv("TWITTER_CLIENT_SECRET", ""),
            auth_url="https://twitter.com/i/oauth2/authorize",
            token_url="https://api.twitter.com/2/oauth2/token",
            scopes=[
                "tweet.read",
                "users.read",
                "like.read",
                "bookmark.read",
                "offline.access",
            ],
        ))
        self._access_token: str | None = None
        self._refresh_token: str | None = None
        self._token_expires: float = 0
        self._last_sync: float | None = None
        self._status = ConnectorStatus.DISCONNECTED
        self._user_id: str | None = None

    async def authenticate(self, credentials: dict) -> AuthResult:
        auth_code = credentials.get("auth_code")
        if auth_code:
            result = await self._oauth.exchange_code(auth_code)
            if result.success:
                self._access_token = result.access_token
                self._refresh_token = result.refresh_token
                self._token_expires = result.expires_at or 0
                self._status = ConnectorStatus.CONNECTED
                # Fetch user ID
                await self._fetch_user_id()
            return result

        url = self._oauth.get_authorization_url(state="twitter")
        return AuthResult(success=False, error=f"Visit to authorize: {url}")

    async def _fetch_user_id(self) -> None:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{TWITTER_API}/users/me",
                    headers={"Authorization": f"Bearer {self._access_token}"},
                    timeout=30,
                )
                if response.status_code == 200:
                    self._user_id = response.json().get("data", {}).get("id")
        except Exception:
            logger.debug("Failed to fetch Twitter user ID", exc_info=True)

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
        if not self._user_id:
            await self._fetch_user_id()
        if not self._user_id:
            logger.error("Cannot fetch Twitter data without user ID")
            return []

        self._status = ConnectorStatus.SYNCING
        events: list[BehavioralEvent] = []

        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self._access_token}"}

                # Recent tweets — reveals expression patterns
                params: dict = {
                    "max_results": 50,
                    "tweet.fields": "created_at,public_metrics,entities",
                }
                if since:
                    params["start_time"] = since.isoformat() + "Z"

                response = await client.get(
                    f"{TWITTER_API}/users/{self._user_id}/tweets",
                    params=params,
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for tweet in data.get("data", []):
                        metrics = tweet.get("public_metrics", {})
                        entities = tweet.get("entities", {})
                        hashtags = [h.get("tag", "") for h in entities.get("hashtags", [])]

                        events.append(BehavioralEvent(
                            type=MarkerType.SEARCH_QUERY,
                            source="twitter",
                            confidence=0.7,
                            context=EventContext(
                                app="X",
                                window_title=tweet.get("text", "")[:100],
                                domain="x.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "tweet",
                                "tweet_id": tweet.get("id"),
                                "created_at": tweet.get("created_at", ""),
                                "likes": metrics.get("like_count", 0),
                                "retweets": metrics.get("retweet_count", 0),
                                "replies": metrics.get("reply_count", 0),
                                "hashtags": hashtags[:10],
                            },
                        ))

                # Liked tweets — reveals content preferences
                response = await client.get(
                    f"{TWITTER_API}/users/{self._user_id}/liked_tweets",
                    params={"max_results": 50, "tweet.fields": "created_at,author_id,entities"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for tweet in data.get("data", []):
                        entities = tweet.get("entities", {})
                        hashtags = [h.get("tag", "") for h in entities.get("hashtags", [])]

                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="twitter",
                            confidence=0.65,
                            context=EventContext(
                                app="X",
                                window_title=tweet.get("text", "")[:100],
                                domain="x.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "liked",
                                "tweet_id": tweet.get("id"),
                                "author_id": tweet.get("author_id"),
                                "hashtags": hashtags[:10],
                            },
                        ))

                # Bookmarks — indicates intent to revisit (strong signal)
                response = await client.get(
                    f"{TWITTER_API}/users/{self._user_id}/bookmarks",
                    params={"max_results": 50, "tweet.fields": "created_at,entities"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for tweet in data.get("data", []):
                        entities = tweet.get("entities", {})
                        hashtags = [h.get("tag", "") for h in entities.get("hashtags", [])]
                        urls = [u.get("expanded_url", "") for u in entities.get("urls", [])]

                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="twitter",
                            confidence=0.8,
                            context=EventContext(
                                app="X",
                                window_title=tweet.get("text", "")[:100],
                                domain="x.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "bookmarked",
                                "tweet_id": tweet.get("id"),
                                "hashtags": hashtags[:10],
                                "urls": urls[:5],
                            },
                        ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Twitter sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Twitter sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
