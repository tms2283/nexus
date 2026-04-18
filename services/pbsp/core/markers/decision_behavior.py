"""E. Decision Behavior markers — signals of deliberation and comparison."""

from __future__ import annotations

import time
from collections import Counter, deque

from core.schemas import AgentState, BehavioralEvent, MarkerResult, MarkerType, MarkerCategory, EventContext
from core.markers.base import BaseMarkerDetector


class ComparisonLoopDetector(BaseMarkerDetector):
    """Fires when user alternates between 2-4 tabs/documents repeatedly (3+ cycles)."""
    marker_id = MarkerType.COMPARISON_LOOP
    category = MarkerCategory.DECISION_BEHAVIOR
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if len(state.app_switch_history) < 6:
            return None

        recent = state.app_switch_history[-20:]
        unique = set(recent)

        # 2-4 distinct windows being alternated
        if not (2 <= len(unique) <= 4):
            return None

        # Count transitions — if each app appears 3+ times, it's a comparison loop
        counts = Counter(recent)
        if all(c >= 3 for c in counts.values()):
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.05 * min(counts.values()), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "alternating_apps": list(unique),
                    "cycle_counts": dict(counts),
                },
            )
        return None


class TabRevisitDetector(BaseMarkerDetector):
    """Fires when the same URL/tab title is returned to 3+ times within a session."""
    marker_id = MarkerType.TAB_REVISIT
    category = MarkerCategory.DECISION_BEHAVIOR
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = time.time()
        window = 20 * 60  # 20 minutes

        title_counts: Counter[str] = Counter()
        for event in history:
            if now - event.timestamp > window:
                continue
            title = event.context.window_title or ""
            if title and event.type in (MarkerType.CONTEXT_SHIFT, MarkerType.SEARCH_QUERY):
                title_counts[title] += 1

        revisited = {t: c for t, c in title_counts.items() if c >= 3}
        if revisited:
            top = max(revisited, key=revisited.get)
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.1 * (revisited[top] - 3), 0.95),
                context=EventContext(app=state.active_app, window_title=top),
                metadata={"revisit_counts": revisited},
            )
        return None


class FileReopenDetector(BaseMarkerDetector):
    """Fires when the same file/document is opened/closed 3+ times."""
    marker_id = MarkerType.FILE_REOPEN
    category = MarkerCategory.DECISION_BEHAVIOR
    min_confidence = 0.6

    _FILE_EXTENSIONS = {".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".json", ".md",
                        ".txt", ".doc", ".docx", ".pdf", ".xlsx", ".csv", ".sql", ".yaml", ".yml",
                        ".xml", ".java", ".c", ".cpp", ".h", ".rs", ".go", ".rb", ".php"}

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        title = state.window_title.lower()
        is_file = any(ext in title for ext in self._FILE_EXTENSIONS)
        if not is_file:
            return None

        now = time.time()
        window = 15 * 60
        title_appearances = 0

        for event in history:
            if now - event.timestamp > window:
                continue
            evt_title = (event.context.window_title or "").lower()
            if evt_title and title[:30] in evt_title:
                title_appearances += 1

        if title_appearances >= 3:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.1 * (title_appearances - 3), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"reopen_count": title_appearances},
            )
        return None


class DelayedDecisionDetector(BaseMarkerDetector):
    """Fires when a comparison loop exceeds 5 minutes without a clear selection."""
    marker_id = MarkerType.DELAYED_DECISION
    category = MarkerCategory.DECISION_BEHAVIOR
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = time.time()
        comparison_events = [
            e for e in history
            if e.type == MarkerType.COMPARISON_LOOP
            and now - e.timestamp < 600  # 10 minute window
        ]

        if not comparison_events:
            return None

        earliest = min(e.timestamp for e in comparison_events)
        duration_min = (now - earliest) / 60

        if duration_min >= 5:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.05 * (duration_min - 5), 0.95),
                context=EventContext(
                    app=state.active_app,
                    window_title=state.window_title,
                    duration=duration_min * 60,
                ),
                metadata={
                    "decision_duration_min": round(duration_min, 1),
                    "comparison_count": len(comparison_events),
                },
            )
        return None
