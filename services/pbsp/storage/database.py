"""SQLite storage layer with async support.

Manages the local PBSP database: schema creation, event/session CRUD,
profile updates, and batch operations.  All data stays on the user's device.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Any

from core.schemas import BehavioralEvent, Session, SessionSummary, BehavioralProfile, SentimentResult


_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS events (
    event_id        TEXT PRIMARY KEY,
    type            TEXT NOT NULL,
    source          TEXT NOT NULL,
    timestamp       REAL NOT NULL,
    confidence      REAL NOT NULL DEFAULT 0.5,
    context_app     TEXT,
    context_title   TEXT,
    context_url     TEXT,
    context_domain  TEXT,
    context_category TEXT,
    context_duration REAL,
    -- Nexus content metadata
    lesson_id       TEXT,
    course_id       TEXT,
    topic_tags      TEXT,   -- JSON array
    difficulty      INTEGER,
    content_type    TEXT,
    metadata        TEXT,
    session_id      TEXT,
    created_at      REAL NOT NULL DEFAULT (unixepoch('subsec'))
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

CREATE TABLE IF NOT EXISTS sessions (
    session_id       TEXT PRIMARY KEY,
    start_time       REAL NOT NULL,
    end_time         REAL,
    duration_minutes REAL,
    focus_score      REAL,
    struggle_score   REAL,
    productivity_score REAL,
    dominant_mode    TEXT,
    marker_counts    TEXT,
    top_apps         TEXT,
    top_domains      TEXT,
    topic_clusters   TEXT,
    embedding        BLOB,
    created_at       REAL NOT NULL DEFAULT (unixepoch('subsec'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions(dominant_mode);

CREATE TABLE IF NOT EXISTS profile (
    id                          INTEGER PRIMARY KEY DEFAULT 1,
    user_nexus_id               TEXT,
    trait_exploration_breadth   REAL DEFAULT 0.5,
    trait_focus_consistency     REAL DEFAULT 0.5,
    trait_social_orientation    REAL DEFAULT 0.5,
    trait_friction_tolerance    REAL DEFAULT 0.5,
    trait_emotional_volatility  REAL DEFAULT 0.5,
    trait_confidence            REAL DEFAULT 0.0,
    learning_style_primary      TEXT,
    learning_style_secondary    TEXT,
    learning_approach           TEXT,
    learning_mode               TEXT,
    avg_focus_score             REAL DEFAULT 0.0,
    avg_struggle_score          REAL DEFAULT 0.0,
    peak_focus_hours            TEXT,
    low_energy_hours            TEXT,
    top_interests               TEXT,
    burnout_risk_score          REAL DEFAULT 0.0,
    total_sessions              INTEGER DEFAULT 0,
    total_events                INTEGER DEFAULT 0,
    last_updated                REAL NOT NULL DEFAULT (unixepoch('subsec'))
);

CREATE TABLE IF NOT EXISTS sentiment_results (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        TEXT,
    session_id      TEXT,
    trigger_rule    TEXT NOT NULL,
    polarity        REAL NOT NULL,
    magnitude       REAL NOT NULL,
    label           TEXT NOT NULL,
    input_text      TEXT,
    created_at      REAL NOT NULL DEFAULT (unixepoch('subsec'))
);

CREATE TABLE IF NOT EXISTS connectors (
    connector_id    TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,
    auth_type       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'disconnected',
    access_token    BLOB,
    refresh_token   BLOB,
    token_expires   REAL,
    last_sync       REAL,
    last_error      TEXT,
    config          TEXT,
    created_at      REAL NOT NULL DEFAULT (unixepoch('subsec')),
    updated_at      REAL NOT NULL DEFAULT (unixepoch('subsec'))
);

CREATE TABLE IF NOT EXISTS daily_aggregates (
    date_key        TEXT PRIMARY KEY,
    session_count   INTEGER DEFAULT 0,
    total_duration  REAL DEFAULT 0,
    avg_focus       REAL DEFAULT 0,
    avg_struggle    REAL DEFAULT 0,
    dominant_mode   TEXT,
    marker_counts   TEXT,
    top_apps        TEXT,
    top_topics      TEXT,
    sentiment_avg   REAL
);

CREATE TABLE IF NOT EXISTS crypto_meta (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    salt            BLOB NOT NULL,
    key_check       BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_nexus_id   TEXT,
    lesson_id       TEXT,
    course_id       TEXT,
    content_type    TEXT,
    topic_tags      TEXT,   -- JSON array
    difficulty_felt TEXT,   -- "too_easy" | "just_right" | "too_hard"
    helpfulness     INTEGER CHECK(helpfulness BETWEEN 1 AND 5),
    engagement      INTEGER CHECK(engagement BETWEEN 1 AND 5),
    would_revisit   INTEGER CHECK(would_revisit IN (0, 1)),
    free_text       TEXT,
    session_id      TEXT,
    created_at      REAL NOT NULL DEFAULT (unixepoch('subsec'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_lesson ON feedback(lesson_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_nexus_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
"""

