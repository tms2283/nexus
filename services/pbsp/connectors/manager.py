"""Connector Manager — orchestrates all platform connectors.

Handles registration, scheduled polling, authentication state,
and aggregating data from all connected platforms.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Type

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from core.schemas import BehavioralEvent, ConnectorStatus

logger = logging.getLogger(__name__)

# Default polling intervals (seconds)
DEFAULT_POLL_INTERVALS: dict[str, int] = {
    "youtube": 900,          # 15 min
    "spotify": 900,          # 15 min
    "google_activity": 1800, # 30 min
    "google_calendar": 1800, # 30 min
    "outlook_calendar": 1800,# 30 min
    "facebook": 1800,        # 30 min
    "instagram": 1800,       # 30 min
    "twitter": 900,          # 15 min
    "microsoft": 900,        # 15 min
    "gmail": 1800,           # 30 min
    "reddit": 1800,          # 30 min
    "github": 1800,          # 30 min
    "linkedin": 3600,        # 60 min
    # Data-import connectors don't poll
    "tiktok": 0,
    "apple": 0,
    "ai_chat_import": 0,
}


class ConnectorManager:
    """Manages lifecycle and polling of all platform connectors."""

    def __init__(self) -> None:
        self._connectors: dict[str, BaseConnector] = {}
        self._poll_intervals: dict[str, int] = dict(DEFAULT_POLL_INTERVALS)
        self._last_poll: dict[str, float] = {}
        self._poll_task: asyncio.Task | None = None
        self._running = False

    def register(self, connector: BaseConnector) -> None:
        """Register a connector instance."""
        self._connectors[connector.connector_id] = connector
        logger.debug("Registered connector: %s", connector.connector_id)

    def register_all_defaults(self) -> None:
        """Register all built-in connectors."""
        from connectors.youtube import YouTubeConnector
        from connectors.spotify import SpotifyConnector
        from connectors.google_activity import GoogleActivityConnector
        from connectors.calendar import GoogleCalendarConnector, OutlookCalendarConnector
        from connectors.facebook import FacebookConnector
        from connectors.instagram import InstagramConnector
        from connectors.twitter import TwitterConnector
        from connectors.microsoft import MicrosoftConnector
        from connectors.gmail import GmailConnector
        from connectors.tiktok import TikTokConnector
        from connectors.apple import AppleConnector
        from connectors.ai_chat_import import AIChatImportConnector
        from connectors.reddit import RedditConnector
        from connectors.github import GitHubConnector
        from connectors.linkedin import LinkedInConnector

        for cls in [
            YouTubeConnector,
            SpotifyConnector,
            GoogleActivityConnector,
            GoogleCalendarConnector,
            OutlookCalendarConnector,
            FacebookConnector,
            InstagramConnector,
            TwitterConnector,
            MicrosoftConnector,
            GmailConnector,
            TikTokConnector,
            AppleConnector,
            AIChatImportConnector,
            RedditConnector,
            GitHubConnector,
            LinkedInConnector,
        ]:
            self.register(cls())

    def get_connector(self, connector_id: str) -> BaseConnector | None:
        """Get a specific connector by ID."""
        return self._connectors.get(connector_id)

    async def authenticate_connector(
        self, connector_id: str, credentials: dict
    ) -> AuthResult:
        """Authenticate a specific connector."""
        connector = self._connectors.get(connector_id)
        if not connector:
            return AuthResult(success=False, error=f"Unknown connector: {connector_id}")

        result = await connector.authenticate(credentials)
        if result.success:
            logger.info("Connector %s authenticated successfully", connector_id)
        else:
            logger.warning("Connector %s auth failed: %s", connector_id, result.error)

        return result

    async def disconnect_connector(self, connector_id: str) -> bool:
        """Disconnect a specific connector."""
        connector = self._connectors.get(connector_id)
        if not connector:
            return False

        await connector.disconnect()
        logger.info("Connector %s disconnected", connector_id)
        return True

    async def fetch_connector_data(
        self, connector_id: str, since: datetime | None = None
    ) -> list[BehavioralEvent]:
        """Fetch data from a specific connector."""
        connector = self._connectors.get(connector_id)
        if not connector:
            return []

        try:
            events = await connector.fetch_data(since=since)
            self._last_poll[connector_id] = time.time()
            return events
        except Exception as e:
            logger.error("Failed to fetch from %s: %s", connector_id, e)
            return []

    async def fetch_all_connected(
        self, since: datetime | None = None
    ) -> list[BehavioralEvent]:
        """Fetch data from all connected connectors."""
        all_events: list[BehavioralEvent] = []
        tasks = []

        for cid, connector in self._connectors.items():
            status = await connector.get_status()
            if status.status == ConnectorStatus.CONNECTED:
                # Check if enough time has passed since last poll
                interval = self._poll_intervals.get(cid, 1800)
                if interval == 0:
                    continue  # Data-import connectors don't auto-poll
                last = self._last_poll.get(cid, 0)
                if time.time() - last < interval:
                    continue
                tasks.append((cid, connector.fetch_data(since=since)))

        # Run all fetches concurrently
        if tasks:
            results = await asyncio.gather(
                *(task for _, task in tasks), return_exceptions=True
            )
            for (cid, _), result in zip(tasks, results):
                if isinstance(result, Exception):
                    logger.error("Connector %s fetch failed: %s", cid, result)
                else:
                    all_events.extend(result)
                    self._last_poll[cid] = time.time()
                    logger.debug("Connector %s returned %d events", cid, len(result))

        return all_events

    async def get_all_statuses(self) -> list[ConnectorInfo]:
        """Get status of all registered connectors."""
        statuses = []
        for connector in self._connectors.values():
            try:
                status = await connector.get_status()
                statuses.append(status)
            except Exception as e:
                logger.error("Failed to get status for %s: %s", connector.connector_id, e)
        return statuses

    async def start_polling(self) -> None:
        """Start the background polling loop."""
        if self._running:
            return
        self._running = True
        self._poll_task = asyncio.create_task(self._poll_loop())
        logger.info("Connector polling started")

    async def stop_polling(self) -> None:
        """Stop the background polling loop."""
        self._running = False
        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
            self._poll_task = None
        logger.info("Connector polling stopped")

    async def _poll_loop(self) -> None:
        """Background loop that polls connected connectors at their intervals."""
        while self._running:
            try:
                events = await self.fetch_all_connected()
                if events:
                    logger.info("Polled %d events from connectors", len(events))
                    # Events are returned to callers via fetch_all_connected()
                    # The API layer is responsible for feeding them into the collector
            except Exception:
                logger.exception("Error in connector poll loop")

            # Sleep for a short interval, then re-check which connectors need polling
            await asyncio.sleep(60)
