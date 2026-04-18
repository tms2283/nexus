"""Base connector interface for all platform integrations.

Every connector (YouTube, Spotify, Facebook, etc.) must implement this
ABC.  The ConnectorManager orchestrates them via a common interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from core.schemas import BehavioralEvent, ConnectorStatus


class AuthResult(BaseModel):
    success: bool
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: float | None = None
    error: str | None = None


class ConnectorInfo(BaseModel):
    connector_id: str
    display_name: str
    auth_type: str  # "oauth2" | "api_key" | "data_import"
    status: ConnectorStatus = ConnectorStatus.DISCONNECTED
    last_sync: float | None = None
    last_error: str | None = None


class BaseConnector(ABC):
    """Abstract base for all platform connectors."""

    connector_id: str
    display_name: str
    auth_type: str  # "oauth2" | "api_key" | "data_import"

    @abstractmethod
    async def authenticate(self, credentials: dict) -> AuthResult:
        """Initiate or complete authentication.

        For OAuth2: handle auth code exchange and token storage.
        For data_import: validate the import file/data format.
        For api_key: validate the provided key.
        """
        ...

    @abstractmethod
    async def fetch_data(self, since: datetime | None = None) -> list[BehavioralEvent]:
        """Fetch new behavioral data from the platform.

        Args:
            since: Only fetch data newer than this timestamp.
                   If None, fetch all available data.

        Returns:
            List of normalized BehavioralEvents ready for the collector.
        """
        ...

    @abstractmethod
    async def get_status(self) -> ConnectorInfo:
        """Return the current status of this connector."""
        ...

    async def disconnect(self) -> None:
        """Revoke tokens and clean up. Override if needed."""
        pass

    async def refresh_token(self) -> bool:
        """Refresh an expired OAuth2 token. Override for OAuth connectors."""
        return False
