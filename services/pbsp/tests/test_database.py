"""Tests for Database CRUD and data management."""

import time
import json

import pytest

from core.schemas import (
    BehavioralEvent, Session, SessionSummary, SentimentResult,
    MarkerType, DominantMode, SentimentLabel, EventContext,
)


class TestEventCRUD:
    """Tests for event insert and retrieval."""

    def test_insert_single_event(self, tmp_db):
        """Database stores a single event."""
        event = BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
            timestamp=time.time(),
            confidence=0.9,
        )
        tmp_db.insert_event(event)

        events = tmp_db.get_events()
        assert len(events) == 1
        assert events[0]["event_id"] == event.event_id
        assert events[0]["type"] == MarkerType.DEEP_FOCUS.value

    def test_insert_multiple_events(self, tmp_db):
        """Database stores multiple events."""
        events = [
            BehavioralEvent(
                type=MarkerType.DEEP_FOCUS,
                source="test",
                timestamp=time.time() + i,
            )
            for i in range(5)
        ]
        for event in events:
            tmp_db.insert_event(event)

        stored = tmp_db.get_events()
        assert len(stored) == 5

    def test_insert_events_batch(self, tmp_db):
        """insert_events_batch() stores multiple events in a transaction."""
        events = [
            BehavioralEvent(
                type=MarkerType.DEEP_FOCUS,
                source="test",
                timestamp=time.time() + i,
            )
            for i in range(10)
        ]
        tmp_db.insert_events_batch(events)

        stored = tmp_db.get_events()
        assert len(stored) == 10

    def test_get_events_with_time_filter(self, tmp_db):
        """get_events() filters by timestamp range."""
        now = time.time()
        events = [
            BehavioralEvent(
                type=MarkerType.DEEP_FOCUS,
                source="test",
                timestamp=now - 1000 + i * 100,
            )
            for i in range(10)
        ]
        for event in events:
            tmp_db.insert_event(event)

        # Get only recent events
        recent = tmp_db.get_events(since=now - 500)
        assert len(recent) < 10
        for event in recent:
            assert event["timestamp"] >= now - 500

    def test_get_events_by_type(self, tmp_db):
        """get_events() filters by event type."""
        now = time.time()
        tmp_db.insert_event(BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
            timestamp=now,
        ))
        tmp_db.insert_event(BehavioralEvent(
            type=MarkerType.RAPID_EDITING,
            source="test",
            timestamp=now + 1,
        ))
        tmp_db.insert_event(BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
            timestamp=now + 2,
        ))

        deep_focus_events = tmp_db.get_events(event_type=MarkerType.DEEP_FOCUS.value)
        assert len(deep_focus_events) == 2
        assert all(e["type"] == MarkerType.DEEP_FOCUS.value for e in deep_focus_events)

    def test_get_events_by_source(self, tmp_db):
        """get_events() filters by source."""
        now = time.time()
        tmp_db.insert_event(BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="desktop",
            timestamp=now,
        ))
        tmp_db.insert_event(BehavioralEvent(
            type=MarkerType.RAPID_EDITING,
            source="browser",
            timestamp=now + 1,
        ))

        desktop_events = tmp_db.get_events(source="desktop")
        assert len(desktop_events) == 1
        assert desktop_events[0]["source"] == "desktop"

    def test_get_events_with_pagination(self, tmp_db):
        """get_events() supports limit and offset."""
        now = time.time()
        for i in range(20):
            tmp_db.insert_event(BehavioralEvent(
                type=MarkerType.DEEP_FOCUS,
                source="test",
                timestamp=now - i,  # Most recent first
            ))

        # Get first page
        page1 = tmp_db.get_events(limit=5, offset=0)
        assert len(page1) == 5

        # Get second page
        page2 = tmp_db.get_events(limit=5, offset=5)
        assert len(page2) == 5

        # Verify no overlap
        ids1 = {e["event_id"] for e in page1}
        ids2 = {e["event_id"] for e in page2}
        assert ids1.isdisjoint(ids2)

    def test_get_event_count(self, tmp_db):
        """get_event_count() returns total event count."""
        for i in range(10):
            tmp_db.insert_event(BehavioralEvent(
                type=MarkerType.DEEP_FOCUS,
                source="test",
                timestamp=time.time() + i,
            ))

        count = tmp_db.get_event_count()
        assert count == 10

    def test_event_metadata_stored_as_json(self, tmp_db):
        """Event metadata is stored and retrieved as JSON."""
        event = BehavioralEvent(
            type=MarkerType.SEARCH_QUERY,
            source="test",
            metadata={"query": "python async", "results": 5000},
        )
        tmp_db.insert_event(event)

        stored = tmp_db.get_events()[0]
        metadata = json.loads(stored["metadata"])
        assert metadata["query"] == "python async"
        assert metadata["results"] == 5000


