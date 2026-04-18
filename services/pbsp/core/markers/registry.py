"""Central registry that loads and runs all marker detectors."""

from __future__ import annotations

from collections import deque

from core.schemas import AgentState, BehavioralEvent, MarkerResult
from core.markers.base import BaseMarkerDetector

# Import all detector modules so they can register themselves
from core.markers.cognitive_intent import SearchQueryDetector, QuestionTypedDetector, TopicLoopDetector, ResearchSessionDetector
from core.markers.struggle_friction import RapidEditingDetector, RewriteLoopDetector, AppSwitchThrashDetector, LongPauseDetector, ErrorRetryDetector
from core.markers.focus_productivity import DeepFocusDetector, FlowStateDetector, TaskCompletionDetector, LowSwitchingDetector
from core.markers.emotional_proxies import TypingVarianceDetector, BurstTypingDetector, HesitationDetector, IntensitySpikeDetector
from core.markers.decision_behavior import ComparisonLoopDetector, TabRevisitDetector, FileReopenDetector, DelayedDecisionDetector
from core.markers.avoidance_escape import ContextEscapeDetector, SocialCheckLoopDetector, TabHoppingDetector, ShortTaskAbortDetector
from core.markers.habit_routine import DailyPatternDetector, AppSequenceDetector, TimeClusterDetector, WorkStartPatternDetector
from core.markers.meta import SessionStartDetector, SessionEndDetector, ContextShiftDetector, AnomalyDetector


class MarkerRegistry:
    """Holds all detector instances and runs them against state snapshots."""

    def __init__(self) -> None:
        self._detectors: list[BaseMarkerDetector] = []
        self._register_all()

    def _register_all(self) -> None:
        detector_classes: list[type[BaseMarkerDetector]] = [
            # A. Cognitive Intent
            SearchQueryDetector, QuestionTypedDetector, TopicLoopDetector, ResearchSessionDetector,
            # B. Struggle / Friction
            RapidEditingDetector, RewriteLoopDetector, AppSwitchThrashDetector, LongPauseDetector, ErrorRetryDetector,
            # C. Focus / Productivity
            DeepFocusDetector, FlowStateDetector, TaskCompletionDetector, LowSwitchingDetector,
            # D. Emotional Proxies
            TypingVarianceDetector, BurstTypingDetector, HesitationDetector, IntensitySpikeDetector,
            # E. Decision Behavior
            ComparisonLoopDetector, TabRevisitDetector, FileReopenDetector, DelayedDecisionDetector,
            # F. Avoidance / Escape
            ContextEscapeDetector, SocialCheckLoopDetector, TabHoppingDetector, ShortTaskAbortDetector,
            # G. Habit / Routine
            DailyPatternDetector, AppSequenceDetector, TimeClusterDetector, WorkStartPatternDetector,
            # H. Meta
            SessionStartDetector, SessionEndDetector, ContextShiftDetector, AnomalyDetector,
        ]
        self._detectors = [cls() for cls in detector_classes]

    def detect_all(
        self,
        state: AgentState,
        history: deque[BehavioralEvent],
    ) -> list[MarkerResult]:
        """Run every registered detector and collect all fired markers."""
        results: list[MarkerResult] = []
        for detector in self._detectors:
            try:
                result = detector.detect(state, history)
                if result is not None and result.confidence >= detector.min_confidence:
                    results.append(result)
            except Exception:
                # Individual detector failure should never crash the pipeline
                pass
        return results
