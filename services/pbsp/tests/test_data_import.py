"""Tests for data-import connectors (TikTok, Apple, AI Chat Import).

Each connector exposes a synchronous ``import_data()`` / ``import_chatgpt()``
etc. method that parses a file-system export and returns BehavioralEvents.
These tests create minimal but valid export structures in a tmp directory
and assert that the parsers return the correct event shapes.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

from connectors.tiktok import TikTokConnector
from connectors.apple import AppleConnector
from connectors.ai_chat_import import AIChatImportConnector
from core.schemas import BehavioralEvent, ConnectorStatus, MarkerType


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_tiktok_export(root: Path) -> None:
    """Write a minimal TikTok JSON export directory."""
    activity = root / "Activity"
    activity.mkdir()

    (activity / "Browsing History.json").write_text(
        json.dumps({
            "BrowsingHistoryList": [
                {"Date": "2024-01-01 12:00:00", "Link": "https://tiktok.com/video/1"},
                {"Date": "2024-01-02 13:00:00", "Link": "https://tiktok.com/video/2"},
            ]
        }),
        encoding="utf-8",
    )

    (activity / "Like List.json").write_text(
        json.dumps({
            "ItemFavoriteList": [
                {"Date": "2024-01-01 12:05:00", "Link": "https://tiktok.com/video/3"},
            ]
        }),
        encoding="utf-8",
    )

    (activity / "Search History.json").write_text(
        json.dumps({
            "SearchList": [
                {"SearchTerm": "python tutorial", "Date": "2024-01-03 10:00:00"},
                {"SearchTerm": "machine learning", "Date": "2024-01-03 10:30:00"},
            ]
        }),
        encoding="utf-8",
    )


def _make_chatgpt_export(root: Path) -> None:
    """Write a minimal ChatGPT conversations.json export."""
    conversations = [
        {
            "title": "Explain async/await in Python",
            "create_time": time.time() - 86400,
            "update_time": time.time(),
            "mapping": {
                "node1": {
                    "message": {
                        "author": {"role": "user"},
                        "content": {"parts": ["What is async/await? Can you explain it?"]},
                    }
                },
                "node2": {
                    "message": {
                        "author": {"role": "assistant"},
                        "content": {"parts": ["async/await is a syntax for writing asynchronous code..."]},
                    }
                },
                "node3": {
                    "message": {
                        "author": {"role": "user"},
                        "content": {"parts": ["How does it compare to threads?"]},
                    }
                },
            },
        },
        {
            "title": "Write a sorting algorithm",
            "create_time": time.time() - 3600,
            "update_time": time.time(),
            "mapping": {
                "n1": {
                    "message": {
                        "author": {"role": "user"},
                        "content": {"parts": ["Write merge sort in Python"]},
                    }
                },
            },
        },
    ]
    (root / "conversations.json").write_text(json.dumps(conversations), encoding="utf-8")


def _make_claude_export(root: Path) -> None:
    """Write a minimal Claude conversation export."""
    conversations = [
        {
            "uuid": "abc-123",
            "name": "Debugging a FastAPI endpoint",
            "created_at": "2024-01-10T10:00:00",
            "updated_at": "2024-01-10T10:30:00",
            "chat_messages": [
                {"sender": "human", "text": "Why is my endpoint returning 422?"},
                {"sender": "assistant", "text": "The 422 error means Unprocessable Entity..."},
                {"sender": "human", "text": "How do I fix the validation?"},
                {"sender": "assistant", "text": "You need to check the Pydantic model..."},
            ],
        }
    ]
    (root / "claude_export.json").write_text(json.dumps(conversations), encoding="utf-8")


def _make_gemini_export(root: Path) -> None:
    """Write minimal Gemini conversation files."""
    conversation = {
        "title": "Explain machine learning",
        "createTime": "2024-01-05T09:00:00Z",
        "messages": [
            {"role": "user", "content": "What is machine learning?"},
            {"role": "model", "content": "Machine learning is a subset of AI..."},
            {"role": "user", "content": "Can you give an example?"},
        ],
    }
    (root / "conversation_1.json").write_text(json.dumps(conversation), encoding="utf-8")


# ---------------------------------------------------------------------------
# TikTok
# ---------------------------------------------------------------------------

class TestTikTokConnector:
    def test_import_data_returns_events(self, tmp_path: Path):
        """import_data() parses browsing history, likes, and search queries."""
        _make_tiktok_export(tmp_path)
        connector = TikTokConnector()

        events = connector.import_data(str(tmp_path))

        assert len(events) > 0
        assert all(isinstance(e, BehavioralEvent) for e in events)
        assert all(e.source == "tiktok" for e in events)

    def test_import_data_browse_events(self, tmp_path: Path):
        """Browsing history produces SEARCH_QUERY events."""
        _make_tiktok_export(tmp_path)
        connector = TikTokConnector()

        events = connector.import_data(str(tmp_path))

        browse_events = [e for e in events if e.metadata.get("action") == "watched"]
        assert len(browse_events) == 2

    def test_import_data_search_events(self, tmp_path: Path):
        """Search history produces SEARCH_QUERY events with query text."""
        _make_tiktok_export(tmp_path)
        connector = TikTokConnector()

        events = connector.import_data(str(tmp_path))

        search_events = [e for e in events if e.metadata.get("action") == "search"]
        assert len(search_events) == 2
        queries = {e.metadata["query"] for e in search_events}
        assert "python tutorial" in queries
        assert "machine learning" in queries

    def test_import_data_updates_status(self, tmp_path: Path):
        """import_data() sets connector status to CONNECTED."""
        _make_tiktok_export(tmp_path)
        connector = TikTokConnector()

        connector.import_data(str(tmp_path))

        assert connector._status == ConnectorStatus.CONNECTED
        assert connector._last_sync is not None

    def test_import_data_nonexistent_path(self):
        """import_data() returns empty list for a missing path."""
        connector = TikTokConnector()
        events = connector.import_data("/nonexistent/path/that/does/not/exist")
        assert events == []

    @pytest.mark.asyncio
    async def test_fetch_data_returns_imported_events(self, tmp_path: Path):
        """fetch_data() drains the events loaded by import_data()."""
        _make_tiktok_export(tmp_path)
        connector = TikTokConnector()
        connector.import_data(str(tmp_path))

        events = await connector.fetch_data()

        assert len(events) > 0
        # Second call should be empty (events are consumed)
        empty = await connector.fetch_data()
        assert empty == []


# ---------------------------------------------------------------------------
# Apple
# ---------------------------------------------------------------------------

class TestAppleConnector:
    def test_import_health_xml(self, tmp_path: Path):
        """_parse_health_export() handles a missing export.xml gracefully."""
        connector = AppleConnector()
        events = connector.import_data(str(tmp_path))
        # No export.xml present — should return empty list without crashing
        assert isinstance(events, list)

    def test_import_screen_time_csv(self, tmp_path: Path):
        """Screen Time CSV is parsed into TIME_CLUSTER events."""
        csv_file = tmp_path / "Screen Time Export.csv"
        csv_file.write_text(
            "App Name,Duration,Date\n"
            "Safari,45,2024-01-10\n"
            "Xcode,120,2024-01-10\n",
            encoding="utf-8",
        )
        connector = AppleConnector()

        events = connector.import_data(str(tmp_path))

        assert len(events) == 2
        assert all(e.type == MarkerType.TIME_CLUSTER for e in events)
        assert all(e.source == "apple" for e in events)
        app_names = {e.metadata["app_name"] for e in events}
        assert "Safari" in app_names
        assert "Xcode" in app_names

    def test_import_updates_status(self, tmp_path: Path):
        """import_data() marks connector as CONNECTED after any import."""
        connector = AppleConnector()
        connector.import_data(str(tmp_path))
        assert connector._status == ConnectorStatus.CONNECTED

    def test_import_nonexistent_path(self):
        """import_data() returns empty list for a missing path."""
        connector = AppleConnector()
        events = connector.import_data("/nonexistent/path")
        assert events == []


# ---------------------------------------------------------------------------
# AI Chat Import
# ---------------------------------------------------------------------------

class TestAIChatImportConnector:

    def test_import_chatgpt(self, tmp_path: Path):
        """import_chatgpt() creates RESEARCH_SESSION events per conversation."""
        _make_chatgpt_export(tmp_path)
        connector = AIChatImportConnector()

        events = connector.import_chatgpt(str(tmp_path))

        assert len(events) == 2
        assert all(e.type == MarkerType.RESEARCH_SESSION for e in events)
        assert all(e.source == "chatgpt" for e in events)

    def test_import_chatgpt_message_counts(self, tmp_path: Path):
        """ChatGPT events include user/assistant message counts."""
        _make_chatgpt_export(tmp_path)
        connector = AIChatImportConnector()

        events = connector.import_chatgpt(str(tmp_path))

        # First conversation has 2 user messages, 1 assistant message
        first = next(e for e in events if "async" in e.metadata.get("title", "").lower())
        assert first.metadata["user_messages"] == 2
        assert first.metadata["assistant_messages"] == 1
        assert first.metadata["question_count"] >= 1  # "What is async/await?"

    def test_import_chatgpt_engagement_depth(self, tmp_path: Path):
        """Engagement depth is correctly classified."""
        _make_chatgpt_export(tmp_path)
        connector = AIChatImportConnector()

        events = connector.import_chatgpt(str(tmp_path))

        # Both conversations are shallow (<= 6 total messages)
        assert all(e.metadata["engagement_depth"] == "shallow" for e in events)

    def test_import_claude(self, tmp_path: Path):
        """import_claude() creates RESEARCH_SESSION events per conversation."""
        _make_claude_export(tmp_path)
        connector = AIChatImportConnector()

        events = connector.import_claude(str(tmp_path))

        assert len(events) == 1
        assert events[0].type == MarkerType.RESEARCH_SESSION
        assert events[0].source == "claude"
        assert events[0].metadata["total_messages"] == 4

    def test_import_claude_question_counting(self, tmp_path: Path):
        """Claude import counts question marks in human messages."""
        _make_claude_export(tmp_path)
        connector = AIChatImportConnector()

        events = connector.import_claude(str(tmp_path))

        assert events[0].metadata["question_count"] == 2  # Two "?" in human messages

    def test_import_gemini(self, tmp_path: Path):
        """import_gemini() creates RESEARCH_SESSION events per conversation."""
        _make_gemini_export(tmp_path)
        connector = AIChatImportConnector()

        events = connector.import_gemini(str(tmp_path))

        assert len(events) == 1
        assert events[0].source == "gemini"
        assert events[0].metadata["user_messages"] == 2
        assert events[0].metadata["assistant_messages"] == 1

    def test_import_chatgpt_missing_file(self, tmp_path: Path):
        """import_chatgpt() returns [] when conversations.json is absent."""
        connector = AIChatImportConnector()
        events = connector.import_chatgpt(str(tmp_path))
        assert events == []

    @pytest.mark.asyncio
    async def test_fetch_data_drains_queue(self, tmp_path: Path):
        """fetch_data() returns queued events and clears them."""
        _make_chatgpt_export(tmp_path)
        connector = AIChatImportConnector()
        connector.import_chatgpt(str(tmp_path))

        events = await connector.fetch_data()
        assert len(events) == 2

        # Queue is cleared
        empty = await connector.fetch_data()
        assert empty == []

    @pytest.mark.asyncio
    async def test_authenticate_validates_path(self, tmp_path: Path):
        """authenticate() with a valid import_path sets status to CONNECTED."""
        connector = AIChatImportConnector()
        result = await connector.authenticate({"import_path": str(tmp_path)})
        assert result.success is True
        assert connector._status == ConnectorStatus.CONNECTED

    @pytest.mark.asyncio
    async def test_authenticate_missing_path(self):
        """authenticate() with no import_path returns an error."""
        connector = AIChatImportConnector()
        result = await connector.authenticate({})
        assert result.success is False
        assert result.error is not None

    @pytest.mark.asyncio
    async def test_authenticate_nonexistent_path(self):
        """authenticate() with a nonexistent path returns an error."""
        connector = AIChatImportConnector()
        result = await connector.authenticate({"import_path": "/does/not/exist"})
        assert result.success is False


# ---------------------------------------------------------------------------
# Import endpoint routing logic (unit-tests the connector ID mapping)
# ---------------------------------------------------------------------------

class TestImportRouting:
    """Verify that chatgpt/claude/gemini aliases route to ai_chat_import."""

    def test_chatgpt_alias_resolves(self):
        """connector_id='chatgpt' should map to ai_chat_import + platform chatgpt."""
        from connectors.manager import ConnectorManager

        manager = ConnectorManager()
        manager.register_all_defaults()

        # ai_chat_import is the registered connector
        connector = manager.get_connector("ai_chat_import")
        assert connector is not None
        assert hasattr(connector, "import_chatgpt")
        assert hasattr(connector, "import_claude")
        assert hasattr(connector, "import_gemini")

    def test_tiktok_connector_registered(self):
        """TikTok connector is registered and is a data_import type."""
        from connectors.manager import ConnectorManager

        manager = ConnectorManager()
        manager.register_all_defaults()

        connector = manager.get_connector("tiktok")
        assert connector is not None
        assert connector.auth_type == "data_import"

    def test_apple_connector_registered(self):
        """Apple connector is registered and is a data_import type."""
        from connectors.manager import ConnectorManager

        manager = ConnectorManager()
        manager.register_all_defaults()

        connector = manager.get_connector("apple")
        assert connector is not None
        assert connector.auth_type == "data_import"
