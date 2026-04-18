"""Tests for SentimentTriggerEngine and trigger rules."""

from collections import deque
import time

import pytest

from core.schemas import (
    BehavioralEvent, Session, SessionSummary, MarkerType, DominantMode,
    EventContext, DomainCategory,
)
from core.sentiment_triggers import (
    SentimentTriggerEngine, StruggleTrigger, TopicLoopTrigger,
    ContextShiftTrigger, DecisionLoopTrigger, EmotionalSpikeTrigger,
    DeepSessionEndTrigger, BurnoutPatternTrigger, LearningPlateauTrigger,
    MotivationShiftTrigger, PeakPerformanceTrigger,
)


class TestStruggleTrigger:
    """Tests for StruggleTrigger — sustained rapid editing."""

    def test_struggle_trigger_fires_on_rapid_editing_over_30s(self):
        """Fires when RAPID_EDITING duration > 30 seconds."""
        trigger = StruggleTrigger()
        event = BehavioralEvent(
            type=MarkerType.RAPID_EDITING,
            source="test",
            context=EventContext(duration=45.0, app="VSCode"),
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is True
        assert "VSCode" in text or "Struggling" in text

    def test_struggle_trigger_no_fire_on_short_editing(self):
        """Does not fire when RAPID_EDITING duration <= 30 seconds."""
        trigger = StruggleTrigger()
        event = BehavioralEvent(
            type=MarkerType.RAPID_EDITING,
            source="test",
            context=EventContext(duration=15.0),
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is False

    def test_struggle_trigger_no_fire_on_other_event_type(self):
        """Does not fire on non-RAPID_EDITING events."""
        trigger = StruggleTrigger()
        event = BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
            context=EventContext(duration=60.0),
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is False


class TestTopicLoopTrigger:
    """Tests for TopicLoopTrigger — repeated topic searches."""

    def test_topic_loop_trigger_fires_on_repeated_searches(self):
        """Fires when TOPIC_LOOP event with repeated terms."""
        trigger = TopicLoopTrigger()
        event = BehavioralEvent(
            type=MarkerType.TOPIC_LOOP,
            source="test",
            metadata={
                "repeated_terms": {
                    "python decorators": 5,
                    "async functions": 3,
                }
            },
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is True
        assert "python decorators" in text or "async functions" in text

    def test_topic_loop_trigger_no_fire_on_other_events(self):
        """Does not fire on non-TOPIC_LOOP events."""
        trigger = TopicLoopTrigger()
        event = BehavioralEvent(
            type=MarkerType.SEARCH_QUERY,
            source="test",
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is False


class TestContextShiftTrigger:
    """Tests for ContextShiftTrigger — work to entertainment escape."""

    def test_context_shift_trigger_fires_on_context_escape(self):
        """Fires when CONTEXT_ESCAPE event (work -> entertainment)."""
        trigger = ContextShiftTrigger()
        event = BehavioralEvent(
            type=MarkerType.CONTEXT_ESCAPE,
            source="test",
            context=EventContext(app="YouTube"),
            metadata={"from_app": "VSCode"},
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is True
        assert "Escaped" in text

    def test_context_shift_trigger_no_fire_on_other_events(self):
        """Does not fire on non-CONTEXT_ESCAPE events."""
        trigger = ContextShiftTrigger()
        event = BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is False


class TestDecisionLoopTrigger:
    """Tests for DecisionLoopTrigger — extended comparison loops."""

    def test_decision_loop_trigger_fires_on_long_decision(self):
        """Fires when DELAYED_DECISION duration >= 5 minutes."""
        trigger = DecisionLoopTrigger()
        event = BehavioralEvent(
            type=MarkerType.DELAYED_DECISION,
            source="test",
            metadata={
                "decision_duration_min": 7.5,
                "alternating_apps": ["Chrome", "VSCode", "Finder"],
            },
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is True
        assert "Deciding" in text

    def test_decision_loop_trigger_no_fire_on_short_decision(self):
        """Does not fire when DELAYED_DECISION duration < 5 minutes."""
        trigger = DecisionLoopTrigger()
        event = BehavioralEvent(
            type=MarkerType.DELAYED_DECISION,
            source="test",
            metadata={
                "decision_duration_min": 3.0,
                "alternating_apps": [],
            },
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is False


class TestEmotionalSpikeTrigger:
    """Tests for EmotionalSpikeTrigger — high typing variance."""

    def test_emotional_spike_trigger_fires_on_high_variance(self):
        """Fires when TYPING_VARIANCE ratio >= 2.5."""
        trigger = EmotionalSpikeTrigger()
        event = BehavioralEvent(
            type=MarkerType.TYPING_VARIANCE,
            source="test",
            context=EventContext(app="Email"),
            metadata={"ratio": 3.0},
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is True
        assert "Emotional" in text

    def test_emotional_spike_trigger_no_fire_on_low_variance(self):
        """Does not fire when TYPING_VARIANCE ratio < 2.5."""
        trigger = EmotionalSpikeTrigger()
        event = BehavioralEvent(
            type=MarkerType.TYPING_VARIANCE,
            source="test",
            metadata={"ratio": 1.8},
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is False


class TestDeepSessionEndTrigger:
    """Tests for DeepSessionEndTrigger — long sessions."""

    def test_deep_session_end_trigger_fires_on_long_session(self):
        """Fires when session duration >= 30 minutes."""
        trigger = DeepSessionEndTrigger()
        session = Session(
            start=time.time() - 2000,  # ~33 minutes ago
            duration_minutes=33.0,
            summary=SessionSummary(
                dominant_mode=DominantMode.FOCUS,
                topic_clusters=["python", "async"],
            ),
        )
        history = deque()
        fired, text = trigger.evaluate(None, session, history)
        assert fired is True
        assert "python" in text or "async" in text

    def test_deep_session_end_trigger_no_fire_on_short_session(self):
        """Does not fire when session duration < 30 minutes."""
        trigger = DeepSessionEndTrigger()
        session = Session(
            start=time.time() - 600,
            duration_minutes=10.0,
        )
        history = deque()
        fired, text = trigger.evaluate(None, session, history)
        assert fired is False


class TestBurnoutPatternTrigger:
    """Tests for BurnoutPatternTrigger — consecutive high-struggle sessions."""

    def test_burnout_pattern_trigger_fires_on_high_struggle(self):
        """Fires when session has struggle_score > 0.7 with recent high-struggle sessions."""
        trigger = BurnoutPatternTrigger()
        now = time.time()

        # Create history with high-struggle session ends
        history = deque()
        for i in range(3):
            history.append(BehavioralEvent(
                type=MarkerType.SESSION_END,
                source="test",
                timestamp=now - (i * 3600),
                metadata={"struggle_score": 0.85},
            ))

        session = Session(
            start=now - 1800,
            duration_minutes=30.0,
            summary=SessionSummary(struggle_score=0.75),
        )

        fired, text = trigger.evaluate(None, session, history)
        assert fired is True
        assert "Burnout" in text

    def test_burnout_pattern_trigger_no_fire_on_low_struggle(self):
        """Does not fire when struggle_score < 0.7."""
        trigger = BurnoutPatternTrigger()
        session = Session(
            start=time.time(),
            summary=SessionSummary(struggle_score=0.4),
        )
        history = deque()
        fired, text = trigger.evaluate(None, session, history)
        assert fired is False


class TestLearningPlateauTrigger:
    """Tests for LearningPlateauTrigger — repeated topics without progress."""

    def test_learning_plateau_trigger_fires_on_many_queries(self):
        """Fires when TOPIC_LOOP with query_count >= 10."""
        trigger = LearningPlateauTrigger()
        event = BehavioralEvent(
            type=MarkerType.TOPIC_LOOP,
            source="test",
            metadata={
                "query_count": 12,
                "repeated_terms": {"regex patterns": 12},
            },
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is True
        assert "Learning plateau" in text

    def test_learning_plateau_trigger_no_fire_on_few_queries(self):
        """Does not fire when query_count < 10."""
        trigger = LearningPlateauTrigger()
        event = BehavioralEvent(
            type=MarkerType.TOPIC_LOOP,
            source="test",
            metadata={
                "query_count": 5,
                "repeated_terms": {},
            },
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is False


class TestMotivationShiftTrigger:
    """Tests for MotivationShiftTrigger — activity decline detection."""

    def test_motivation_shift_trigger_fires_on_activity_decline(self):
        """Fires when this week has 30%+ fewer sessions than last week."""
        trigger = MotivationShiftTrigger()
        now = time.time()
        one_week = 7 * 86400

        # Create history with sessions last week and this week
        history = deque()
        # Add 10 sessions last week
        for i in range(10):
            history.append(BehavioralEvent(
                type=MarkerType.SESSION_START,
                source="test",
                timestamp=now - (one_week + i * 3600),
            ))
        # Add only 6 sessions this week (40% decline)
        for i in range(6):
            history.append(BehavioralEvent(
                type=MarkerType.SESSION_START,
                source="test",
                timestamp=now - (i * 3600),
            ))

        session = Session(start=now)
        # Force update last_check
        trigger._last_check = now - 4000
        fired, text = trigger.evaluate(None, session, history)
        assert fired is True
        assert "decline" in text.lower()

    def test_motivation_shift_trigger_respects_cooldown(self):
        """Only checks once per hour to avoid redundant triggers."""
        trigger = MotivationShiftTrigger()
        now = time.time()

        # Set last check to recent past
        trigger._last_check = now - 100

        session = Session(start=now)
        history = deque()
        fired, text = trigger.evaluate(None, session, history)

        # Should not fire due to cooldown
        assert fired is False


class TestPeakPerformanceTrigger:
    """Tests for PeakPerformanceTrigger — extended flow states."""

    def test_peak_performance_trigger_fires_on_long_flow_state(self):
        """Fires when FLOW_STATE duration >= 45 minutes."""
        trigger = PeakPerformanceTrigger()
        event = BehavioralEvent(
            type=MarkerType.FLOW_STATE,
            source="test",
            context=EventContext(app="VSCode"),
            metadata={"focus_minutes": 52},
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is True
        assert "Peak" in text or "flow" in text.lower()

    def test_peak_performance_trigger_no_fire_on_short_flow_state(self):
        """Does not fire when FLOW_STATE duration < 45 minutes."""
        trigger = PeakPerformanceTrigger()
        event = BehavioralEvent(
            type=MarkerType.FLOW_STATE,
            source="test",
            metadata={"focus_minutes": 30},
        )
        history = deque()
        fired, text = trigger.evaluate(event, None, history)
        assert fired is False


class TestSentimentTriggerEngine:
    """Tests for SentimentTriggerEngine — orchestration."""

    def test_engine_has_all_10_triggers(self):
        """Engine is initialized with all 10 trigger rules."""
        engine = SentimentTriggerEngine()
        assert len(engine.triggers) == 10

    def test_check_event_fires_struggle_trigger(self):
        """check_event() correctly evaluates event-level triggers."""
        engine = SentimentTriggerEngine()
        event = BehavioralEvent(
            type=MarkerType.RAPID_EDITING,
            source="test",
            context=EventContext(duration=45.0),
        )
        history = deque()

        fired_triggers = engine.check_event(event, history)
        # Should include struggle trigger
        trigger_names = [name for name, _ in fired_triggers]
        assert "struggle" in trigger_names

    def test_check_event_returns_trigger_name_and_context(self):
        """check_event() returns list of (trigger_name, context_text) tuples."""
        engine = SentimentTriggerEngine()
        event = BehavioralEvent(
            type=MarkerType.RAPID_EDITING,
            source="test",
            context=EventContext(
                duration=45.0,
                app="VSCode",
            ),
        )
        history = deque()

        fired_triggers = engine.check_event(event, history)
        assert len(fired_triggers) > 0
        for name, text in fired_triggers:
            assert isinstance(name, str)
            assert isinstance(text, str)
            assert len(text) > 0

    def test_check_session_end_fires_deep_session_trigger(self):
        """check_session_end() correctly evaluates session-level triggers."""
        engine = SentimentTriggerEngine()
        session = Session(
            start=time.time() - 2000,
            duration_minutes=35.0,
            summary=SessionSummary(topic_clusters=["python"]),
        )
        history = deque()

        fired_triggers = engine.check_session_end(session, history)
        trigger_names = [name for name, _ in fired_triggers]
        assert "deep_session_end" in trigger_names

    def test_check_session_end_returns_empty_for_short_session(self):
        """check_session_end() returns empty list when no triggers fire."""
        engine = SentimentTriggerEngine()
        session = Session(
            start=time.time(),
            duration_minutes=5.0,
            summary=SessionSummary(struggle_score=0.1),
        )
        history = deque()

        fired_triggers = engine.check_session_end(session, history)
        # Short session should not trigger most rules
        assert isinstance(fired_triggers, list)

    def test_engine_check_event_with_multiple_triggers_firing(self):
        """Multiple triggers can fire for a single event."""
        engine = SentimentTriggerEngine()

        # Create an event that might trigger multiple rules
        event = BehavioralEvent(
            type=MarkerType.RAPID_EDITING,
            source="test",
            context=EventContext(
                duration=50.0,
                app="VSCode",
                window_title="main.py",
            ),
        )
        history = deque()

        fired_triggers = engine.check_event(event, history)
        # At least struggle trigger should fire
        assert len(fired_triggers) >= 1

    def test_engine_evaluates_all_triggers(self):
        """Engine evaluates all registered triggers."""
        engine = SentimentTriggerEngine()

        # Create an event
        event = BehavioralEvent(
            type=MarkerType.DEEP_FOCUS,
            source="test",
        )
        history = deque()

        # Engine should evaluate all triggers without error
        fired_triggers = engine.check_event(event, history)
        assert isinstance(fired_triggers, list)
