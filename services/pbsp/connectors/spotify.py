"""Spotify connector — listening history, playlists, and music preferences via Spotify Web API."""

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

SPOTIFY_API_BASE = "https://api.spotify.com/v1"


class SpotifyConnector(BaseConnector):
    connector_id = "spotify"
    display_name = "Spotify"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("SPOTIFY_CLIENT_ID", ""),
            client_secret=os.getenv("SPOTIFY_CLIENT_SECRET", ""),
            auth_url="https://accounts.spotify.com/authorize",
            token_url="https://accounts.spotify.com/api/token",
            scopes=[
                "user-read-recently-played",
                "user-read-currently-playing",
                "user-top-read",
                "user-library-read",
                "playlist-read-private",
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

        url = self._oauth.get_authorization_url(state="spotify")
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

                # Recently played tracks — reveals listening patterns
                params: dict = {"limit": 50}
                if since:
                    params["after"] = int(since.timestamp() * 1000)

                response = await client.get(
                    f"{SPOTIFY_API_BASE}/me/player/recently-played",
                    params=params,
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        track = item.get("track", {})
                        artists = [a.get("name", "") for a in track.get("artists", [])]
                        played_at = item.get("played_at", "")
                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="spotify",
                            confidence=0.7,
                            context=EventContext(
                                app="Spotify",
                                window_title=track.get("name", ""),
                                domain="spotify.com",
                                domain_category=DomainCategory.ENTERTAINMENT,
                            ),
                            metadata={
                                "action": "played",
                                "track_id": track.get("id"),
                                "track_name": track.get("name", ""),
                                "artists": artists,
                                "album": track.get("album", {}).get("name", ""),
                                "duration_ms": track.get("duration_ms"),
                                "explicit": track.get("explicit", False),
                                "played_at": played_at,
                            },
                        ))

                # Top artists (medium-term) — reveals sustained interests
                response = await client.get(
                    f"{SPOTIFY_API_BASE}/me/top/artists",
                    params={"limit": 20, "time_range": "medium_term"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="spotify",
                            confidence=0.75,
                            context=EventContext(
                                app="Spotify",
                                window_title=f"Top Artist: {item.get('name', '')}",
                                domain="spotify.com",
                                domain_category=DomainCategory.ENTERTAINMENT,
                            ),
                            metadata={
                                "action": "top_artist",
                                "artist_id": item.get("id"),
                                "artist_name": item.get("name", ""),
                                "genres": item.get("genres", [])[:5],
                                "popularity": item.get("popularity"),
                            },
                        ))

                # Top tracks (medium-term) — reveals taste patterns
                response = await client.get(
                    f"{SPOTIFY_API_BASE}/me/top/tracks",
                    params={"limit": 20, "time_range": "medium_term"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        artists = [a.get("name", "") for a in item.get("artists", [])]
                        events.append(BehavioralEvent(
                            type=MarkerType.SEARCH_QUERY,
                            source="spotify",
                            confidence=0.7,
                            context=EventContext(
                                app="Spotify",
                                window_title=f"Top Track: {item.get('name', '')}",
                                domain="spotify.com",
                                domain_category=DomainCategory.ENTERTAINMENT,
                            ),
                            metadata={
                                "action": "top_track",
                                "track_id": item.get("id"),
                                "track_name": item.get("name", ""),
                                "artists": artists,
                                "popularity": item.get("popularity"),
                            },
                        ))

                # Saved albums — indicates deeper engagement
                response = await client.get(
                    f"{SPOTIFY_API_BASE}/me/albums",
                    params={"limit": 20},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        album = item.get("album", {})
                        artists = [a.get("name", "") for a in album.get("artists", [])]
                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="spotify",
                            confidence=0.65,
                            context=EventContext(
                                app="Spotify",
                                window_title=album.get("name", ""),
                                domain="spotify.com",
                                domain_category=DomainCategory.ENTERTAINMENT,
                            ),
                            metadata={
                                "action": "saved_album",
                                "album_id": album.get("id"),
                                "album_name": album.get("name", ""),
                                "artists": artists,
                                "release_date": album.get("release_date", ""),
                                "total_tracks": album.get("total_tracks"),
                                "added_at": item.get("added_at", ""),
                            },
                        ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("Spotify sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("Spotify sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
