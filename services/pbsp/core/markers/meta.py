"""H. Meta markers — session boundaries, context shifts, and anomalies."""

from __future__ import annotations

import time
import statistics
from collections import deque

from core.schemas import (
    AgentState, BehavioralEvent, MarkerResult, MarkerType,
    MarkerCategory, EventContext, DomainCategory,
)
from core.markers.base import BaseMarkerDetector
from core.domain_classifier import classify_app

_WORK_CATEGORIES = {DomainCategory.WORK, DomainCategory.LEARNING}
_LEISURE_CATEGORIES = {DomainCategory.ENTERTAINMENT, DomainCategory.SOCIAL, DomainCategory.SHOPPING, DomainCategory.NEWS}


class SessionStartDetector(BaseMarkerDetector):
    """Fires on first activity after 5+ minutes of inactivity."""
    marker_id = MarkerType.SESSION_START
    category = MarkerCategory.META

    _last_activity_time: float = 0.0
    _session_active: bool = False

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = state.timestamp
        has_input = state.keystroke_rate > 0 or state.click_rate > 0

        if not has_input:
            self._last_activity_time = now if self._last_activity_time == 0 else self._last_activity_time
            return None

        if self._last_activity_time == 0:
            # Very first detection
            self._last_activity_time = now
            self._session_active = True
            return MarkerResult(
                marker=self.marker_id,
                confidence=0.95,
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"reason": "first_activity"},
            )

        idle_gap = state.idle_seconds
        if idle_gap >= 300 and not self._session_active:
            self._session_active = True
            self._last_activity_time = now
            return MarkerResult(
                marker=self.marker_id,
                confidence=0.9,
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"idle_gap_seconds": round(idle_gap, 1)},
            )

        self._last_activity_time = now
        return None


class SessionEndDetector(BaseMarkerDetector):
    """Fires after 5+ minutes of inactivity following activity."""
    marker_id = MarkerType.SESSION_END
    category = MarkerCategory.META

    _was_active: bool = False
    _idle_start: float = 0.0

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        has_input = state.keystroke_rate > 0 or state.click_rate > 0

        if has_input:
            self._was_active = True
            self._idle_start = 0.0
            return None

        if self._was_active and state.idle_seconds >= 300:
            self._was_active = False
            # Calculate session duration from last SESSION_START
            session_dur = 0.0
            for event in reversed(list(history)):
                if event.type == MarkerType.SESSION_START:
                    session_dur = state.timestamp - event.timestamp
                    break

            return MarkerResult(
                marker=self.marker_id,
                confidence=0.9,
                context=EventContext(
                    app=state.active_app,
                    window_title=state.window_title,
                    duration=session_dur,
                ),
                metadata={
                    "idle_seconds": round(state.idle_seconds, 1),
                    "session_duration_min": round(session_dur / 60, 1) if session_dur else 0,
                },
            )
        return None


class ContextShiftDetector(BaseMarkerDetector):
    """Fires on major category change (e.g., work -> entertainment)."""
    marker_id = MarkerType.CONTEXT_SHIFT
    category = MarkerCategory.META

    _last_category: DomainCategory | None = None

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        current_cat = classify_app(state.active_app)
        if current_cat == DomainCategory.UNKNOWN:
            return None

        if self._last_category is None:
            self._last_category = current_cat
            return None

        prev = self._last_category
        self._last_category = current_cat

        if prev == current_cat:
            return None

        # Only fire on significant shifts (work<->leisure, not work<->work)
        is_significant = (
            (prev in _WORK_CATEGORIES and current_cat in _LEISURE_CATEGORIES) or
            (prev in _LEISURE_CATEGORIES and current_cat in _WORK_CATEGORIES) or
            (prev == DomainCategory.COMMUNICATION and current_cat in _LEISURE_CATEGORIES)
        )

        if is_significant:
            return MarkerResult(
                marker=self.marker_id,
                confidence=0.85,
                context=EventContext(
                    app=state.active_app,
                    window_title=state.window_title,
                    domain_category=current_cat,
                ),
                metadata={
                    "from_category": prev.value,
                    "to_category": current_cat.value,
                },
            )
        return None


class AnomalyDetector(BaseMarkerDetector):
    """Fires when any behavioral metric deviates 3+ standard deviations
    from the 14-day rolling baseline."""
    marker_id = MarkerType.ANOMALY
    category = MarkerCategory.META
    min_confidence = 0.7

    # Rolling baselines (updated externally as data accumulates)
    _keystroke_rates: list[float] = []
    _switch_counts: list[int] = []
    _focus_durations: list[float] = []
    _MAX_SAMPLES = 1000  # ~14 days at 1 sample/20min

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        anomalies: dict[str, dict] = {}

        # Check keystroke rate anomaly
        if len(self._keystroke_rates) >= 50:
            mean = statistics.mean(self._keystroke_rates)
            stdev = statistics.stdev(self._keystroke_rates)
            if stdev > 0:
                z = abs(state.keystroke_rate - mean) / stdev
                if z >= 3:
                    anomalies["keystroke_rate"] = {
                        "value": round(state.keystroke_rate, 2),
                        "mean": round(mean, 2),
                        "z_score": round(z, 2),
                    }

        # Check app switch anomaly
        if len(self._switch_counts) >= 50:
            mean = statistics.mean(self._switch_counts)
            stdev = statistics.stdev(self._switch_counts)
            if stdev > 0:
                z = abs(state.app_switches - mean) / stdev
                if z >= 3:
                    anomalies["app_switches"] = {
                        "value": state.app_switches,
                        "mean": round(mean, 2),
                        "z_score": round(z, 2),
                    }

        # Check focus duration anomaly
        if state.focus_duration > 0 and len(self._focus_durations) >= 50:
            mean = statistics.mean(self._focus_durations)
            stdev = statistics.stdev(self._focus_durations)
            if stdev > 0:
                z = abs(state.focus_duration - mean) / stdev
                if z >= 3:
                    anomalies["focus_duration"] = {
                        "value": round(state.focus_duration, 1),
                        "mean": round(mean, 1),
                        "z_score": round(z, 2),
                    }

        if anomalies:
            max_z = max(a["z_score"] for a in anomalies.values())
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.7 + 0.05 * (max_z - 3), 0.98),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"anomalies": anomalies},
            )
        return None

    def record_sample(self, state: AgentState) -> None:
        """Call periodically (every ~20 min) to build the rolling baseline."""
        self._keystroke_rates.append(state.keystroke_rate)
        self._switch_counts.append(state.app_switches)
        if state.focus_duration > 0:
            self._focus_durations.append(state.focus_duration)

        # Trim to max samples
        for lst in (self._keystroke_rates, self._switch_counts, self._focus_durations):
            while len(lst) > self._MAX_SAMPLES:
                lst.pop(0)
