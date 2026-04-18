"""D. Emotional Proxies — typing/input patterns that correlate with emotional state."""

from __future__ import annotations

from collections import deque

from core.schemas import AgentState, BehavioralEvent, MarkerResult, MarkerType, MarkerCategory, EventContext
from core.markers.base import BaseMarkerDetector


class TypingVarianceDetector(BaseMarkerDetector):
    """Fires when keystroke rate standard deviation exceeds 2x the user's
    baseline (stored in metadata as rolling average)."""
    marker_id = MarkerType.TYPING_VARIANCE
    category = MarkerCategory.EMOTIONAL_PROXIES
    min_confidence = 0.5

    # Baseline is calibrated over time; start with a reasonable default
    _baseline_variance: float = 0.15

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if state.typing_variance > self._baseline_variance * 2 and state.keystroke_rate > 1.0:
            ratio = state.typing_variance / max(self._baseline_variance, 0.01)
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.5 + 0.1 * (ratio - 2), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "variance": round(state.typing_variance, 4),
                    "baseline": round(self._baseline_variance, 4),
                    "ratio": round(ratio, 2),
                },
            )
        return None

    def update_baseline(self, new_variance: float, alpha: float = 0.05) -> None:
        """Exponential moving average to update baseline."""
        self._baseline_variance = (1 - alpha) * self._baseline_variance + alpha * new_variance


class BurstTypingDetector(BaseMarkerDetector):
    """Fires when typing speed exceeds 1.5x the user's average for 10+ seconds."""
    marker_id = MarkerType.BURST_TYPING
    category = MarkerCategory.EMOTIONAL_PROXIES

    _baseline_rate: float = 3.0  # keys per second default

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        if state.keystroke_rate > self._baseline_rate * 1.5 and state.active_seconds >= 10:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.1 * (state.keystroke_rate / self._baseline_rate - 1.5), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "keystroke_rate": round(state.keystroke_rate, 2),
                    "baseline_rate": round(self._baseline_rate, 2),
                    "multiplier": round(state.keystroke_rate / max(self._baseline_rate, 0.01), 2),
                },
            )
        return None

    def update_baseline(self, new_rate: float, alpha: float = 0.05) -> None:
        self._baseline_rate = (1 - alpha) * self._baseline_rate + alpha * new_rate


class HesitationDetector(BaseMarkerDetector):
    """Fires when inter-key intervals exceed 3 seconds during active typing
    (not idle — the user is mid-thought)."""
    marker_id = MarkerType.HESITATION
    category = MarkerCategory.EMOTIONAL_PROXIES

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        # User is typing (rate > 0) but has long pauses between keys
        if (
            state.inter_key_interval > 3.0
            and state.keystroke_rate > 0.1  # Still some activity (not fully idle)
            and state.keystroke_rate < 1.0  # But slow
            and state.idle_seconds < 10  # Not in a full idle state
        ):
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.5 + 0.1 * (state.inter_key_interval - 3), 0.9),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "inter_key_interval": round(state.inter_key_interval, 2),
                    "keystroke_rate": round(state.keystroke_rate, 2),
                },
            )
        return None


class IntensitySpikeDetector(BaseMarkerDetector):
    """Fires when combined mouse+keyboard action rate exceeds 2x baseline."""
    marker_id = MarkerType.INTENSITY_SPIKE
    category = MarkerCategory.EMOTIONAL_PROXIES

    _baseline_intensity: float = 5.0  # combined actions per second

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        current_intensity = state.keystroke_rate + state.click_rate
        if current_intensity > self._baseline_intensity * 2:
            ratio = current_intensity / max(self._baseline_intensity, 0.01)
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.5 + 0.1 * (ratio - 2), 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={
                    "intensity": round(current_intensity, 2),
                    "baseline": round(self._baseline_intensity, 2),
                    "ratio": round(ratio, 2),
                },
            )
        return None

    def update_baseline(self, new_intensity: float, alpha: float = 0.05) -> None:
        self._baseline_intensity = (1 - alpha) * self._baseline_intensity + alpha * new_intensity