# Migrations applied to existing databases (idempotent ALTER TABLE statements)
_MIGRATIONS_SQL = [
    "ALTER TABLE events ADD COLUMN lesson_id TEXT",
    "ALTER TABLE events ADD COLUMN course_id TEXT",
    "ALTER TABLE events ADD COLUMN topic_tags TEXT",
    "ALTER TABLE events ADD COLUMN difficulty INTEGER",
    "ALTER TABLE events ADD COLUMN content_type TEXT",
]


class Database:
    """Synchronous SQLite wrapper for the PBSP local database."""

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn: sqlite3.Connection | None = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA synchronous=NORMAL")
            self._conn.execute("PRAGMA foreign_keys=ON")
        return self._conn

    def initialize(self) -> None:
        self.conn.executescript(_SCHEMA_SQL)
        # Apply additive migrations for existing databases (errors are expected
        # when the column already exists — SQLite has no IF NOT EXISTS for ALTER)
        for stmt in _MIGRATIONS_SQL:
            try:
                self.conn.execute(stmt)
            except Exception:
                pass
        # Ensure singleton profile row exists
        self.conn.execute("INSERT OR IGNORE INTO profile (id) VALUES (1)")
        self.conn.commit()

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    @contextmanager
    def transaction(self):
        try:
            yield self.conn
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise

    # -----------------------------------------------------------------------
    # Events
    # -----------------------------------------------------------------------

    def insert_event(self, event: BehavioralEvent) -> None:
        ctx = event.context
        self.conn.execute(
            """INSERT OR IGNORE INTO events
               (event_id, type, source, timestamp, confidence,
                context_app, context_title, context_url, context_domain,
                context_category, context_duration,
                lesson_id, course_id, topic_tags, difficulty, content_type,
                metadata, session_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event.event_id, event.type.value, event.source, event.timestamp,
                event.confidence, ctx.app, ctx.window_title,
                ctx.url, ctx.domain, ctx.domain_category.value, ctx.duration,
                ctx.lesson_id, ctx.course_id,
                json.dumps(ctx.topic_tags) if ctx.topic_tags else None,
                ctx.difficulty, ctx.content_type,
                json.dumps(event.metadata), event.session_id,
            ),
        )

    def insert_events_batch(self, events: list[BehavioralEvent]) -> None:
        with self.transaction():
            for event in events:
                self.insert_event(event)

    def get_events(
        self,
        since: float | None = None,
        until: float | None = None,
        event_type: str | None = None,
        source: str | None = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if since is not None:
            clauses.append("timestamp >= ?")
            params.append(since)
        if until is not None:
            clauses.append("timestamp <= ?")
            params.append(until)
        if event_type is not None:
            clauses.append("type = ?")
            params.append(event_type)
        if source is not None:
            clauses.append("source = ?")
            params.append(source)

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.extend([limit, offset])
        rows = self.conn.execute(
            f"SELECT * FROM events {where} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
            params,
        ).fetchall()
        return [dict(row) for row in rows]

    def get_event_count(self) -> int:
        row = self.conn.execute("SELECT COUNT(*) as cnt FROM events").fetchone()
        return row["cnt"]

    # -----------------------------------------------------------------------
    # Sessions
    # -----------------------------------------------------------------------

    def insert_session(self, session: Session) -> None:
        with self.transaction():
            self.conn.execute(
                """INSERT OR REPLACE INTO sessions
                   (session_id, start_time, end_time, duration_minutes,
                    focus_score, struggle_score, productivity_score, dominant_mode,
                    marker_counts, top_apps, top_domains, topic_clusters)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    session.session_id, session.start, session.end,
                    session.duration_minutes,
                    session.summary.focus_score, session.summary.struggle_score,
                    session.summary.productivity_score, session.summary.dominant_mode.value,
                    json.dumps(session.marker_counts),
                    json.dumps(session.summary.top_apps),
                    json.dumps(session.summary.top_domains),
                    json.dumps(session.summary.topic_clusters),
                ),
            )

    def get_sessions(
        self, limit: int = 50, offset: int = 0
    ) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM sessions ORDER BY start_time DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [dict(row) for row in rows]

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        return dict(row) if row else None

    def get_session_count(self) -> int:
        row = self.conn.execute("SELECT COUNT(*) as cnt FROM sessions").fetchone()
        return row["cnt"]

    # -----------------------------------------------------------------------
    # Profile
    # -----------------------------------------------------------------------

    def get_profile(self) -> dict[str, Any]:
        row = self.conn.execute("SELECT * FROM profile WHERE id = 1").fetchone()
        return dict(row) if row else {}

    def update_profile(self, updates: dict[str, Any]) -> None:
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values())
        self.conn.execute(
            f"UPDATE profile SET {set_clause}, last_updated = unixepoch('subsec') WHERE id = 1",
            values,
        )
        self.conn.commit()

    # -----------------------------------------------------------------------
    # Sentiment
    # -----------------------------------------------------------------------

    def insert_sentiment(self, result: SentimentResult) -> None:
        self.conn.execute(
            """INSERT INTO sentiment_results
               (event_id, session_id, trigger_rule, polarity, magnitude, label, input_text)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                result.event_id, result.session_id, result.trigger_rule,
                result.polarity, result.magnitude, result.label.value,
                result.input_text,
            ),
        )
        self.conn.commit()

    # -----------------------------------------------------------------------
    # Feedback
    # -----------------------------------------------------------------------

    def insert_feedback(self, feedback: dict[str, Any]) -> int:
        """Insert a content feedback record. Returns the new row id."""
        fields = [
            "user_nexus_id", "lesson_id", "course_id", "content_type",
            "topic_tags", "difficulty_felt", "helpfulness", "engagement",
            "would_revisit", "free_text", "session_id",
        ]
        cols = ", ".join(fields)
        placeholders = ", ".join("?" for _ in fields)
        cursor = self.conn.execute(
            f"INSERT INTO feedback ({cols}) VALUES ({placeholders})",
            tuple(
                json.dumps(feedback.get("topic_tags")) if k == "topic_tags" else feedback.get(k)
                for k in fields
            ),
        )
        self.conn.commit()
        return cursor.lastrowid

    def get_feedback(
        self,
        lesson_id: str | None = None,
        user_nexus_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if lesson_id:
            clauses.append("lesson_id = ?")
            params.append(lesson_id)
        if user_nexus_id:
            clauses.append("user_nexus_id = ?")
            params.append(user_nexus_id)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.extend([limit, offset])
        rows = self.conn.execute(
            f"SELECT * FROM feedback {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params,
        ).fetchall()
        return [dict(r) for r in rows]

    def get_feedback_summary(self, lesson_id: str) -> dict[str, Any]:
        """Aggregate helpfulness and difficulty stats for a lesson."""
        row = self.conn.execute(
            """SELECT
                COUNT(*) as response_count,
                AVG(helpfulness) as avg_helpfulness,
                AVG(engagement) as avg_engagement,
                SUM(CASE WHEN difficulty_felt = 'too_hard' THEN 1 ELSE 0 END) as too_hard_count,
                SUM(CASE WHEN difficulty_felt = 'just_right' THEN 1 ELSE 0 END) as just_right_count,
                SUM(CASE WHEN difficulty_felt = 'too_easy' THEN 1 ELSE 0 END) as too_easy_count,
                SUM(CASE WHEN would_revisit = 1 THEN 1 ELSE 0 END) as would_revisit_count
               FROM feedback WHERE lesson_id = ?""",
            (lesson_id,),
        ).fetchone()
        return dict(row) if row else {}

    # -----------------------------------------------------------------------
    # Daily Aggregates
    # -----------------------------------------------------------------------

    def upsert_daily_aggregate(self, date_key: str, data: dict[str, Any]) -> None:
        cols = ", ".join(data.keys())
        placeholders = ", ".join("?" for _ in data)
        conflict_updates = ", ".join(f"{k} = excluded.{k}" for k in data if k != "date_key")
        self.conn.execute(
            f"""INSERT INTO daily_aggregates (date_key, {cols})
                VALUES (?, {placeholders})
                ON CONFLICT(date_key) DO UPDATE SET {conflict_updates}""",
            (date_key, *data.values()),
        )
        self.conn.commit()

    # -----------------------------------------------------------------------
    # Data Management (GDPR)
    # -----------------------------------------------------------------------

    def export_all(self) -> dict[str, list[dict]]:
        tables = ["events", "sessions", "profile", "sentiment_results", "daily_aggregates", "feedback"]
        result = {}
        for table in tables:
            rows = self.conn.execute(f"SELECT * FROM {table}").fetchall()
            result[table] = [dict(r) for r in rows]
        return result

    def delete_all(self) -> None:
        tables = ["events", "sessions", "sentiment_results", "daily_aggregates", "connectors", "feedback"]
        with self.transaction():
            for table in tables:
                self.conn.execute(f"DELETE FROM {table}")
            self.conn.execute("DELETE FROM profile")
            self.conn.execute("INSERT INTO profile (id) VALUES (1)")
        self.conn.execute("VACUUM")