class TestSessionCRUD:
    """Tests for session insert and retrieval."""

    def test_insert_session(self, tmp_db):
        """Database stores a session."""
        session = Session(
            start=time.time(),
            end=time.time() + 3600,
            duration_minutes=60.0,
            summary=SessionSummary(
                focus_score=0.8,
                struggle_score=0.2,
                dominant_mode=DominantMode.FOCUS,
            ),
        )
        tmp_db.insert_session(session)

        stored = tmp_db.get_session(session.session_id)
        assert stored is not None
        assert stored["session_id"] == session.session_id
        assert stored["duration_minutes"] == 60.0

    def test_get_sessions_with_limit(self, tmp_db):
        """get_sessions() supports pagination."""
        now = time.time()
        for i in range(10):
            session = Session(
                start=now - (i * 3600),
                end=now - (i * 3600) + 1800,
                duration_minutes=30.0,
            )
            tmp_db.insert_session(session)

        sessions = tmp_db.get_sessions(limit=5)
        assert len(sessions) == 5

    def test_get_sessions_ordered_by_start_time(self, tmp_db):
        """get_sessions() returns sessions ordered by start_time descending."""
        now = time.time()
        session_ids = []
        for i in range(3):
            session = Session(
                start=now - (i * 3600),
                end=now - (i * 3600) + 1800,
            )
            tmp_db.insert_session(session)
            session_ids.append(session.session_id)

        sessions = tmp_db.get_sessions()
        # Most recent first
        assert sessions[0]["start_time"] > sessions[1]["start_time"]

    def test_get_session_by_id(self, tmp_db):
        """get_session() retrieves a specific session."""
        session = Session(
            start=time.time(),
            end=time.time() + 3600,
        )
        tmp_db.insert_session(session)

        retrieved = tmp_db.get_session(session.session_id)
        assert retrieved is not None
        assert retrieved["session_id"] == session.session_id

    def test_get_session_nonexistent_returns_none(self, tmp_db):
        """get_session() returns None for nonexistent session."""
        retrieved = tmp_db.get_session("nonexistent-id")
        assert retrieved is None

    def test_get_session_count(self, tmp_db):
        """get_session_count() returns total session count."""
        for i in range(5):
            session = Session(
                start=time.time() - (i * 3600),
            )
            tmp_db.insert_session(session)

        count = tmp_db.get_session_count()
        assert count == 5

    def test_session_summary_stored_as_json(self, tmp_db):
        """Session summary fields are stored as JSON."""
        session = Session(
            start=time.time(),
            summary=SessionSummary(
                top_apps=["VSCode", "Chrome"],
                top_domains=["github.com", "stackoverflow.com"],
                topic_clusters=["python async", "asyncio"],
            ),
        )
        tmp_db.insert_session(session)

        stored = tmp_db.get_session(session.session_id)
        apps = json.loads(stored["top_apps"])
        assert "VSCode" in apps
        domains = json.loads(stored["top_domains"])
        assert "github.com" in domains

    def test_session_upsert(self, tmp_db):
        """Inserting a session with same ID updates the existing one."""
        session = Session(
            start=time.time(),
            duration_minutes=30.0,
            summary=SessionSummary(focus_score=0.5),
        )
        tmp_db.insert_session(session)

        # Update with new data
        session.duration_minutes = 60.0
        session.summary.focus_score = 0.8
        tmp_db.insert_session(session)

        stored = tmp_db.get_session(session.session_id)
        assert stored["duration_minutes"] == 60.0
        assert stored["focus_score"] == 0.8


