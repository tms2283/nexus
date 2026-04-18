"""Shared pytest fixtures for PBSP tests."""

from __future__ import annotations

import time
from collections import deque
from pathlib import Path

import pytest

from core.schemas import AgentState, BehavioralEvent, EventContext, MarkerType, DomainCategory
from storage.database import Database


@pytest.fixture
def tmp_db(tmp_path: Path) -> Database:
    """In-memory or temp-file SQLite DB, initialized with schema."""
    db = Database(tmp_path / "test.db")
    db.initialize()
    yield db
    db.conn.close()


@pytest.fixture
def agent_state() -> AgentState:
    """Default AgentState with neutral values for testing."""
    return AgentState(
        timestamp=time.time(),
        active_app="Code",
        window_title="main.py - VSCode",
        keystroke_rate=2.0,
        backspace_rate=0.05,
        typing_variance=0.1,
        inter_key_interval=0.5,
        click_rate=0.1,
        scroll_velocity=0.0,
        mouse_idle_seconds=0.0,
        app_switches=0,
        app_switch_history=[],
        focus_app="Code",
        focus_duration=0.0,
        idle_seconds=0.0,
        active_seconds=0.0,
    )


@pytest.fixture
def event_history() -> deque:
    """Empty deque for history parameter in detector tests."""
    return deque(maxlen=200)


@pytest.fixture
def sample_event() -> BehavioralEvent:
    """A generic SEARCH_QUERY event for reuse."""
    return BehavioralEvent(
        type=MarkerType.SEARCH_QUERY,
        source="test",
        confidence=0.8,
        context=EventContext(
            app="Chrome",
            window_title="python tutorial - Google Search",
            domain="google.com",
            domain_category=DomainCategory.LEARNING,
        ),
        metadata={"query": "python tutorial"},
    )


pytest_plugins = ["pytest_asyncio"]
