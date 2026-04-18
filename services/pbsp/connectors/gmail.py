"""Gmail connector — send/receive volume, response times, and patterns via Gmail API.

Extracts behavioral signals from email patterns without reading content.
Only accesses metadata: sender/recipient counts, timestamps, label stats.
"""

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

GMAIL_API = "https://gmail.googleapis.com/gmail/v1"


class GmailConnector(BaseConnector):
    connector_id = "gmail"
    display_name = "Gmail"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=[
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.metadata",
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

        url = self._oauth.get_authorization_url(state="gmail")
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

                # Get label stats for inbox volume
                response = await client.get(
                    f"{GMAIL_API}/users/me/labels",
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    labels_data = response.json()
                    for label in labels_data.get("labels", []):
                        label_name = label.get("name", "")
                        label_id = label.get("id", "")

                        if label_name.upper() in ("INBOX", "SENT", "DRAFT", "SPAM", "TRASH"):
                            # Get detailed counts
                            detail_resp = await client.get(
                                f"{GMAIL_API}/users/me/labels/{label_id}",
                                headers=headers,
                                timeout=30,
                            )
                            if detail_resp.status_code == 200:
                                detail = detail_resp.json()
                                events.append(BehavioralEvent(
                                    type=MarkerType.DAILY_PATTERN,
                                    source="gmail",
                                    confidence=0.7,
                                    context=EventContext(
                                        app="Gmail",
                                        window_title=f"Label: {label_name}",
                                        domain="mail.google.com",
                                        domain_category=DomainCategory.COMMUNICATION,
                                    ),
                                    metadata={
                                        "action": "label_stats",
                                        "label": label_name,
                                        "total_messages": detail.get("messagesTotal", 0),
                                        "unread_messages": detail.get("messagesUnread", 0),
                                        "total_threads": detail.get("threadsTotal", 0),
                                        "unread_threads": detail.get("threadsUnread", 0),
                                    },
                                ))

                # Recent message metadata — timestamps and volume only
                since_epoch = int((since or datetime.now(timezone.utc) - timedelta(days=7)).timestamp())
                query = f"after:{since_epoch}"

                response = await client.get(
                    f"{GMAIL_API}/users/me/messages",
                    params={"q": query, "maxResults": 100},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    message_ids = [m.get("id") for m in data.get("messages", [])[:50]]

                    sent_count = 0
                    received_count = 0
                    response_times: list[float] = []
                    hourly_distribution: dict[int, int] = {}

                    for msg_id in message_ids:
                        msg_resp = await client.get(
                            f"{GMAIL_API}/users/me/messages/{msg_id}",
                            params={"format": "metadata", "metadataHeaders": ["From", "To", "Date"]},
                            headers=headers,
                            timeout=15,
                        )
                        if msg_resp.status_code != 200:
                            continue

                        msg_data = msg_resp.json()
                        label_ids = msg_data.get("labelIds", [])
                        internal_date = int(msg_data.get("internalDate", 0)) / 1000

                        if internal_date > 0:
                            hour = datetime.fromtimestamp(internal_date).hour
                            hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1

                        if "SENT" in label_ids:
                            sent_count += 1
                        else:
                            received_count += 1

                    # Create volume summary event
                    events.append(BehavioralEvent(
                        type=MarkerType.TIME_CLUSTER,
                        source="gmail",
                        confidence=0.75,
                        context=EventContext(
                            app="Gmail",
                            window_title="Email Activity Summary",
                            domain="mail.google.com",
                            domain_category=DomainCategory.COMMUNICATION,
                        ),
                        metadata={
                            "action": "email_volume",
                            "sent_count": sent_count,
                            "received_count": received_count,
                            "total_messages": sent_count + received_count,
                            "hourly_distribution": hourly_distribution,
                            "peak_hours": sorted(
                                hourly_distribution, key=hourly_distribution.get, reverse=True  # type: ignore[arg-type]
                            )[:3] if hourly_distribution else [],
                        },
                    ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Gmail sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Gmail sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
