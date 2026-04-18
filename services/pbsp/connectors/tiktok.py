"""TikTok connector — data export parser + Research API for engagement patterns.

TikTok's user API access is very limited (Research API requires approval).
Primary data path is via TikTok's "Download Your Data" feature (JSON format).
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from pathlib import Path

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from core.schemas import BehavioralEvent, EventContext, MarkerType, DomainCategory, ConnectorStatus

logger = logging.getLogger(__name__)


class TikTokConnector(BaseConnector):
    connector_id = "tiktok"
    display_name = "TikTok"
    auth_type = "data_import"

    def __init__(self) -> None:
        self._status = ConnectorStatus.DISCONNECTED
        self._last_sync: float | None = None
        self._imported_events: list[BehavioralEvent] = []

    async def authenticate(self, credentials: dict) -> AuthResult:
        import_path = credentials.get("import_path")
        if not import_path:
            return AuthResult(
                success=False,
                error=(
                    "TikTok requires a data export. Go to Settings > Privacy > "
                    "Download Your Data > Request Data (JSON format). "
                    "Provide 'import_path' pointing to the extracted folder."
                ),
            )

        path = Path(import_path)
        if not path.exists():
            return AuthResult(success=False, error=f"Path does not exist: {import_path}")

        self._status = ConnectorStatus.CONNECTED
        return AuthResult(success=True)

    async def fetch_data(self, since: datetime | None = None) -> list[BehavioralEvent]:
        events = list(self._imported_events)
        self._imported_events.clear()
        return events

    def import_data(self, export_path: str) -> list[BehavioralEvent]:
        """Import TikTok data export.

        TikTok export structure (JSON format):
        - Activity/Browsing History.json — viewed videos
        - Activity/Like List.json — liked videos
        - Activity/Favorite Videos.json — saved/bookmarked
        - Activity/Search History.json — search queries
        - Activity/Share History.json — shared content
        - Activity/Comment History.json — posted comments
        - Profile/Profile Information.json — user profile
        """
        events: list[BehavioralEvent] = []
        root = Path(export_path)

        if not root.exists():
            logger.error("TikTok export path does not exist: %s", export_path)
            return events

        # Browsing/watch history
        events.extend(self._parse_browsing_history(root))

        # Likes
        events.extend(self._parse_likes(root))

        # Favorites/bookmarks
        events.extend(self._parse_favorites(root))

        # Search history
        events.extend(self._parse_search_history(root))

        # Share history
        events.extend(self._parse_share_history(root))

        logger.info("Imported %d events from TikTok export", len(events))
        self._imported_events = events
        self._last_sync = time.time()
        self._status = ConnectorStatus.CONNECTED
        return events

    def _load_json(self, root: Path, *path_parts: str) -> list | dict | None:
        """Try to load a JSON file from the export, handling path variations."""
        # TikTok exports vary in structure across versions
        candidates = [
            root / Path(*path_parts),
            root / "Activity" / Path(*path_parts),
            root / path_parts[-1],
        ]
        for candidate in candidates:
            if candidate.exists():
                try:
                    return json.loads(candidate.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    logger.warning("Failed to parse %s: %s", candidate, e)
        return None

    def _parse_browsing_history(self, root: Path) -> list[BehavioralEvent]:
        events: list[BehavioralEvent] = []
        data = self._load_json(root, "Browsing History.json")
        if not data:
            data = self._load_json(root, "Video Browsing History.json")

        if isinstance(data, dict):
            items = data.get("BrowsingHistoryList", data.get("VideoList", []))
        elif isinstance(data, list):
            items = data
        else:
            return events

        for item in items[:500]:
            date_str = item.get("Date", item.get("date", ""))
            link = item.get("Link", item.get("link", ""))

            events.append(BehavioralEvent(
                type=MarkerType.SEARCH_QUERY,
                source="tiktok",
                confidence=0.65,
                context=EventContext(
                    app="TikTok",
                    window_title="Video viewed",
                    domain="tiktok.com",
                    domain_category=DomainCategory.ENTERTAINMENT,
                ),
                metadata={
                    "action": "watched",
                    "date": date_str,
                    "link": link[:200] if link else "",
                },
            ))

        return events

    def _parse_likes(self, root: Path) -> list[BehavioralEvent]:
        events: list[BehavioralEvent] = []
        data = self._load_json(root, "Like List.json")

        if isinstance(data, dict):
            items = data.get("ItemFavoriteList", data.get("LikeList", []))
        elif isinstance(data, list):
            items = data
        else:
            return events

        for item in items[:500]:
            date_str = item.get("Date", item.get("date", ""))
            link = item.get("Link", item.get("link", ""))

            events.append(BehavioralEvent(
                type=MarkerType.RESEARCH_SESSION,
                source="tiktok",
                confidence=0.7,
                context=EventContext(
                    app="TikTok",
                    window_title="Liked video",
                    domain="tiktok.com",
                    domain_category=DomainCategory.ENTERTAINMENT,
                ),
                metadata={
                    "action": "liked",
                    "date": date_str,
                    "link": link[:200] if link else "",
                },
            ))

        return events

    def _parse_favorites(self, root: Path) -> list[BehavioralEvent]:
        events: list[BehavioralEvent] = []
        data = self._load_json(root, "Favorite Videos.json")

        if isinstance(data, dict):
            items = data.get("FavoriteVideoList", [])
        elif isinstance(data, list):
            items = data
        else:
            return events

        for item in items[:200]:
            date_str = item.get("Date", item.get("date", ""))
            link = item.get("Link", item.get("link", ""))

            events.append(BehavioralEvent(
                type=MarkerType.RESEARCH_SESSION,
                source="tiktok",
                confidence=0.8,
                context=EventContext(
                    app="TikTok",
                    window_title="Favorited video",
                    domain="tiktok.com",
                    domain_category=DomainCategory.ENTERTAINMENT,
                ),
                metadata={
                    "action": "favorited",
                    "date": date_str,
                    "link": link[:200] if link else "",
                },
            ))

        return events

    def _parse_search_history(self, root: Path) -> list[BehavioralEvent]:
        events: list[BehavioralEvent] = []
        data = self._load_json(root, "Search History.json")

        if isinstance(data, dict):
            items = data.get("SearchList", data.get("SearchHistoryList", []))
        elif isinstance(data, list):
            items = data
        else:
            return events

        for item in items[:300]:
            search_term = item.get("SearchTerm", item.get("searchTerm", ""))
            date_str = item.get("Date", item.get("date", ""))

            if search_term:
                events.append(BehavioralEvent(
                    type=MarkerType.SEARCH_QUERY,
                    source="tiktok",
                    confidence=0.85,
                    context=EventContext(
                        app="TikTok",
                        window_title=search_term[:200],
                        domain="tiktok.com",
                        domain_category=DomainCategory.ENTERTAINMENT,
                    ),
                    metadata={
                        "action": "search",
                        "query": search_term,
                        "date": date_str,
                    },
                ))

        return events

    def _parse_share_history(self, root: Path) -> list[BehavioralEvent]:
        events: list[BehavioralEvent] = []
        data = self._load_json(root, "Share History.json")

        if isinstance(data, dict):
            items = data.get("ShareHistoryList", [])
        elif isinstance(data, list):
            items = data
        else:
            return events

        for item in items[:200]:
            date_str = item.get("Date", item.get("date", ""))
            shared_content = item.get("SharedContent", item.get("link", ""))
            method = item.get("Method", "")

            events.append(BehavioralEvent(
                type=MarkerType.SEARCH_QUERY,
                source="tiktok",
                confidence=0.75,
                context=EventContext(
                    app="TikTok",
                    window_title="Shared content",
                    domain="tiktok.com",
                    domain_category=DomainCategory.SOCIAL,
                ),
                metadata={
                    "action": "shared",
                    "date": date_str,
                    "shared_content": str(shared_content)[:200],
                    "method": method,
                },
            ))

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
