"""LinkedIn connector — profile, activities, connections, and job searches via API."""

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

LINKEDIN_API = "https://api.linkedin.com/v2"


class LinkedInConnector(BaseConnector):
    connector_id = "linkedin"
    display_name = "LinkedIn"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("LINKEDIN_CLIENT_ID", ""),
            client_secret=os.getenv("LINKEDIN_CLIENT_SECRET", ""),
            auth_url="https://www.linkedin.com/oauth/v2/authorization",
            token_url="https://www.linkedin.com/oauth/v2/accessToken",
            scopes=[
                "r_liteprofile",
                "r_emailaddress",
                "r_basicprofile",
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

        url = self._oauth.get_authorization_url(state="linkedin")
        return AuthResult(success=False, error=f"Visit to authorize: {url}")

    async def _fetch_user_id(self) -> None:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{LINKEDIN_API}/me",
                    headers={"Authorization": f"Bearer {self._access_token}"},
                    timeout=30,
                )
                if response.status_code == 200:
                    self._user_id = response.json().get("id")
        except Exception:
            logger.debug("Failed to fetch LinkedIn user ID", exc_info=True)

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
            logger.error("Cannot fetch LinkedIn data without user ID")
            return []

        self._status = ConnectorStatus.SYNCING
        events: list[BehavioralEvent] = []

        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self._access_token}"}

                # User profile — basic identity and career info
                response = await client.get(
                    f"{LINKEDIN_API}/me",
                    params={"projection": "(id,firstName,lastName,localizedFirstName,localizedLastName,headline)"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    first_name = data.get("localizedFirstName", data.get("firstName", ""))
                    last_name = data.get("localizedLastName", data.get("lastName", ""))
                    headline = data.get("headline", "")[:100]

                    events.append(BehavioralEvent(
                        type=MarkerType.RESEARCH_SESSION,
                        source="linkedin",
                        confidence=0.9,
                        context=EventContext(
                            app="LinkedIn",
                            window_title=f"{first_name} {last_name}",
                            domain="linkedin.com",
                            domain_category=DomainCategory.PROFESSIONAL,
                        ),
                        metadata={
                            "action": "profile",
                            "first_name": first_name,
                            "last_name": last_name,
                            "headline": headline,
                        },
                    ))

                # User's positions — reveals career progression
                response = await client.get(
                    f"{LINKEDIN_API}/me/positions",
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for position in data.get("values", []):
                        company = position.get("company", {}).get("name", "")
                        title = position.get("title", "")[:100]

                        events.append(BehavioralEvent(
                            type=MarkerType.TOPIC_LOOP,
                            source="linkedin",
                            confidence=0.85,
                            context=EventContext(
                                app="LinkedIn",
                                window_title=title,
                                domain="linkedin.com",
                                domain_category=DomainCategory.PROFESSIONAL,
                            ),
                            metadata={
                                "action": "position",
                                "title": title,
                                "company": company,
                                "start_date": position.get("startDate", {}).get("month"),
                                "end_date": position.get("endDate", {}).get("month"),
                                "description": position.get("description", "")[:50],
                            },
                        ))

                # User's connections count — reveals network size
                response = await client.get(
                    f"{LINKEDIN_API}/me",
                    params={"projection": "(firstName,lastName,publicProfileUrl)"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    public_url = data.get("publicProfileUrl", "")

                    events.append(BehavioralEvent(
                        type=MarkerType.DEEP_FOCUS,
                        source="linkedin",
                        confidence=0.8,
                        context=EventContext(
                            app="LinkedIn",
                            domain="linkedin.com",
                            domain_category=DomainCategory.PROFESSIONAL,
                        ),
                        metadata={
                            "action": "profile_view",
                            "public_url": public_url,
                        },
                    ))

                # User's skills — reveals expertise areas
                response = await client.get(
                    f"{LINKEDIN_API}/me/skills",
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    skills = [skill.get("name", "") for skill in data.get("values", [])]

                    if skills:
                        events.append(BehavioralEvent(
                            type=MarkerType.TOPIC_LOOP,
                            source="linkedin",
                            confidence=0.8,
                            context=EventContext(
                                app="LinkedIn",
                                domain="linkedin.com",
                                domain_category=DomainCategory.PROFESSIONAL,
                            ),
                            metadata={
                                "action": "skills",
                                "skills": skills[:30],
                                "count": len(skills),
                            },
                        ))

                # User's recommendations — reveals accomplishments
                response = await client.get(
                    f"{LINKEDIN_API}/me/recommendations",
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    recommendations = data.get("values", [])

                    if recommendations:
                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="linkedin",
                            confidence=0.85,
                            context=EventContext(
                                app="LinkedIn",
                                domain="linkedin.com",
                                domain_category=DomainCategory.PROFESSIONAL,
                            ),
                            metadata={
                                "action": "recommendations_received",
                                "count": len(recommendations),
                                "recommenders": [r.get("recommender", {}).get("firstName", "")
                                               for r in recommendations[:5]],
                            },
                        ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("LinkedIn sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("LinkedIn sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
