"""Microsoft connector — Office 365 activity, Edge history, Teams presence via Microsoft Graph."""

from __future__ import annotations

import os
import time
import logging
from datetime import datetime, timedelta, timezone

import httpx

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from connectors.oauth_handler import OAuthHandler, OAuthConfig
from core.schemas import BehavioralEvent, EventContext, MarkerType, DomainCategory, ConnectorStatus

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.microsoft.com/v1.0"


class MicrosoftConnector(BaseConnector):
    connector_id = "microsoft"
    display_name = "Microsoft 365"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("MICROSOFT_CLIENT_ID", ""),
            client_secret=os.getenv("MICROSOFT_CLIENT_SECRET", ""),
            auth_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            token_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
            scopes=[
                "User.Read",
                "Files.Read",
                "Sites.Read.All",
                "Mail.ReadBasic",
                "Presence.Read",
                "offline_access",
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

        url = self._oauth.get_authorization_url(state="microsoft")
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

                # Recent files — indicates work patterns
                response = await client.get(
                    f"{GRAPH_API}/me/drive/recent",
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("value", [])[:50]:
                        name = item.get("name", "")
                        last_modified = item.get("lastModifiedDateTime", "")
                        file_info = item.get("file", {})
                        mime_type = file_info.get("mimeType", "")

                        # Categorize by file type
                        if any(ext in name.lower() for ext in [".py", ".js", ".ts", ".java", ".cpp", ".cs"]):
                            domain_cat = DomainCategory.WORK
                        elif any(ext in name.lower() for ext in [".docx", ".pdf", ".pptx", ".xlsx"]):
                            domain_cat = DomainCategory.WORK
                        else:
                            domain_cat = DomainCategory.UNKNOWN

                        events.append(BehavioralEvent(
                            type=MarkerType.SEARCH_QUERY,
                            source="microsoft",
                            confidence=0.7,
                            context=EventContext(
                                app="OneDrive",
                                window_title=name[:200],
                                domain="onedrive.live.com",
                                domain_category=domain_cat,
                            ),
                            metadata={
                                "action": "file_access",
                                "file_name": name,
                                "mime_type": mime_type,
                                "last_modified": last_modified,
                                "size": item.get("size", 0),
                            },
                        ))

                # Mail folder stats — volume only, never content
                response = await client.get(
                    f"{GRAPH_API}/me/mailFolders",
                    params={"$select": "displayName,totalItemCount,unreadItemCount"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for folder in data.get("value", []):
                        folder_name = folder.get("displayName", "")
                        if folder_name.lower() in ("inbox", "sent items", "drafts"):
                            events.append(BehavioralEvent(
                                type=MarkerType.DAILY_PATTERN,
                                source="microsoft",
                                confidence=0.65,
                                context=EventContext(
                                    app="Outlook",
                                    window_title=f"Mail: {folder_name}",
                                    domain="outlook.office.com",
                                    domain_category=DomainCategory.COMMUNICATION,
                                ),
                                metadata={
                                    "action": "mail_stats",
                                    "folder": folder_name,
                                    "total_items": folder.get("totalItemCount", 0),
                                    "unread_items": folder.get("unreadItemCount", 0),
                                },
                            ))

                # Teams presence — indicates availability patterns
                response = await client.get(
                    f"{GRAPH_API}/me/presence",
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    presence = response.json()
                    events.append(BehavioralEvent(
                        type=MarkerType.DAILY_PATTERN,
                        source="microsoft",
                        confidence=0.6,
                        context=EventContext(
                            app="Teams",
                            window_title=f"Presence: {presence.get('availability', 'Unknown')}",
                            domain="teams.microsoft.com",
                            domain_category=DomainCategory.COMMUNICATION,
                        ),
                        metadata={
                            "action": "presence",
                            "availability": presence.get("availability", ""),
                            "activity": presence.get("activity", ""),
                        },
                    ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Microsoft sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Microsoft sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
