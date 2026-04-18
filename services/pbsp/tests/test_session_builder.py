"""Tests for SessionBuilder."""

from collections import deque
import time

import pytest

from core.schemas import (
    BehavioralEvent, Session, MarkerType, DomainCategory, DominantMode,
    EventContext, MarkerCategory, MARKER_CATEGORY_MAP,
)
from core.session_builder import SessionBuilder


def test_session_starts_on_start_event(tmp_db):
    """SessionBuilder creates a new session on SESSION_START event."""
    builder = SessionBuilder(tmp_db)
    assert builder.current_session is None

    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    result = builder.process_event(start_event)
    assert result is None  # No completed session yet
    assert builder.current_session is not None
    assert start_event in builder.current_session.markers


def test_session_ends_on_end_event(tmp_db):
    """SessionBuilder closes session on SESSION_END event and returns completed session."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 60.0,
    )
    completed = builder.process_event(end_event)

    assert completed is not None
    assert isinstance(completed, Session)
    assert completed.end is not None
    assert completed.duration_minutes > 0
    assert builder.current_session is None  # Session closed


def test_focus_score_increases_with_deep_focus(tmp_db):
    """Focus score increases when session contains DEEP_FOCUS markers."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add deep focus event
    focus_event = BehavioralEvent(
        type=MarkerType.DEEP_FOCUS,
        source="test",
        timestamp=time.time() + 10.0,
        confidence=0.9,
    )
    builder.process_event(focus_event)

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert completed.summary.focus_score > 0.0


def test_struggle_score_increases_with_rapid_editing(tmp_db):
    """Struggle score increases when session contains struggle markers."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add rapid editing event
    struggle_event = BehavioralEvent(
        type=MarkerType.RAPID_EDITING,
        source="test",
        timestamp=time.time() + 10.0,
        confidence=0.8,
    )
    builder.process_event(struggle_event)

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert completed.summary.struggle_score > 0.0


def test_dominant_mode_focus(tmp_db):
    """Dominant mode is FOCUS when session has mostly focus_productivity markers."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add multiple deep focus events (FOCUS_PRODUCTIVITY category)
    for i in range(3):
        focus_event = BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
            timestamp=time.time() + 10.0 + i * 5,
        )
        builder.process_event(focus_event)

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert completed.summary.dominant_mode == DominantMode.FOCUS


def test_dominant_mode_escape(tmp_db):
    """Dominant mode is ESCAPE when session has mostly avoidance_escape markers."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add multiple context escape events (AVOIDANCE_ESCAPE category)
    for i in range(3):
        escape_event = BehavioralEvent(
            type=MarkerType.CONTEXT_ESCAPE,
            source="test",
            timestamp=time.time() + 10.0 + i * 5,
        )
        builder.process_event(escape_event)

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert completed.summary.dominant_mode == DominantMode.ESCAPE


def test_session_marker_counts(tmp_db):
    """SessionBuilder counts markers by type."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add multiple marker types
    builder.process_event(BehavioralEvent(
        type=MarkerType.DEEP_FOCUS,
        source="test",
        timestamp=time.time() + 10.0,
    ))
    builder.process_event(BehavioralEvent(
        type=MarkerType.DEEP_FOCUS,
        source="test",
        timestamp=time.time() + 15.0,
    ))
    builder.process_event(BehavioralEvent(
        type=MarkerType.RAPID_EDITING,
        source="test",
        timestamp=time.time() + 20.0,
    ))

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert completed.marker_counts.get(MarkerType.DEEP_FOCUS.value) == 2
    assert completed.marker_counts.get(MarkerType.RAPID_EDITING.value) == 1


def test_session_top_apps_extracted(tmp_db):
    """SessionBuilder extracts top apps from marker contexts."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add events from different apps
    for i in range(3):
        builder.process_event(BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
            timestamp=time.time() + 10.0 + i * 5,
            context=EventContext(app="VSCode"),
        ))
    for i in range(2):
        builder.process_event(BehavioralEvent(
            type=MarkerType.RAPID_EDITING,
            source="test",
            timestamp=time.time() + 30.0 + i * 5,
            context=EventContext(app="Chrome"),
        ))

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert "VSCode" in completed.summary.top_apps
    assert "Chrome" in completed.summary.top_apps


def test_session_top_domains_extracted(tmp_db):
    """SessionBuilder extracts top domains from marker contexts."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add events from different domains
    for i in range(3):
        builder.process_event(BehavioralEvent(
            type=MarkerType.SEARCH_QUERY,
            source="test",
            timestamp=time.time() + 10.0 + i * 5,
            context=EventContext(domain="github.com"),
        ))
    for i in range(2):
        builder.process_event(BehavioralEvent(
            type=MarkerType.SEARCH_QUERY,
            source="test",
            timestamp=time.time() + 30.0 + i * 5,
            context=EventContext(domain="stackoverflow.com"),
        ))

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert "github.com" in completed.summary.top_domains
    assert "stackoverflow.com" in completed.summary.top_domains


