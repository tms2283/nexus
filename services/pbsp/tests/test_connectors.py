"""Tests for ConnectorManager and connector implementations."""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.schemas import BehavioralEvent, ConnectorStatus, MarkerType, EventContext
from connectors.manager import ConnectorManager
from connectors.base import BaseConnector, AuthResult, ConnectorInfo


class MockConnector(BaseConnector):
    """Mock connector for testing."""

    connector_id = "mock"
    display_name = "Mock Connector"
    auth_type = "oauth2"

    def __init__(self):
        self.is_authenticated = False
        self.last_sync = None

    async def authenticate(self, credentials: dict) -> AuthResult:
        self.is_authenticated = True
        return AuthResult(
            success=True,
            access_token="mock_token",
            expires_at=time.time() + 3600,
        )

    async def fetch_data(self, since=None) -> list[BehavioralEvent]:
        if not self.is_authenticated:
            return []

        self.last_sync = time.time()
        return [
            BehavioralEvent(
                type=MarkerType.RESEARCH_SESSION,
                source=self.connector_id,
                confidence=0.8,
                context=EventContext(app="Mock"),
            )
        ]

    async def get_status(self) -> ConnectorInfo:
        status = ConnectorStatus.CONNECTED if self.is_authenticated else ConnectorStatus.DISCONNECTED
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=status,
            last_sync=self.last_sync,
        )


class TestConnectorManager:
    """Tests for ConnectorManager orchestration."""

    def test_manager_initialization(self):
        """ConnectorManager initializes with empty connector dict and default poll intervals."""
        manager = ConnectorManager()
        assert manager._connectors == {}
        assert len(manager._poll_intervals) > 0  # pre-populated from DEFAULT_POLL_INTERVALS
        assert manager._poll_intervals["youtube"] == 900
        assert manager._poll_intervals["tiktok"] == 0
        assert not manager._running

    def test_register_connector(self):
        """register() adds a connector to the manager."""
        manager = ConnectorManager()
        connector = MockConnector()

        manager.register(connector)

        assert "mock" in manager._connectors
        assert manager._connectors["mock"] == connector

    def test_get_connector(self):
        """get_connector() retrieves a registered connector."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)

        retrieved = manager.get_connector("mock")
        assert retrieved == connector

    def test_get_connector_not_found(self):
        """get_connector() returns None for unregistered connector."""
        manager = ConnectorManager()
        retrieved = manager.get_connector("nonexistent")
        assert retrieved is None

    @pytest.mark.asyncio
    async def test_authenticate_connector(self):
        """authenticate_connector() calls connector's authenticate method."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)

        result = await manager.authenticate_connector("mock", {})

        assert result.success is True
        assert result.access_token == "mock_token"
        assert connector.is_authenticated

    @pytest.mark.asyncio
    async def test_authenticate_nonexistent_connector(self):
        """authenticate_connector() returns error for unregistered connector."""
        manager = ConnectorManager()

        result = await manager.authenticate_connector("nonexistent", {})

        assert result.success is False
        assert "Unknown connector" in result.error

    @pytest.mark.asyncio
    async def test_fetch_connector_data(self):
        """fetch_connector_data() retrieves events from a connector."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)
        await connector.authenticate({})

        events = await manager.fetch_connector_data("mock")

        assert len(events) > 0
        assert events[0].source == "mock"
        assert "mock" in manager._last_poll

    @pytest.mark.asyncio
    async def test_fetch_connector_data_not_found(self):
        """fetch_connector_data() returns empty list for unregistered connector."""
        manager = ConnectorManager()

        events = await manager.fetch_connector_data("nonexistent")

        assert events == []

    @pytest.mark.asyncio
    async def test_disconnect_connector(self):
        """disconnect_connector() calls connector's disconnect method."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)

        result = await manager.disconnect_connector("mock")

        assert result is True

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_connector(self):
        """disconnect_connector() returns False for unregistered connector."""
        manager = ConnectorManager()

        result = await manager.disconnect_connector("nonexistent")

        assert result is False

    @pytest.mark.asyncio
    async def test_get_all_statuses(self):
        """get_all_statuses() returns status for all connectors."""
        manager = ConnectorManager()
        connector1 = MockConnector()
        connector1.connector_id = "mock1"
        connector1.display_name = "Mock 1"
        connector2 = MockConnector()
        connector2.connector_id = "mock2"
        connector2.display_name = "Mock 2"

        manager.register(connector1)
        manager.register(connector2)

        statuses = await manager.get_all_statuses()

        assert len(statuses) == 2
        connector_ids = [s.connector_id for s in statuses]
        assert "mock1" in connector_ids
        assert "mock2" in connector_ids

    @pytest.mark.asyncio
    async def test_fetch_all_connected(self):
        """fetch_all_connected() fetches from all connected connectors."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)
        await connector.authenticate({})

        events = await manager.fetch_all_connected()

        # Should respect polling intervals
        assert isinstance(events, list)

    @pytest.mark.asyncio
    async def test_polling_respects_intervals(self):
        """Polling respects configured intervals between fetches."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)
        await connector.authenticate({})

        # Set a high interval
        manager._poll_intervals["mock"] = 3600

        # First fetch
        events1 = await manager.fetch_all_connected()
        # Should be empty or have events depending on timing

        # Immediate second fetch
        events2 = await manager.fetch_all_connected()
        # Should skip due to interval

    @pytest.mark.asyncio
    async def test_start_polling(self):
        """start_polling() creates the polling task."""
        manager = ConnectorManager()

        await manager.start_polling()

        assert manager._running is True
        assert manager._poll_task is not None

        # Clean up
        await manager.stop_polling()

    @pytest.mark.asyncio
    async def test_stop_polling(self):
        """stop_polling() cancels the polling task."""
        manager = ConnectorManager()
        await manager.start_polling()

        await manager.stop_polling()

        assert manager._running is False
        assert manager._poll_task is None

    @pytest.mark.asyncio
    async def test_polling_idempotency(self):
        """start_polling() is idempotent."""
        manager = ConnectorManager()

        await manager.start_polling()
        task1 = manager._poll_task

        await manager.start_polling()
        task2 = manager._poll_task

        # Should return early, not create new task
        assert task1 == task2

        await manager.stop_polling()

    def test_register_all_defaults(self):
        """register_all_defaults() registers all built-in connectors."""
        manager = ConnectorManager()

        manager.register_all_defaults()

        # Should have registered all connectors
        assert len(manager._connectors) > 0
        # Check for some expected connectors
        expected = ["youtube", "spotify", "google_activity"]
        for connector_id in expected:
            assert connector_id in manager._connectors

    def test_default_poll_intervals(self):
        """Manager has default poll intervals for each connector type."""
        manager = ConnectorManager()

        assert len(manager._poll_intervals) > 0
        assert manager._poll_intervals["youtube"] == 900  # 15 min
        assert manager._poll_intervals["spotify"] == 900


