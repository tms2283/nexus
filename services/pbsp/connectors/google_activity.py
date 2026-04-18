"""Google Activity connector — search history, app activity via Google APIs + Takeout import."""

from __future__ import annotations

import os
import json
import time
import logging
from datetime import datetime
from pathlib import Path

import httpx

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from connectors.oauth_handler import OAuthHandler, OAuthConfig
from core.schemas import BehavioralEvent, EventContext, MarkerType, DomainCategory, ConnectorStatus

logger = logging.getLogger(__name__)


class GoogleActivityConnector(BaseConnector):
    connector_id = "google_activity"
    display_name = "Google Activity"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=[
                "https://www.googleapis.com/auth/webhistory",
                "https://www.googleapis.com/auth/userinfo.profile",
            ],
        ))
        self._access_token: str | None = None
        self._refresh_token: str | None = None
        self._token_expires: float = 0
        self._last_sync: float | None = None
        self._status = ConnectorStatus.DISCONNECTED
        self._imported_takeout: list[BehavioralEvent] = []

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

        url = self._oauth.get_authorization_url(state="google_activity")
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
        events: list[BehavioralEvent] = []

        # Include any previously imported Takeout data
        if self._imported_takeout:
            events.extend(self._imported_takeout)
            self._imported_takeout.clear()

        if not await self._ensure_token():
            return events

        self._status = ConnectorStatus.SYNCING

        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self._access_token}"}

                # Google Search history via Web & App Activity
                # Note: This requires the Web History scope and may need
                # the user to enable Web & App Activity in their Google account
                response = await client.get(
                    "https://www.googleapis.com/discovery/v1/apis",
                    params={"name": "webhistory"},
                    headers=headers,
                    timeout=30,
                )
                # The Web History API is limited — most data comes from Takeout

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Google Activity sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Google Activity sync failed: %s", e)

        return events

    def import_takeout(self, takeout_path: str) -> list[BehavioralEvent]:
        """Import Google Takeout data from extracted archive.

        Supports:
        - My Activity/Search/MyActivity.json — Google Search history
        - My Activity/Chrome/MyActivity.json — Chrome browsing
        - My Activity/YouTube/MyActivity.json — YouTube watch history
        - My Activity/Assistant/MyActivity.json — Google Assistant queries
        """
        events: list[BehavioralEvent] = []
        takeout_dir = Path(takeout_path)

        if not takeout_dir.exists():
            logger.error("Takeout path does not exist: %s", takeout_path)
            return events

        # Search for all MyActivity.json files
        activity_files = list(takeout_dir.rglob("MyActivity.json"))

        for activity_file in activity_files:
            try:
                source_dir = activity_file.parent.name.lower()
                data = json.loads(activity_file.read_text(encoding="utf-8"))

                if not isinstance(data, list):
                    continue

                for item in data[:500]:  # Cap at 500 per file
                    title = item.get("title", "")
                    activity_time = item.get("time", "")
                    header = item.get("header", "")
                    products = item.get("products", [])

                    # Determine domain category from source
                    if "search" in source_dir or "search" in header.lower():
                        domain_cat = DomainCategory.LEARNING
                        marker = MarkerType.SEARCH_QUERY
                        confidence = 0.8
                    elif "youtube" in source_dir or "YouTube" in header:
                        domain_cat = DomainCategory.ENTERTAINMENT
                        marker = MarkerType.RESEARCH_SESSION
                        confidence = 0.75
                    elif "chrome" in source_dir or "Chrome" in header:
                        domain_cat = DomainCategory.UNKNOWN
                        marker = MarkerType.SEARCH_QUERY
                        confidence = 0.7
                    elif "assistant" in source_dir or "Assistant" in header:
                        domain_cat = DomainCategory.LEARNING
                        marker = MarkerType.QUESTION_TYPED
                        confidence = 0.7
                    else:
                        domain_cat = DomainCategory.UNKNOWN
                        marker = MarkerType.SEARCH_QUERY
                        confidence = 0.6

                    # Extract URL if present
                    url = ""
                    subtitles = item.get("subtitles", [])
                    if subtitles and isinstance(subtitles[0], dict):
                        url = subtitles[0].get("url", "")

                    events.append(BehavioralEvent(
                        type=marker,
                        source="google_activity",
                        confidence=confidence,
                        context=EventContext(
                            app="Google",
                            window_title=title[:200],
                            url=url,
                            domain="google.com",
                            domain_category=domain_cat,
                        ),
                        metadata={
                            "action": "activity",
                            "source_dir": source_dir,
                            "header": header,
                            "products": products[:3],
                            "activity_time": activity_time,
                        },
                    ))

            except (json.JSONDecodeError, KeyError, UnicodeDecodeError) as e:
                logger.warning("Failed to parse %s: %s", activity_file, e)

        logger.info("Imported %d events from Google Takeout", len(events))
        self._imported_takeout = events
        self._status = ConnectorStatus.CONNECTED
        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
