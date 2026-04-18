"""F. Avoidance / Escape markers — signals of disengagement or procrastination."""

from __future__ import annotations

import time
from collections import deque

from core.schemas import (
    AgentState, BehavioralEvent, MarkerResult, MarkerType,
    MarkerCategory, EventContext, DomainCategory,
)
from core.markers.base import BaseMarkerDetector
from core.domain_classifier import classify_app

_WORK_CATEGORIES = {DomainCategory.WORK, DomainCategory.LEARNING}
_ESCAPE_CATEGORIES = {DomainCategory.ENTERTAINMENT, DomainCategory.SOCIAL, DomainCategory.SHOPPING}
_SOCIAL_APPS = {"discord", "twitter", "x", "facebook", "instagram", "tiktok", "reddit", "snapchat", "threads"}


class ContextEscapeDetector(BaseMarkerDetector):
    """Fires when context shifts from work/learning to entertainment within 5 seconds."""
    marker_id = MarkerType.CONTEXT_ESCAPE
    category = MarkerCategory.AVOIDANCE_ESCAPE

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if not history:
            return None

        current_cat = classify_app(state.active_app)
        if current_cat not in _ESCAPE_CATEGORIES:
            return None

        now = time.time()
        # Look for a recent work/learning event within the last 5 seconds
        for event in reversed(list(history)):
            age = now - event.timestamp
            if age > 10:
                break
            if age <= 5:
                prev_cat = event.context.domain_category
                if prev_cat in _WORK_CATEGORIES:
                    return MarkerResult(
                        marker=self.marker_id,
                        confidence=0.8,
                        context=EventContext(
                            app=state.active_app,
                            window_title=state.window_title,
                        ),
                        metadata={
                            "from_app": event.context.app,
                            "from_category": prev_cat.value,
                            "to_category": current_cat.value,
                            "switch_seconds": round(age, 1),
                        },
                    )
        return None


class SocialCheckLoopDetector(BaseMarkerDetector):
    """Fires when social media sites are visited 5+ times per hour
    in short bursts (<30 seconds each)."""
    marker_id = MarkerType.SOCIAL_CHECK_LOOP
    category = MarkerCategory.AVOIDANCE_ESCAPE
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = time.time()
        window = 3600  # 1 hour
        short_social_visits = 0

        for event in history:
            if now - event.timestamp > window:
                continue
            cat = event.context.domain_category
            dur = event.context.duration or 0
            if cat == DomainCategory.SOCIAL and dur < 30:
                short_social_visits += 1

        # Also check current state
        app_lower = state.active_app.lower()
        if any(s in app_lower for s in _SOCIAL_APPS):
            short_social_visits += 1

        if short_social_visits >= 5:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.05 * (short_social_visits - 5), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"social_check_count": short_social_visits, "window_hours": 1},
            )
        return None


class TabHoppingDetector(BaseMarkerDetector):
    """Fires when 5+ distinct tabs/apps are visited with <10 seconds each,
    no reading pattern (random switching)."""
    marker_id = MarkerType.TAB_HOPPING
    category = MarkerCategory.AVOIDANCE_ESCAPE

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = time.time()
        window = 60  # last minute
        rapid_switches: list[str] = []

        for event in history:
            if now - event.timestamp > window:
                continue
            dur = event.context.duration or 0
            if dur < 10 and event.context.app:
                rapid_switches.append(event.context.app)

        distinct = set(rapid_switches)
        if len(distinct) >= 5:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.05 * (len(distinct) - 5), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "distinct_apps": len(distinct),
                    "apps": list(distinct)[:10],
                    "total_switches": len(rapid_switches),
                },
            )
        return None


class ShortTaskAbortDetector(BaseMarkerDetector):
    """Fires when a work context is abandoned <2 minutes after starting, repeatedly."""
    marker_id = MarkerType.SHORT_TASK_ABORT
    category = MarkerCategory.AVOIDANCE_ESCAPE
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = time.time()
        window = 30 * 60  # 30 minutes
        short_aborts = 0

        for event in history:
            if now - event.timestamp > window:
                continue
            if event.type == MarkerType.CONTEXT_ESCAPE:
                # The focus duration before escape
                focus_dur = event.metadata.get("focus_duration") or event.context.duration or 0
                if focus_dur < 120:  # < 2 minutes
                    short_aborts += 1

        if short_aborts >= 3:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.1 * (short_aborts - 3), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"short_abort_count": short_aborts, "window_minutes": 30},
            )
        return None
