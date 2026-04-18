"""G. Habit / Routine markers — signals of recurring behavioral patterns."""

from __future__ import annotations

import time
from collections import Counter, deque
from datetime import datetime

from core.schemas import AgentState, BehavioralEvent, MarkerResult, MarkerType, MarkerCategory, EventContext
from core.markers.base import BaseMarkerDetector


class DailyPatternDetector(BaseMarkerDetector):
    """Fires when activity patterns repeat across 3+ days at similar times.
    Requires historical data — analyzes SESSION_START events."""
    marker_id = MarkerType.DAILY_PATTERN
    category = MarkerCategory.HABIT_ROUTINE
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        session_starts = [
            e for e in history
            if e.type == MarkerType.SESSION_START
        ]

        if len(session_starts) < 3:
            return None

        # Group by hour-of-day
        hour_counts: Counter[int] = Counter()
        dates_per_hour: dict[int, set[str]] = {}

        for event in session_starts:
            dt = datetime.fromtimestamp(event.timestamp)
            hour = dt.hour
            date_str = dt.strftime("%Y-%m-%d")
            hour_counts[hour] += 1
            dates_per_hour.setdefault(hour, set()).add(date_str)

        # Find hours that appear across 3+ distinct days
        recurring_hours = {
            hour: len(dates)
            for hour, dates in dates_per_hour.items()
            if len(dates) >= 3
        }

        if recurring_hours:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.05 * max(recurring_hours.values()), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"recurring_hours": recurring_hours},
            )
        return None


class AppSequenceDetector(BaseMarkerDetector):
    """Fires when the same app launch sequence occurs 3+ times across sessions."""
    marker_id = MarkerType.APP_SEQUENCE
    category = MarkerCategory.HABIT_ROUTINE
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        # Look at recent app switch patterns for bigram repetition
        apps = state.app_switch_history
        if len(apps) < 6:
            return None

        # Extract bigrams (consecutive app pairs)
        bigrams: list[tuple[str, str]] = []
        for i in range(len(apps) - 1):
            a, b = apps[i].lower(), apps[i + 1].lower()
            if a != b:  # Skip self-transitions
                bigrams.append((a, b))

        counts = Counter(bigrams)
        repeated = {bg: c for bg, c in counts.items() if c >= 3}

        if repeated:
            top_seq = max(repeated, key=repeated.get)
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.05 * repeated[top_seq], 0.9),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "top_sequence": list(top_seq),
                    "repeat_count": repeated[top_seq],
                    "all_sequences": {f"{a}->{b}": c for (a, b), c in repeated.items()},
                },
            )
        return None


class TimeClusterDetector(BaseMarkerDetector):
    """Fires when activity clusters into consistent time blocks across days."""
    marker_id = MarkerType.TIME_CLUSTER
    category = MarkerCategory.HABIT_ROUTINE
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if len(history) < 20:
            return None

        # Bucket events into 2-hour blocks
        block_counts: Counter[int] = Counter()
        block_dates: dict[int, set[str]] = {}

        for event in history:
            dt = datetime.fromtimestamp(event.timestamp)
            block = dt.hour // 2  # 0-11 representing 2-hour blocks
            date_str = dt.strftime("%Y-%m-%d")
            block_counts[block] += 1
            block_dates.setdefault(block, set()).add(date_str)

        # Find blocks that appear across 3+ days with significant activity
        clusters = {
            block: {"days": len(dates), "events": block_counts[block]}
            for block, dates in block_dates.items()
            if len(dates) >= 3 and block_counts[block] >= 10
        }

        if clusters:
            return MarkerResult(
                marker=self.marker_id,
                confidence=0.7,
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"time_clusters": clusters},
            )
        return None


class WorkStartPatternDetector(BaseMarkerDetector):
    """Fires when session start behavior matches an established pattern
    (first app, first search, etc.)."""
    marker_id = MarkerType.WORK_START_PATTERN
    category = MarkerCategory.HABIT_ROUTINE
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = time.time()

        # Check if we just started a session (SESSION_START within last 60s)
        recent_start = any(
            e.type == MarkerType.SESSION_START and now - e.timestamp < 60
            for e in history
        )
        if not recent_start:
            return None

        # Count how many past SESSION_STARTs began with the same app
        start_apps: Counter[str] = Counter()
        for event in history:
            if event.type == MarkerType.SESSION_START and event.context.app:
                start_apps[event.context.app.lower()] += 1

        current_app = state.active_app.lower()
        if current_app in start_apps and start_apps[current_app] >= 3:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.05 * start_apps[current_app], 0.9),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "start_app": state.active_app,
                    "pattern_count": start_apps[current_app],
                },
            )
        return None