class TestProfileOperations:
    """Tests for profile get and update."""

    def test_get_profile(self, tmp_db):
        """get_profile() retrieves the singleton profile."""
        profile = tmp_db.get_profile()
        assert isinstance(profile, dict)
        assert profile["id"] == 1

    def test_update_profile_single_field(self, tmp_db):
        """update_profile() modifies profile fields."""
        tmp_db.update_profile({"avg_focus_score": 0.75})

        profile = tmp_db.get_profile()
        assert profile["avg_focus_score"] == 0.75

    def test_update_profile_multiple_fields(self, tmp_db):
        """update_profile() can update multiple fields at once."""
        tmp_db.update_profile({
            "avg_focus_score": 0.8,
            "avg_struggle_score": 0.3,
            "total_sessions": 50,
        })

        profile = tmp_db.get_profile()
        assert profile["avg_focus_score"] == 0.8
        assert profile["avg_struggle_score"] == 0.3
        assert profile["total_sessions"] == 50

    def test_update_profile_empty_dict_is_noop(self, tmp_db):
        """update_profile({}) does nothing."""
        tmp_db.update_profile({"avg_focus_score": 0.7})
        before = tmp_db.get_profile()

        tmp_db.update_profile({})
        after = tmp_db.get_profile()

        assert before == after

    def test_profile_last_updated_timestamp(self, tmp_db):
        """update_profile() updates the last_updated timestamp."""
        before_update = time.time()
        tmp_db.update_profile({"avg_focus_score": 0.5})
        after_update = time.time()

        profile = tmp_db.get_profile()
        assert before_update <= profile["last_updated"] <= after_update


class TestSentimentOperations:
    """Tests for sentiment result storage."""

    def test_insert_sentiment_result(self, tmp_db):
        """Database stores sentiment results."""
        result = SentimentResult(
            event_id="evt-123",
            trigger_rule="struggle",
            polarity=-0.5,
            magnitude=0.8,
            label=SentimentLabel.NEGATIVE,
            input_text="struggling with code",
        )
        tmp_db.insert_sentiment(result)

        # Verify it was stored by checking table
        rows = tmp_db.conn.execute("SELECT * FROM sentiment_results").fetchall()
        assert len(rows) == 1
        assert rows[0]["trigger_rule"] == "struggle"
        assert rows[0]["label"] == SentimentLabel.NEGATIVE.value

    def test_insert_sentiment_with_session_id(self, tmp_db):
        """Sentiment result can be associated with a session."""
        result = SentimentResult(
            session_id="sess-456",
            trigger_rule="deep_session_end",
            polarity=0.3,
            magnitude=0.6,
            label=SentimentLabel.NEUTRAL,
        )
        tmp_db.insert_sentiment(result)

        rows = tmp_db.conn.execute(
            "SELECT * FROM sentiment_results WHERE session_id = ?",
            ("sess-456",)
        ).fetchall()
        assert len(rows) == 1
        assert rows[0]["session_id"] == "sess-456"


class TestDailyAggregates:
    """Tests for daily aggregate storage."""

    def test_upsert_daily_aggregate(self, tmp_db):
        """upsert_daily_aggregate() inserts new aggregate."""
        date_key = "2026-04-15"
        data = {
            "session_count": 5,
            "total_duration": 300.0,
            "avg_focus": 0.75,
            "dominant_mode": "FOCUS",
        }
        tmp_db.upsert_daily_aggregate(date_key, data)

        row = tmp_db.conn.execute(
            "SELECT * FROM daily_aggregates WHERE date_key = ?",
            (date_key,)
        ).fetchone()
        assert row is not None
        assert row["session_count"] == 5
        assert row["total_duration"] == 300.0

    def test_upsert_daily_aggregate_updates_existing(self, tmp_db):
        """upsert_daily_aggregate() updates existing aggregate."""
        date_key = "2026-04-15"
        tmp_db.upsert_daily_aggregate(date_key, {
            "session_count": 5,
            "avg_focus": 0.75,
        })

        # Update
        tmp_db.upsert_daily_aggregate(date_key, {
            "session_count": 10,
            "avg_focus": 0.85,
        })

        row = tmp_db.conn.execute(
            "SELECT * FROM daily_aggregates WHERE date_key = ?",
            (date_key,)
        ).fetchone()
        assert row["session_count"] == 10
        assert row["avg_focus"] == 0.85


