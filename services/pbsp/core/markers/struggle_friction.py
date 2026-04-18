"""B. Struggle / Friction markers — signals of difficulty or frustration."""

from __future__ import annotations

import time
from collections import deque

from core.schemas import AgentState, BehavioralEvent, MarkerResult, MarkerType, MarkerCategory, EventContext
from core.markers.base import BaseMarkerDetector


class RapidEditingDetector(BaseMarkerDetector):
    """Fires when backspace rate exceeds 30% of total keystrokes
    over a 30-second window."""
    marker_id = MarkerType.RAPID_EDITING
    category = MarkerCategory.STRUGGLE_FRICTION

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if state.backspace_rate > 0.3 and state.keystroke_rate > 1.0:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.5 + state.backspace_rate, 0.95),
                context=EventContext(
                    app=state.active_app,
                    window_title=state.window_title,
                    duration=state.active_seconds,
                ),
                metadata={
                    "backspace_rate": round(state.backspace_rate, 3),
                    "keystroke_rate": round(state.keystroke_rate, 2),
                },
            )
        return None


class RewriteLoopDetector(BaseMarkerDetector):
    """Fires when active window stays in the same document with high edit
    rate but no net content growth (high backspace + high keystroke)."""
    marker_id = MarkerType.REWRITE_LOOP
    category = MarkerCategory.STRUGGLE_FRICTION
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        # Need sustained high backspace rate + active typing + same window for >60s
        if (
            state.backspace_rate > 0.25
            and state.keystroke_rate > 2.0
            and state.focus_duration > 60
        ):
            # Check if RAPID_EDITING fired recently for same context
            recent_rapid = sum(
                1 for e in history
                if e.type == MarkerType.RAPID_EDITING
                and time.time() - e.timestamp < 120
            )
            if recent_rapid >= 2:
                return MarkerResult(
                    marker=self.marker_id,
                    confidence=min(0.6 + 0.1 * recent_rapid, 0.95),
                    context=EventContext(
                        app=state.active_app,
                        window_title=state.window_title,
                        duration=state.focus_duration,
                    ),
                    metadata={"rapid_editing_count": recent_rapid},
                )
        return None


class AppSwitchThrashDetector(BaseMarkerDetector):
    """Fires when 10+ app switches occur within 60 seconds."""
    marker_id = MarkerType.APP_SWITCH_THRASH
    category = MarkerCategory.STRUGGLE_FRICTION

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if state.app_switches >= 10:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.5 + 0.05 * (state.app_switches - 10), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "switch_count": state.app_switches,
                    "recent_apps": state.app_switch_history[-10:],
                },
            )
        return None


class LongPauseDetector(BaseMarkerDetector):
    """Fires when keyboard/mouse idle for 30-120 seconds while an
    application remains in foreground (not a full session break)."""
    marker_id = MarkerType.LONG_PAUSE
    category = MarkerCategory.STRUGGLE_FRICTION

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if 30 <= state.idle_seconds <= 120 and state.active_app:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.5 + (state.idle_seconds - 30) / 180, 0.9),
                context=EventContext(
                    app=state.active_app,
                    window_title=state.window_title,
                    duration=state.idle_seconds,
                ),
                metadata={"idle_seconds": round(state.idle_seconds, 1)},
            )
        return None


class ErrorRetryDetector(BaseMarkerDetector):
    """Fires when user returns to the same error page/console output 3+ times."""
    marker_id = MarkerType.ERROR_RETRY
    category = MarkerCategory.STRUGGLE_FRICTION
    min_confidence = 0.6

    _ERROR_KEYWORDS = {"error", "exception", "failed", "traceback", "404", "500", "crash", "segfault", "denied"}

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        title_lower = state.window_title.lower()
        has_error_keyword = any(kw in title_lower for kw in self._ERROR_KEYWORDS)
        if not has_error_keyword:
            return None

        # Count how many times we've seen error-related titles recently
        now = time.time()
        error_events = sum(
            1 for e in history
            if e.type == MarkerType.ERROR_RETRY
            and now - e.timestamp < 300  # 5 minutes
        )

        # Also count from window title patterns
        error_title_count = 0
        for e in history:
            if now - e.timestamp > 300:
                continue
            if e.context.window_title:
                t = e.context.window_title.lower()
                if any(kw in t for kw in self._ERROR_KEYWORDS):
                    error_title_count += 1

        total = error_events + (1 if error_title_count >= 3 else 0)
        if error_title_count >= 3 or total >= 3:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.1 * error_title_count, 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"error_encounters": error_title_count},
            )
        return None
