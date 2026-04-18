"""Sentiment Trigger Engine — determines WHEN to run sentiment analysis.

Sentiment is expensive (even locally) and noisy when run continuously.
This engine evaluates 10 trigger rules and only fires sentiment analysis
when a meaningful behavioral pattern is detected with sufficient context.
"""

from __future__ import annotations

import time
from collections import deque

from core.schemas import BehavioralEvent, Session, MarkerType


class SentimentTrigger:
    """A single trigger rule that decides whether to run sentiment."""

    def __init__(self, name: str, description: str) -> None:
        self.name = name
        self.description = description

    def evaluate(
        self,
        event: BehavioralEvent | None,
        session: Session | None,
        history: deque[BehavioralEvent],
    ) -> tuple[bool, str]:
        """Returns (should_trigger, context_text_to_analyze)."""
        raise NotImplementedError


class StruggleTrigger(SentimentTrigger):
    """Rule 1: RAPID_EDITING with duration > 30s."""

    def __init__(self) -> None:
        super().__init__("struggle", "Sustained rapid editing indicates frustration")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if event and event.type == MarkerType.RAPID_EDITING:
            dur = event.context.duration or 0
            if dur > 30:
                return True, f"Struggling with: {event.context.window_title or event.context.app}"
        return False, ""


class TopicLoopTrigger(SentimentTrigger):
    """Rule 2: Same topic searched 3+ times."""

    def __init__(self) -> None:
        super().__init__("topic_loop", "Repeated topic searches suggest confusion or deep interest")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if event and event.type == MarkerType.TOPIC_LOOP:
            terms = event.metadata.get("repeated_terms", {})
            queries = " | ".join(terms.keys())
            return True, f"Looping on topics: {queries}"
        return False, ""


class ContextShiftTrigger(SentimentTrigger):
    """Rule 3: Work app -> entertainment app within 5 seconds."""

    def __init__(self) -> None:
        super().__init__("context_shift", "Quick escape from work may signal frustration")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if event and event.type == MarkerType.CONTEXT_ESCAPE:
            from_app = event.metadata.get("from_app", "work")
            to_app = event.context.app or "entertainment"
            return True, f"Escaped from {from_app} to {to_app}"
        return False, ""


class DecisionLoopTrigger(SentimentTrigger):
    """Rule 4: Comparison loop duration > 5 minutes."""

    def __init__(self) -> None:
        super().__init__("decision_loop", "Extended comparison suggests decision difficulty")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if event and event.type == MarkerType.DELAYED_DECISION:
            dur = event.metadata.get("decision_duration_min", 0)
            apps = event.metadata.get("alternating_apps", [])
            if dur >= 5:
                return True, f"Deciding between: {', '.join(str(a) for a in apps)}"
        return False, ""


class EmotionalSpikeTrigger(SentimentTrigger):
    """Rule 5: Typing variance exceeds threshold."""

    def __init__(self) -> None:
        super().__init__("emotional_spike", "High typing variance correlates with emotional state")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if event and event.type == MarkerType.TYPING_VARIANCE:
            ratio = event.metadata.get("ratio", 0)
            if ratio >= 2.5:
                return True, f"Emotional intensity detected in: {event.context.window_title or event.context.app}"
        return False, ""


class DeepSessionEndTrigger(SentimentTrigger):
    """Rule 6: Session ends after 30+ minutes."""

    def __init__(self) -> None:
        super().__init__("deep_session_end", "Long session deserves a sentiment summary")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if session and session.duration_minutes >= 30:
            topics = ", ".join(session.summary.topic_clusters[:5]) if session.summary.topic_clusters else "general work"
            mode = session.summary.dominant_mode.value
            return True, f"Session ended ({session.duration_minutes:.0f}min, mode={mode}): {topics}"
        return False, ""


