"""C. Focus / Productivity markers — signals of sustained, effective work."""

from __future__ import annotations

import time
from collections import deque

from core.schemas import AgentState, BehavioralEvent, MarkerResult, MarkerType, MarkerCategory, EventContext, DomainCategory
from core.markers.base import BaseMarkerDetector
from core.domain_classifier import classify_app


class DeepFocusDetector(BaseMarkerDetector):
    """Fires when uninterrupted work in a single context exceeds 10 minutes
    with consistent input."""
    marker_id = MarkerType.DEEP_FOCUS
    category = MarkerCategory.FOCUS_PRODUCTIVITY

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        # 10+ minutes in same app with active input
        if state.focus_duration >= 600 and state.keystroke_rate > 0.5:
            category = classify_app(state.active_app)
            # Only count as deep focus in work/learning apps
            if category in (DomainCategory.WORK, DomainCategory.LEARNING, DomainCategory.UNKNOWN):
                minutes = state.focus_duration / 60
                return MarkerResult(
                    marker=self.marker_id,
                    confidence=min(0.6 + 0.02 * (minutes - 10), 0.98),
                    context=EventContext(
                        app=state.active_app,
                        window_title=state.window_title,
                        duration=state.focus_duration,
                    ),
                    metadata={"focus_minutes": round(minutes, 1)},
                )
        return None


class FlowStateDetector(BaseMarkerDetector):
    """Fires when keystroke rate variance remains below threshold for 15+ minutes
    (consistent rhythm indicates flow)."""
    marker_id = MarkerType.FLOW_STATE
    category = MarkerCategory.FOCUS_PRODUCTIVITY
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        # Need: 15+ min focus, low variance, active typing
        if (
            state.focus_duration >= 900  # 15 minutes
            and state.typing_variance < 0.3  # Low variance
            and state.keystroke_rate > 1.0  # Actively typing
            and state.app_switches < 3  # Minimal switching
        ):
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.7 + 0.01 * (state.focus_duration / 60 - 15), 0.98),
                context=EventContext(
                    app=state.active_app,
                    window_title=state.window_title,
                    duration=state.focus_duration,
                ),
                metadata={
                    "focus_minutes": round(state.focus_duration / 60, 1),
                    "typing_variance": round(state.typing_variance, 3),
                    "keystroke_rate": round(state.keystroke_rate, 2),
                },
            )
        return None


class TaskCompletionDetector(BaseMarkerDetector):
    """Fires on context switch after deep focus — heuristic: long focus
    followed by reward-type activity (entertainment, social, break)."""
    marker_id = MarkerType.TASK_COMPLETION
    category = MarkerCategory.FOCUS_PRODUCTIVITY
    min_confidence = 0.5

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        # Check if we recently had DEEP_FOCUS and just switched context
        now = time.time()
        recent_focus = None
        for event in reversed(list(history)):
            if now - event.timestamp > 300:  # 5 min window
                break
            if event.type == MarkerType.DEEP_FOCUS:
                recent_focus = event
                break

        if recent_focus is None:
            return None

        # Current app is different and is entertainment/social/unknown (break)
        current_category = classify_app(state.active_app)
        if current_category in (DomainCategory.ENTERTAINMENT, DomainCategory.SOCIAL):
            focus_app = recent_focus.context.app or ""
            if state.active_app.lower() != focus_app.lower():
                return MarkerResult(
                    marker=self.marker_id,
                    confidence=0.6,
                    context=EventContext(
                        app=state.active_app,
                        window_title=state.window_title,
                    ),
                    metadata={
                        "completed_in": focus_app,
                        "switched_to": state.active_app,
                        "focus_duration": recent_focus.context.duration,
                    },
                )
        return None


class LowSwitchingDetector(BaseMarkerDetector):
    """Fires when app switches < 3 per 10 minutes during active work."""
    marker_id = MarkerType.LOW_SWITCHING
    category = MarkerCategory.FOCUS_PRODUCTIVITY

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if (
            state.app_switches < 3
            and state.active_seconds >= 600  # at least 10 min active
            and state.keystroke_rate > 0.3  # some activity
        ):
            category = classify_app(state.active_app)
            if category in (DomainCategory.WORK, DomainCategory.LEARNING, DomainCategory.UNKNOWN):
                return MarkerResult(
                    marker=self.marker_id,
                    confidence=0.7,
                    context=EventContext(
                        app=state.active_app,
                        window_title=state.window_title,
                        duration=state.active_seconds,
                    ),
                    metadata={"switch_count": state.app_switches, "active_minutes": round(state.active_seconds / 60, 1)},
                )
        return None
