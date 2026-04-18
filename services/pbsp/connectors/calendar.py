"""Calendar connectors — Google Calendar and Outlook Calendar via OAuth2 APIs.

Extracts meeting density, free blocks, and scheduling patterns.
Never reads event content/descriptions — only titles, times, and attendee counts.
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


class GoogleCalendarConnector(BaseConnector):
    connector_id = "google_calendar"
    display_name = "Google Calendar"
    auth_type = "oauth2"

    CALENDAR_API = "https://www.googleapis.com/calendar/v3"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=[
                "https://www.googleapis.com/auth/calendar.readonly",
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

        url = self._oauth.get_authorization_url(state="google_calendar")
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

        # Default to last 7 days
        time_min = since or (datetime.now(timezone.utc) - timedelta(days=7))
        time_max = datetime.now(timezone.utc)

        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self._access_token}"}

                response = await client.get(
                    f"{self.CALENDAR_API}/calendars/primary/events",
                    params={
                        "timeMin": time_min.isoformat(),
                        "timeMax": time_max.isoformat(),
                        "maxResults": 100,
                        "singleEvents": True,
                        "orderBy": "startTime",
                    },
                    headers=headers,
                    timeout=30,
                )

                if response.status_code == 200:
                    data = response.json()
                    calendar_events = data.get("items", [])

                    # Calculate meeting density
                    total_meeting_minutes = 0
                    meeting_count = 0

                    for cal_event in calendar_events:
                        summary = cal_event.get("summary", "Calendar Event")
                        start = cal_event.get("start", {})
                        end = cal_event.get("end", {})
                        attendees = cal_event.get("attendees", [])
                        event_status = cal_event.get("status", "confirmed")

                        if event_status == "cancelled":
                            continue

                        # Calculate duration
                        start_dt = start.get("dateTime", start.get("date", ""))
                        end_dt = end.get("dateTime", end.get("date", ""))
                        duration_minutes = 0

                        if "T" in start_dt and "T" in end_dt:
                            try:
                                s = datetime.fromisoformat(start_dt)
                                e = datetime.fromisoformat(end_dt)
                                duration_minutes = (e - s).total_seconds() / 60
                            except ValueError:
                                pass

                        is_meeting = len(attendees) > 1
                        if is_meeting:
                            meeting_count += 1
                            total_meeting_minutes += duration_minutes

                        events.append(BehavioralEvent(
                            type=MarkerType.DAILY_PATTERN,
                            source="google_calendar",
                            confidence=0.8,
                            context=EventContext(
                                app="Google Calendar",
                                window_title=summary[:100],
                                domain="calendar.google.com",
                                domain_category=DomainCategory.WORK,
                                duration=duration_minutes * 60,
                            ),
                            metadata={
                                "action": "calendar_event",
                                "start": start_dt,
                                "end": end_dt,
                                "duration_minutes": duration_minutes,
                                "attendee_count": len(attendees),
                                "is_meeting": is_meeting,
                                "is_recurring": bool(cal_event.get("recurringEventId")),
                                "event_type": cal_event.get("eventType", "default"),
                            },
                        ))

                    # Add a summary event for meeting density
                    if meeting_count > 0:
                        events.append(BehavioralEvent(
                            type=MarkerType.TIME_CLUSTER,
                            source="google_calendar",
                            confidence=0.85,
                            context=EventContext(
                                app="Google Calendar",
                                window_title="Meeting Density Summary",
                                domain="calendar.google.com",
                                domain_category=DomainCategory.WORK,
                            ),
                            metadata={
                                "action": "meeting_density",
                                "meeting_count": meeting_count,
                                "total_meeting_minutes": total_meeting_minutes,
                                "period_days": (time_max - time_min).days,
                                "avg_meetings_per_day": meeting_count / max((time_max - time_min).days, 1),
                            },
                        ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Google Calendar sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Google Calendar sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )


class OutlookCalendarConnector(BaseConnector):
    connector_id = "outlook_calendar"
    display_name = "Outlook Calendar"
    auth_type = "oauth2"

    GRAPH_API = "https://graph.microsoft.com/v1.0"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("MICROSOFT_CLIENT_ID", ""),
            client_secret=os.getenv("MICROSOFT_CLIENT_SECRET", ""),
            auth_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            token_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
            scopes=[
                "Calendars.Read",
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

        url = self._oauth.get_authorization_url(state="outlook_calendar")
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

        time_min = since or (datetime.now(timezone.utc) - timedelta(days=7))
        time_max = datetime.now(timezone.utc)

        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self._access_token}"}

                response = await client.get(
                    f"{self.GRAPH_API}/me/calendarView",
                    params={
                        "startDateTime": time_min.isoformat(),
                        "endDateTime": time_max.isoformat(),
                        "$top": 100,
                        "$orderby": "start/dateTime",
                        "$select": "subject,start,end,attendees,isAllDay,type,isCancelled",
                    },
                    headers=headers,
                    timeout=30,
                )

                if response.status_code == 200:
                    data = response.json()
                    meeting_count = 0
                    total_meeting_minutes = 0

                    for cal_event in data.get("value", []):
                        if cal_event.get("isCancelled"):
                            continue

                        subject = cal_event.get("subject", "Calendar Event")
                        start = cal_event.get("start", {})
                        end = cal_event.get("end", {})
                        attendees = cal_event.get("attendees", [])

                        start_dt = start.get("dateTime", "")
                        end_dt = end.get("dateTime", "")
                        duration_minutes = 0

                        if start_dt and end_dt:
                            try:
                                s = datetime.fromisoformat(start_dt)
                                e = datetime.fromisoformat(end_dt)
                                duration_minutes = (e - s).total_seconds() / 60
                            except ValueError:
                                pass

                        is_meeting = len(attendees) > 1
                        if is_meeting:
                            meeting_count += 1
                            total_meeting_minutes += duration_minutes

                        events.append(BehavioralEvent(
                            type=MarkerType.DAILY_PATTERN,
                            source="outlook_calendar",
                            confidence=0.8,
                            context=EventContext(
                                app="Outlook Calendar",
                                window_title=subject[:100],
                                domain="outlook.office.com",
                                domain_category=DomainCategory.WORK,
                                duration=duration_minutes * 60,
                            ),
                            metadata={
                                "action": "calendar_event",
                                "start": start_dt,
                                "end": end_dt,
                                "duration_minutes": duration_minutes,
                                "attendee_count": len(attendees),
                                "is_meeting": is_meeting,
                                "is_all_day": cal_event.get("isAllDay", False),
                                "event_type": cal_event.get("type", "singleInstance"),
                            },
                        ))

                    if meeting_count > 0:
                        events.append(BehavioralEvent(
                            type=MarkerType.TIME_CLUSTER,
                            source="outlook_calendar",
                            confidence=0.85,
                            context=EventContext(
                                app="Outlook Calendar",
                                window_title="Meeting Density Summary",
                                domain="outlook.office.com",
                                domain_category=DomainCategory.WORK,
                            ),
                            metadata={
                                "action": "meeting_density",
                                "meeting_count": meeting_count,
                                "total_meeting_minutes": total_meeting_minutes,
                                "period_days": (time_max - time_min).days,
                                "avg_meetings_per_day": meeting_count / max((time_max - time_min).days, 1),
                            },
                        ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Outlook Calendar sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Outlook Calendar sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
