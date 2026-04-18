"""Facebook/Meta connector — interests, likes, and engagement via Graph API v19."""

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

GRAPH_API = "https://graph.facebook.com/v19.0"


class FacebookConnector(BaseConnector):
    connector_id = "facebook"
    display_name = "Facebook"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("FACEBOOK_APP_ID", ""),
            client_secret=os.getenv("FACEBOOK_APP_SECRET", ""),
            auth_url="https://www.facebook.com/v19.0/dialog/oauth",
            token_url="https://graph.facebook.com/v19.0/oauth/access_token",
            scopes=[
                "public_profile",
                "user_likes",
                "user_posts",
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

        url = self._oauth.get_authorization_url(state="facebook")
        return AuthResult(success=False, error=f"Visit to authorize: {url}")

    async def _ensure_token(self) -> bool:
        if self._access_token and time.time() < self._token_expires - 300:
            return True
        # Facebook uses long-lived tokens rather than refresh tokens
        if self._access_token:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{GRAPH_API}/oauth/access_token",
                        params={
                            "grant_type": "fb_exchange_token",
                            "client_id": self._oauth.config.client_id,
                            "client_secret": self._oauth.config.client_secret,
                            "fb_exchange_token": self._access_token,
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
                headers = {}
                params_base = {"access_token": self._access_token}

                # Liked pages — reveals interests
                response = await client.get(
                    f"{GRAPH_API}/me/likes",
                    params={**params_base, "fields": "name,category,id", "limit": 100},
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", []):
                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="facebook",
                            confidence=0.7,
                            context=EventContext(
                                app="Facebook",
                                window_title=item.get("name", ""),
                                domain="facebook.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "page_like",
                                "page_id": item.get("id"),
                                "page_name": item.get("name", ""),
                                "category": item.get("category", ""),
                            },
                        ))

                # User's posts — reveals expression patterns (titles/types only, not content)
                since_param = ""
                if since:
                    since_param = f"&since={int(since.timestamp())}"

                response = await client.get(
                    f"{GRAPH_API}/me/posts",
                    params={
                        **params_base,
                        "fields": "created_time,type,status_type,shares",
                        "limit": 50,
                    },
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", []):
                        post_type = item.get("type", "status")
                        shares = item.get("shares", {}).get("count", 0)

                        events.append(BehavioralEvent(
                            type=MarkerType.SEARCH_QUERY,
                            source="facebook",
                            confidence=0.65,
                            context=EventContext(
                                app="Facebook",
                                window_title=f"Post ({post_type})",
                                domain="facebook.com",
                                domain_category=DomainCategory.SOCIAL,
                            ),
                            metadata={
                                "action": "post",
                                "post_type": post_type,
                                "status_type": item.get("status_type", ""),
                                "shares": shares,
                                "created_time": item.get("created_time", ""),
                            },
                        ))

                # User interests (if available via profile)
                response = await client.get(
                    f"{GRAPH_API}/me",
                    params={**params_base, "fields": "interested_in,favorite_athletes,favorite_teams,inspirational_people"},
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for field in ["favorite_athletes", "favorite_teams", "inspirational_people"]:
                        for item in data.get(field, []):
                            events.append(BehavioralEvent(
                                type=MarkerType.RESEARCH_SESSION,
                                source="facebook",
                                confidence=0.6,
                                context=EventContext(
                                    app="Facebook",
                                    window_title=item.get("name", ""),
                                    domain="facebook.com",
                                    domain_category=DomainCategory.SOCIAL,
                                ),
                                metadata={
                                    "action": "interest",
                                    "interest_type": field,
                                    "name": item.get("name", ""),
                                },
                            ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Facebook sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Facebook sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
