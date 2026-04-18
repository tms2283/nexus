"""Agent State Tracker — maintains the rolling observation window.

Aggregates raw input signals (keystrokes, mouse, active window) into
the AgentState snapshot that marker detectors consume.  Handles the
math of rolling rates, variance calculations, and app switch counting.
"""

from __future__ import annotations

import time
import math
import threading
from collections import deque

from core.schemas import AgentState


class StateTracker:
    """Tracks rolling behavioral metrics from raw input signals."""

    def __init__(self, window_seconds: float = 60.0) -> None:
        self.window = window_seconds
        self._lock = threading.Lock()

        # Keystroke tracking
        self._key_times: deque[float] = deque(maxlen=500)
        self._backspace_count: int = 0
        self._total_keys: int = 0
        self._inter_key_intervals: deque[float] = deque(maxlen=100)

        # Mouse tracking
        self._click_times: deque[float] = deque(maxlen=200)
        self._scroll_events: deque[float] = deque(maxlen=100)

        # Active window
        self._current_app: str = ""
        self._current_title: str = ""
        self._focus_start: float = 0.0
        self._app_switch_history: deque[str] = deque(maxlen=50)
        self._switches_in_window: deque[float] = deque(maxlen=100)

        # Idle tracking
        self._last_input_time: float = time.time()
        self._session_start: float = time.time()

    def record_keystroke(self, is_backspace: bool = False) -> None:
        """Record a single keystroke event."""
        now = time.time()
        with self._lock:
            if self._key_times:
                interval = now - self._key_times[-1]
                if interval < 10:  # Ignore gaps > 10s (probably idle)
                    self._inter_key_intervals.append(interval)
            self._key_times.append(now)
            self._total_keys += 1
            if is_backspace:
                self._backspace_count += 1
            self._last_input_time = now

    def record_click(self) -> None:
        now = time.time()
        with self._lock:
            self._click_times.append(now)
            self._last_input_time = now

    def record_scroll(self) -> None:
        now = time.time()
        with self._lock:
            self._scroll_events.append(now)
            self._last_input_time = now

    def record_window_change(self, app_name: str, window_title: str) -> None:
        """Record an active window change."""
        now = time.time()
        with self._lock:
            if app_name == self._current_app and window_title == self._current_title:
                return  # No actual change
            if self._current_app and app_name != self._current_app:
                self._switches_in_window.append(now)
                self._app_switch_history.append(app_name)
            if app_name != self._current_app:
                self._focus_start = now
            self._current_app = app_name
            self._current_title = window_title
            self._last_input_time = now

    def get_state(self) -> AgentState:
        """Build a current AgentState snapshot from accumulated data."""
        now = time.time()
        cutoff = now - self.window

        with self._lock:
            recent_keys = [t for t in self._key_times if t > cutoff]
            keystroke_rate = len(recent_keys) / self.window if recent_keys else 0.0

            backspace_rate = 0.0
            if self._total_keys > 0:
                backspace_rate = self._backspace_count / self._total_keys

            typing_variance = 0.0
            if len(self._inter_key_intervals) >= 3:
                intervals = list(self._inter_key_intervals)
                mean = sum(intervals) / len(intervals)
                variance = sum((x - mean) ** 2 for x in intervals) / len(intervals)
                typing_variance = math.sqrt(variance)

            inter_key_interval = 0.0
            if self._inter_key_intervals:
                inter_key_interval = sum(self._inter_key_intervals) / len(self._inter_key_intervals)

            recent_clicks = [t for t in self._click_times if t > cutoff]
            click_rate = len(recent_clicks) / self.window if recent_clicks else 0.0

            recent_scrolls = [t for t in self._scroll_events if t > cutoff]
            scroll_velocity = len(recent_scrolls) / self.window if recent_scrolls else 0.0

            recent_switches = [t for t in self._switches_in_window if t > cutoff]
            app_switches = len(recent_switches)

            focus_duration = now - self._focus_start if self._focus_start > 0 else 0.0
            idle_seconds = now - self._last_input_time
            active_seconds = now - self._session_start

            current_app = self._current_app
            current_title = self._current_title
            switch_history = list(self._app_switch_history)

        return AgentState(
            timestamp=now,
            active_app=current_app,
            window_title=current_title,
            keystroke_rate=round(keystroke_rate, 3),
            backspace_rate=round(backspace_rate, 3),
            typing_variance=round(typing_variance, 4),
            inter_key_interval=round(inter_key_interval, 3),
            click_rate=round(click_rate, 3),
            scroll_velocity=round(scroll_velocity, 3),
            mouse_idle_seconds=round(idle_seconds, 1),
            app_switches=app_switches,
            app_switch_history=switch_history,
            focus_app=current_app,
            focus_duration=round(focus_duration, 1),
            idle_seconds=round(idle_seconds, 1),
            active_seconds=round(active_seconds, 1),
        )

    def reset_window_counters(self) -> None:
        """Reset per-window counters (call when session restarts)."""
        with self._lock:
            self._backspace_count = 0
            self._total_keys = 0
            self._session_start = time.time()