class BurnoutPatternTrigger(SentimentTrigger):
    """Rule 7: 3+ consecutive sessions with struggle_score > 0.7."""

    def __init__(self) -> None:
        super().__init__("burnout_pattern", "Consecutive high-struggle sessions indicate burnout risk")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if session is None:
            return False, ""

        # Look at the last 3 sessions from history
        now = time.time()
        recent_sessions_data = [
            e for e in history
            if e.type == MarkerType.SESSION_END and now - e.timestamp < 86400  # last 24h
        ]

        # Check struggle scores from metadata
        high_struggle_count = 0
        for se in recent_sessions_data[-3:]:
            # We encode struggle info in session end events
            struggle = se.metadata.get("struggle_score", 0)
            if struggle > 0.7:
                high_struggle_count += 1

        if high_struggle_count >= 3 or (session.summary.struggle_score > 0.7 and high_struggle_count >= 2):
            return True, "Burnout pattern: multiple consecutive high-struggle sessions"
        return False, ""


class LearningPlateauTrigger(SentimentTrigger):
    """Rule 8: Same topic researched across 5+ sessions with no progression."""

    def __init__(self) -> None:
        super().__init__("learning_plateau", "Repeated topic without progress suggests a learning blocker")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if event and event.type == MarkerType.TOPIC_LOOP:
            query_count = event.metadata.get("query_count", 0)
            terms = event.metadata.get("repeated_terms", {})
            if query_count >= 10:
                return True, f"Learning plateau on: {', '.join(list(terms.keys())[:5])}"
        return False, ""


class MotivationShiftTrigger(SentimentTrigger):
    """Rule 9: 30%+ week-over-week decline in sessions or duration."""

    def __init__(self) -> None:
        super().__init__("motivation_shift", "Activity decline signals disengagement")
        self._last_check = 0.0

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        now = time.time()
        # Only check once per hour
        if now - self._last_check < 3600:
            return False, ""
        self._last_check = now

        one_week = 7 * 86400
        two_weeks = 14 * 86400

        this_week = sum(1 for e in history if e.type == MarkerType.SESSION_START and now - e.timestamp < one_week)
        last_week = sum(
            1 for e in history
            if e.type == MarkerType.SESSION_START
            and one_week <= now - e.timestamp < two_weeks
        )

        if last_week > 0:
            decline = (last_week - this_week) / last_week
            if decline >= 0.3:
                return True, f"Activity decline: {last_week} sessions last week vs {this_week} this week ({decline:.0%} drop)"
        return False, ""


class PeakPerformanceTrigger(SentimentTrigger):
    """Rule 10: Flow state exceeding 45 minutes — analyze what produced it."""

    def __init__(self) -> None:
        super().__init__("peak_performance", "Extended flow state worth analyzing for replication")

    def evaluate(self, event, session, history) -> tuple[bool, str]:
        if event and event.type == MarkerType.FLOW_STATE:
            minutes = event.metadata.get("focus_minutes", 0)
            if minutes >= 45:
                app = event.context.app or "unknown"
                return True, f"Peak performance: {minutes:.0f}min flow state in {app}"
        return False, ""


class SentimentTriggerEngine:
    """Evaluates all trigger rules against incoming events/sessions."""

    def __init__(self) -> None:
        self.triggers: list[SentimentTrigger] = [
            StruggleTrigger(),
            TopicLoopTrigger(),
            ContextShiftTrigger(),
            DecisionLoopTrigger(),
            EmotionalSpikeTrigger(),
            DeepSessionEndTrigger(),
            BurnoutPatternTrigger(),
            LearningPlateauTrigger(),
            MotivationShiftTrigger(),
            PeakPerformanceTrigger(),
        ]

    def check_event(
        self,
        event: BehavioralEvent,
        history: deque[BehavioralEvent],
    ) -> list[tuple[str, str]]:
        """Check all triggers for a new event.

        Returns list of (trigger_name, context_text) for each trigger that fired.
        """
        fired: list[tuple[str, str]] = []
        for trigger in self.triggers:
            should_fire, context_text = trigger.evaluate(event, None, history)
            if should_fire:
                fired.append((trigger.name, context_text))
        return fired

    def check_session_end(
        self,
        session: Session,
        history: deque[BehavioralEvent],
    ) -> list[tuple[str, str]]:
        """Check session-level triggers when a session completes."""
        fired: list[tuple[str, str]] = []
        for trigger in self.triggers:
            should_fire, context_text = trigger.evaluate(None, session, history)
            if should_fire:
                fired.append((trigger.name, context_text))
        return fired