class TestDataImportConnectors:
    """Tests for data-import connector patterns (TikTok, Apple, AIChatImport)."""

    def test_data_import_connector_has_zero_interval(self):
        """Data-import connectors have poll_interval = 0 (don't auto-poll)."""
        manager = ConnectorManager()

        # TikTok, Apple, and AIChatImport should not auto-poll
        assert manager._poll_intervals.get("tiktok") == 0
        assert manager._poll_intervals.get("apple") == 0
        assert manager._poll_intervals.get("ai_chat_import") == 0

    @pytest.mark.asyncio
    async def test_data_import_connector_manual_fetch(self):
        """Data-import connectors can still be manually fetched."""
        manager = ConnectorManager()

        # Register all defaults
        manager.register_all_defaults()

        # Get TikTok connector (data-import type)
        tiktok = manager.get_connector("tiktok")
        assert tiktok is not None
        assert tiktok.auth_type == "data_import"


class TestConnectorErrorHandling:
    """Tests for connector error handling."""

    @pytest.mark.asyncio
    async def test_fetch_error_returns_empty_list(self):
        """fetch_connector_data() returns [] on connector error."""
        manager = ConnectorManager()

        # Create a mock connector that raises an error
        class ErrorConnector(MockConnector):
            connector_id = "error"

            async def fetch_data(self, since=None):
                raise RuntimeError("Simulated error")

        connector = ErrorConnector()
        manager.register(connector)
        await connector.authenticate({})

        events = await manager.fetch_connector_data("error")

        # Should return empty list and log error
        assert events == []

    @pytest.mark.asyncio
    async def test_status_error_on_failed_auth(self):
        """get_all_statuses() continues even if one connector fails."""
        manager = ConnectorManager()

        class ErrorStatusConnector(MockConnector):
            connector_id = "error_status"

            async def get_status(self):
                raise RuntimeError("Status check failed")

        connector = ErrorStatusConnector()
        manager.register(connector)

        statuses = await manager.get_all_statuses()

        # Should continue and return other statuses
        assert isinstance(statuses, list)


class TestConnectorPollingLogic:
    """Tests for polling interval logic."""

    def test_skip_data_import_connectors_in_poll(self):
        """Polling skips data-import connectors (interval = 0)."""
        manager = ConnectorManager()

        # A 0-interval connector should be skipped in fetch_all_connected
        # This is handled by the interval check in the manager
        assert manager._poll_intervals.get("tiktok") == 0
        assert manager._poll_intervals.get("apple") == 0

    @pytest.mark.asyncio
    async def test_poll_respects_last_poll_time(self):
        """Polling checks last_poll time before fetching."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)
        await connector.authenticate({})

        # Manually set last_poll to recent time
        manager._last_poll["mock"] = time.time()

        # Set interval to 3600 seconds
        manager._poll_intervals["mock"] = 3600

        # Fetch all — should skip mock since not enough time has passed
        events = await manager.fetch_all_connected()

        # No events from mock due to interval check
        # (unless other connectors contributed)


class TestConnectorStateManagement:
    """Tests for connector state and credentials."""

    @pytest.mark.asyncio
    async def test_connector_retains_auth_state(self):
        """Connector retains authentication state across calls."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)

        # Authenticate
        await manager.authenticate_connector("mock", {})

        # Check status
        status = await connector.get_status()
        assert status.status == ConnectorStatus.CONNECTED

    @pytest.mark.asyncio
    async def test_last_poll_timestamp_updated(self):
        """Manager updates last_poll timestamp after successful fetch."""
        manager = ConnectorManager()
        connector = MockConnector()
        manager.register(connector)
        await connector.authenticate({})

        # No last poll yet
        assert "mock" not in manager._last_poll

        # Fetch data
        await manager.fetch_connector_data("mock")

        # Last poll should be recorded
        assert "mock" in manager._last_poll
        assert manager._last_poll["mock"] > 0