class TestDataManagementGDPR:
    """Tests for GDPR export and deletion."""

    def test_export_all_empty_database(self, tmp_db):
        """export_all() returns structure with empty tables."""
        exported = tmp_db.export_all()

        assert "events" in exported
        assert "sessions" in exported
        assert "profile" in exported
        assert "sentiment_results" in exported
        assert "daily_aggregates" in exported

        # Profile should have the singleton row
        assert len(exported["profile"]) == 1

    def test_export_all_with_data(self, tmp_db):
        """export_all() includes all stored data."""
        # Add various data
        event = BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
        )
        tmp_db.insert_event(event)

        session = Session(start=time.time())
        tmp_db.insert_session(session)

        tmp_db.update_profile({"avg_focus_score": 0.8})

        exported = tmp_db.export_all()

        assert len(exported["events"]) >= 1
        assert len(exported["sessions"]) >= 1
        assert exported["profile"][0]["avg_focus_score"] == 0.8

    def test_delete_all_clears_data(self, tmp_db):
        """delete_all() removes all user data and resets profile."""
        # Add data
        for i in range(5):
            event = BehavioralEvent(
                type=MarkerType.DEEP_FOCUS,
                source="test",
                timestamp=time.time() + i,
            )
            tmp_db.insert_event(event)

        session = Session(start=time.time())
        tmp_db.insert_session(session)

        # Delete all
        tmp_db.delete_all()

        # Verify cleared
        assert tmp_db.get_event_count() == 0
        assert tmp_db.get_session_count() == 0

        # Profile should be reset
        profile = tmp_db.get_profile()
        assert profile["id"] == 1
        assert profile.get("avg_focus_score") is None or profile["avg_focus_score"] == 0.0


class TestDatabaseTransactions:
    """Tests for transaction handling."""

    def test_batch_insert_with_transaction(self, tmp_db):
        """Transaction context manager commits on success."""
        events = [
            BehavioralEvent(
                type=MarkerType.DEEP_FOCUS,
                source="test",
                timestamp=time.time() + i,
            )
            for i in range(3)
        ]

        with tmp_db.transaction():
            for event in events:
                tmp_db.insert_event(event)

        assert tmp_db.get_event_count() == 3

    def test_transaction_rollback_on_error(self, tmp_db):
        """Transaction rolls back on exception."""
        # Add initial event
        event = BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
        )
        tmp_db.insert_event(event)
        initial_count = tmp_db.get_event_count()

        # Transaction that fails
        try:
            with tmp_db.transaction():
                tmp_db.insert_event(BehavioralEvent(
                    type=MarkerType.RAPID_EDITING,
                    source="test",
                ))
                raise ValueError("Deliberate error")
        except ValueError:
            pass

        # Count should be same (rollback occurred)
        assert tmp_db.get_event_count() == initial_count


class TestDatabaseSchema:
    """Tests for database schema and integrity."""

    def test_schema_initialization(self, tmp_db):
        """Database initializes with all required tables."""
        tables = tmp_db.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        table_names = [t[0] for t in tables]

        required_tables = [
            "events", "sessions", "profile", "sentiment_results",
            "connectors", "daily_aggregates", "crypto_meta",
        ]
        for table in required_tables:
            assert table in table_names

    def test_profile_singleton_exists(self, tmp_db):
        """Profile table has singleton row after initialization."""
        profile = tmp_db.get_profile()
        assert profile is not None
        assert profile["id"] == 1
