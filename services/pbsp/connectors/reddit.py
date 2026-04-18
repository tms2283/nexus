"""Reddit connector — subreddits, posts, comments, and saved content via API."""

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

REDDIT_API = "https://oauth.reddit.com"


class RedditConnector(BaseConnector):
    connector_id = "reddit"
    display_name = "Reddit"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("REDDIT_CLIENT_ID", ""),
            client_secret=os.getenv("REDDIT_CLIENT_SECRET", ""),
            auth_url="https://www.reddit.com/api/v1/authorize",
            token_url="https://www.reddit.com/api/v1/access_token",
            scopes=[
                "identity",
                "history",
                "saved",
                "mysubreddits",
            ],
        ))
        self._access_token: str | None = None
        self._refresh_token: str | None = None
        self._token_expires: float = 0
        self._last_sync: float | None = None
        self._status = ConnectorStatus.DISCONNECTED
        self._username: str | None = None

    async def authenticate(self, credentials: dict) -> AuthResult:
        auth_code = credentials.get("auth_code")
        if auth_code:
            result = await self._oauth.exchange_code(auth_code)
            if result.success:
                self._access_token = result.access_token
                self._refresh_token = result.refresh_token
                self._token_expires = result.expires_at or 0
                self._status = ConnectorStatus.CONNECTED
                # Fetch username
                await self._fetch_username()
            return result

        url = self._oauth.get_authorization_url(state="reddit")
        return AuthResult(success=False, error=f"Visit to authorize: {url}")

    async def _fetch_username(self) -> None:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{REDDIT_API}/api/v1/me",
                    headers={"User-Agent": "PBSP/1.0", "Authorization": f"Bearer {self._access_token}"},
                    timeout=30,
                )
                if response.status_code == 200:
                    self._username = response.json().get("name")
        except Exception:
            logger.debug("Failed to fetch Reddit username", exc_info=True)

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
        if not self._username:
            await self._fetch_username()
        if not self._username:
            logger.error("Cannot fetch Reddit data without username")
            return []

        self._status = ConnectorStatus.SYNCING
        events: list[BehavioralEvent] = []

        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "User-Agent": "PBSP/1.0",
                    "Authorization": f"Bearer {self._access_token}",
                }

                # User's submitted posts — reveals interests and engagement
                response = await client.get(
                    f"{REDDIT_API}/user/{self._username}/submitted",
                    params={"limit": 50, "sort": "new"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for post in data.get("data", {}).get("children", []):
                        post_data = post.get("data", {})
                        subreddit = post_data.get("subreddit", "")
                        title = post_data.get("title", "")[:100]

                        events.append(BehavioralEvent(
                            type=MarkerType.SEARCH_QUERY,
                            source="reddit",
                            confidence=0.75,
                            context=EventContext(
                                app="Reddit",
                                window_title=title,
                                domain="reddit.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "posted",
                                "subreddit": subreddit,
                                "post_id": post_data.get("id"),
                                "score": post_data.get("score", 0),
                                "comments": post_data.get("num_comments", 0),
                                "created_utc": post_data.get("created_utc", 0),
                            },
                        ))

                # User's comments — reveals engagement patterns
                response = await client.get(
                    f"{REDDIT_API}/user/{self._username}/comments",
                    params={"limit": 50, "sort": "new"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for comment in data.get("data", {}).get("children", []):
                        comment_data = comment.get("data", {})
                        subreddit = comment_data.get("subreddit", "")
                        body = comment_data.get("body", "")[:100]

                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="reddit",
                            confidence=0.7,
                            context=EventContext(
                                app="Reddit",
                                window_title=body,
                                domain="reddit.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "commented",
                                "subreddit": subreddit,
                                "comment_id": comment_data.get("id"),
                                "score": comment_data.get("score", 0),
                                "created_utc": comment_data.get("created_utc", 0),
                            },
                        ))

                # Saved content — indicates intent to revisit (strong signal)
                response = await client.get(
                    f"{REDDIT_API}/user/{self._username}/saved",
                    params={"limit": 50},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", {}).get("children", []):
                        item_data = item.get("data", {})
                        item_type = item.get("kind", "")
                        subreddit = item_data.get("subreddit", "")
                        title = item_data.get("title", "") or item_data.get("body", "")
                        title = title[:100]

                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="reddit",
                            confidence=0.85,
                            context=EventContext(
                                app="Reddit",
                                window_title=title,
                                domain="reddit.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "saved",
                                "item_type": item_type,
                                "subreddit": subreddit,
                                "item_id": item_data.get("id"),
                                "created_utc": item_data.get("created_utc", 0),
                            },
                        ))

                # Subscribed subreddits — reveals topic interests
                response = await client.get(
                    f"{REDDIT_API}/subreddits/mine/subscriber",
                    params={"limit": 100},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    subreddits = [sub.get("data", {}).get("display_name", "")
                                 for sub in data.get("data", {}).get("children", [])]

                    if subreddits:
                        events.append(BehavioralEvent(
                            type=MarkerType.TOPIC_LOOP,
                            source="reddit",
                            confidence=0.8,
                            context=EventContext(
                                app="Reddit",
                                domain="reddit.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "subreddit_list",
                                "subreddits": subreddits[:50],
                                "count": len(subreddits),
                            },
                        ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Reddit sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Reddit sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
