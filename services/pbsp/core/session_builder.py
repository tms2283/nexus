"""Session Builder — groups events into behavioral sessions and scores them.

Sessions are bounded by SESSION_START / SESSION_END markers.  Each session
gets a focus_score, struggle_score, productivity_score, and dominant_mode
that downstream components (sentiment triggers, personality model, Nexus
API) can use directly.
"""

from __future__ import annotations

import time
from collections import Counter, deque

from core.schemas import (
    BehavioralEvent, Session, SessionSummary, MarkerType,
    DominantMode, MarkerCategory, MARKER_CATEGORY_MAP,
)
from storage.database import Database


# Weights for dominant mode calculation
_MODE_WEIGHTS: dict[MarkerCategory, DominantMode] = {
    MarkerCategory.FOCUS_PRODUCTIVITY: DominantMode.FOCUS,
    MarkerCategory.COGNITIVE_INTENT: DominantMode.EXPLORE,
    MarkerCategory.STRUGGLE_FRICTION: DominantMode.STRUGGLE,
    MarkerCategory.HABIT_ROUTINE: DominantMode.ROUTINE,
    MarkerCategory.AVOIDANCE_ESCAPE: DominantMode.ESCAPE,
}

# Markers that contribute to focus score
_FOCUS_MARKERS = {MarkerType.DEEP_FOCUS, MarkerType.FLOW_STATE, MarkerType.LOW_SWITCHING, MarkerType.TASK_COMPLETION}

# Markers that contribute to struggle score
_STRUGGLE_MARKERS = {
    MarkerType.RAPID_EDITING, MarkerType.REWRITE_LOOP, MarkerType.APP_SWITCH_THRASH,
    MarkerType.LONG_PAUSE, MarkerType.ERROR_RETRY, MarkerType.HESITATION,
}

# Markers that contribute to productivity score
_PRODUCTIVITY_MARKERS = _FOCUS_MARKERS | {MarkerType.RESEARCH_SESSION, MarkerType.SEARCH_QUERY}


class SessionBuilder:
    """Manages the lifecycle of behavioral sessions."""

    def __init__(self, db: Database) -> None:
        self.db = db
        self._current_session: Session | None = None
        self._recent_sessions: deque[Session] = deque(maxlen=100)

    @property
    def current_session(self) -> Session | None:
        return self._current_session

    @property
    def recent_sessions(self) -> list[Session]:
        return list(self._recent_sessions)

    def process_event(self, event: BehavioralEvent) -> Session | None:
        """Process an event and manage session state.

        Returns a completed Session when a session ends, otherwise None.
        """
        if event.type == MarkerType.SESSION_START:
            return self._start_session(event)

        if event.type == MarkerType.SESSION_END:
            return self._end_session(event)

        # Add event to current session
        if self._current_session is not None:
            self._current_session.markers.append(event)
            event.session_id = self._current_session.session_id

        return None

    def _start_session(self, event: BehavioralEvent) -> Session | None:
        """Start a new session. If one was already in progress, end it first."""
        completed = None

        if self._current_session is not None:
            # Force-close the current session
            completed = self._finalize_session(event.timestamp)

        self._current_session = Session(
            start=event.timestamp,
            markers=[event],
        )
        event.session_id = self._current_session.session_id
        return completed

    def _end_session(self, event: BehavioralEvent) -> Session | None:
        """End the current session and return the completed, scored session."""
        if self._current_session is None:
            return None

        self._current_session.markers.append(event)
        event.session_id = self._current_session.session_id
        return self._finalize_session(event.timestamp)

    def _finalize_session(self, end_time: float) -> Session:
        """Score and persist the current session."""
        session = self._current_session
        session.end = end_time
        session.duration_minutes = (end_time - session.start) / 60

        # Count markers by type
        type_counts: Counter[str] = Counter()
        for marker_event in session.markers:
            type_counts[marker_event.type.value] += 1
        session.marker_counts = dict(type_counts)

        # Score the session
        session.summary = self._score_session(session)

        # Persist
        try:
            self.db.insert_session(session)
        except Exception:
            pass

        # Add to recent sessions
        self._recent_sessions.append(session)

        # Reset
        self._current_session = None
        return session

    def _score_session(self, session: Session) -> SessionSummary:
        """Calculate focus, struggle, productivity scores and dominant mode."""
        total_markers = len(session.markers)
        if total_markers == 0:
            return SessionSummary()

        # Count markers in each scoring category
        focus_count = sum(1 for m in session.markers if m.type in _FOCUS_MARKERS)
        struggle_count = sum(1 for m in session.markers if m.type in _STRUGGLE_MARKERS)
        productivity_count = sum(1 for m in session.markers if m.type in _PRODUCTIVITY_MARKERS)

        # Normalize scores (0-1)
        focus_score = min(focus_count / max(total_markers * 0.3, 1), 1.0)
        struggle_score = min(struggle_count / max(total_markers * 0.3, 1), 1.0)
        productivity_score = min(productivity_count / max(total_markers * 0.3, 1), 1.0)

        # Determine dominant mode from category distribution
        category_counts: Counter[MarkerCategory] = Counter()
        for marker_event in session.markers:
            cat = MARKER_CATEGORY_MAP.get(marker_event.type)
            if cat:
                category_counts[cat] += 1

        dominant_mode = DominantMode.EXPLORE  # default
        if category_counts:
            top_category = category_counts.most_common(1)[0][0]
            dominant_mode = _MODE_WEIGHTS.get(top_category, DominantMode.EXPLORE)

        # Extract top apps and domains
        app_counts: Counter[str] = Counter()
        domain_counts: Counter[str] = Counter()
        for m in session.markers:
            if m.context.app:
                app_counts[m.context.app] += 1
            if m.context.domain:
                domain_counts[m.context.domain] += 1

        top_apps = [app for app, _ in app_counts.most_common(5)]
        top_domains = [dom for dom, _ in domain_counts.most_common(5)]

        # Extract topic clusters from search queries
        topics: list[str] = []
        for m in session.markers:
            if m.type == MarkerType.SEARCH_QUERY:
                query = m.metadata.get("query", "")
                if query:
                    topics.append(query)

        return SessionSummary(
            focus_score=round(focus_score, 3),
            struggle_score=round(struggle_score, 3),
            productivity_score=round(productivity_score, 3),
            dominant_mode=dominant_mode,
            top_apps=top_apps,
            top_domains=top_domains,
            topic_clusters=topics[:10],
        )

    def force_end_current(self) -> Session | None:
        """Force-close the current session (e.g., on agent shutdown)."""
        if self._current_session is None:
            return None
        return self._finalize_session(time.time())