def test_session_topic_clusters_from_search_queries(tmp_db):
    """SessionBuilder extracts search queries as topic clusters."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add search query events with metadata
    builder.process_event(BehavioralEvent(
        type=MarkerType.SEARCH_QUERY,
        source="test",
        timestamp=time.time() + 10.0,
        metadata={"query": "python async await"},
    ))
    builder.process_event(BehavioralEvent(
        type=MarkerType.SEARCH_QUERY,
        source="test",
        timestamp=time.time() + 15.0,
        metadata={"query": "asyncio context managers"},
    ))

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert "python async await" in completed.summary.topic_clusters
    assert "asyncio context managers" in completed.summary.topic_clusters


def test_force_end_current_session(tmp_db):
    """force_end_current() closes the current session without SESSION_END event."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Force end without SESSION_END event
    completed = builder.force_end_current()

    assert completed is not None
    assert completed.end is not None
    assert builder.current_session is None


def test_recent_sessions_deque(tmp_db):
    """SessionBuilder maintains a deque of recent sessions."""
    builder = SessionBuilder(tmp_db)
    assert builder.recent_sessions == []

    # Create and complete first session
    start1 = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start1)
    end1 = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 60.0,
    )
    builder.process_event(end1)

    assert len(builder.recent_sessions) == 1

    # Create and complete second session
    start2 = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time() + 61.0,
    )
    builder.process_event(start2)
    end2 = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 121.0,
    )
    builder.process_event(end2)

    assert len(builder.recent_sessions) == 2


def test_overlapping_sessions_force_close_first(tmp_db):
    """Starting a new session while one is active closes the previous session."""
    builder = SessionBuilder(tmp_db)

    # Start first session
    start1 = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start1)
    assert builder.current_session is not None

    # Start second session without ending first
    start2 = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time() + 60.0,
    )
    completed = builder.process_event(start2)

    # First session should be returned as completed
    assert completed is not None
    assert completed.end is not None
    # New session should be current
    assert builder.current_session is not None
    assert builder.current_session.start >= start2.timestamp


def test_end_without_start_returns_none(tmp_db):
    """Ending a session when none is active returns None."""
    builder = SessionBuilder(tmp_db)

    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time(),
    )
    result = builder.process_event(end_event)

    assert result is None


def test_session_events_get_session_id(tmp_db):
    """Events in a session get the session_id assigned."""
    builder = SessionBuilder(tmp_db)

    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)
    session_id = builder.current_session.session_id

    # Add an event
    regular_event = BehavioralEvent(
        type=MarkerType.DEEP_FOCUS,
        source="test",
        timestamp=time.time() + 10.0,
    )
    builder.process_event(regular_event)

    # Check session_id was assigned
    assert regular_event.session_id == session_id


def test_productivity_score_with_search_queries(tmp_db):
    """Productivity score includes search queries."""
    builder = SessionBuilder(tmp_db)

    # Start session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    # Add search query events (contribute to productivity)
    for i in range(3):
        builder.process_event(BehavioralEvent(
            type=MarkerType.SEARCH_QUERY,
            source="test",
            timestamp=time.time() + 10.0 + i * 5,
        ))

    # End session
    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 120.0,
    )
    completed = builder.process_event(end_event)

    assert completed.summary.productivity_score > 0.0


def test_empty_session_has_default_scores(tmp_db):
    """A session with no markers has default zero scores."""
    builder = SessionBuilder(tmp_db)

    # Start and immediately end session
    start_event = BehavioralEvent(
        type=MarkerType.SESSION_START,
        source="test",
        timestamp=time.time(),
    )
    builder.process_event(start_event)

    end_event = BehavioralEvent(
        type=MarkerType.SESSION_END,
        source="test",
        timestamp=time.time() + 60.0,
    )
    completed = builder.process_event(end_event)

    assert completed.summary.focus_score == 0.0
    assert completed.summary.struggle_score == 0.0
    assert completed.summary.productivity_score == 0.0
    assert completed.summary.dominant_mode == DominantMode.EXPLORE
