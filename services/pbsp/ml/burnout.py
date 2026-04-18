"""Burnout risk prediction from behavioral patterns.

Analyzes recent session trends to produce a risk score (0-1) with
explanatory factors.  Used by the Nexus integration to proactively
warn users and adjust learning recommendations.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any


@dataclass
class BurnoutAssessment:
    score: float = 0.0  # 0-1
    label: str = "low"  # low | moderate | high
    factors: list[str] = field(default_factory=list)
    sessions_analyzed: int = 0


def assess_burnout(sessions: list[dict[str, Any]]) -> BurnoutAssessment:
    """Assess burnout risk from recent session data.

    Factors considered:
    1. Struggle score trend (rising = bad)
    2. Focus score trend (declining = bad)
    3. Session frequency trend (declining = bad)
    4. Escape behavior frequency (rising = bad)
    5. Session duration trend (shortening = bad)
    """
    n = len(sessions)
    if n < 5:
        return BurnoutAssessment(sessions_analyzed=n)

    factors = []
    risk_signals: list[float] = []

    # Sort by start time (most recent first, but we need chronological for trends)
    sorted_sessions = sorted(sessions, key=lambda s: s.get("start_time") or 0)

    # Split into halves for trend detection
    mid = n // 2
    first_half = sorted_sessions[:mid]
    second_half = sorted_sessions[mid:]

    # 1. Struggle score trend
    avg_struggle_first = _avg(first_half, "struggle_score")
    avg_struggle_second = _avg(second_half, "struggle_score")
    if avg_struggle_second > avg_struggle_first + 0.1:
        delta = avg_struggle_second - avg_struggle_first
        risk_signals.append(min(delta * 2, 1.0))
        factors.append(f"Struggle score rising ({avg_struggle_first:.2f} -> {avg_struggle_second:.2f})")

    # Absolute high struggle
    if avg_struggle_second > 0.6:
        risk_signals.append(avg_struggle_second)
        factors.append(f"High recent struggle score ({avg_struggle_second:.2f})")

    # 2. Focus score trend (declining)
    avg_focus_first = _avg(first_half, "focus_score")
    avg_focus_second = _avg(second_half, "focus_score")
    if avg_focus_second < avg_focus_first - 0.1:
        delta = avg_focus_first - avg_focus_second
        risk_signals.append(min(delta * 2, 1.0))
        factors.append(f"Focus score declining ({avg_focus_first:.2f} -> {avg_focus_second:.2f})")

    # 3. Escape behavior
    escape_first = sum(1 for s in first_half if s.get("dominant_mode") == "ESCAPE")
    escape_second = sum(1 for s in second_half if s.get("dominant_mode") == "ESCAPE")
    escape_ratio_second = escape_second / max(len(second_half), 1)
    if escape_ratio_second > 0.3:
        risk_signals.append(escape_ratio_second)
        factors.append(f"High escape behavior ({escape_ratio_second:.0%} of recent sessions)")

    # 4. Session duration trend (shortening may indicate fatigue)
    avg_dur_first = _avg(first_half, "duration_minutes")
    avg_dur_second = _avg(second_half, "duration_minutes")
    if avg_dur_first > 10 and avg_dur_second < avg_dur_first * 0.6:
        decline = 1.0 - (avg_dur_second / max(avg_dur_first, 1))
        risk_signals.append(min(decline, 1.0))
        factors.append(f"Session duration declining ({avg_dur_first:.0f}min -> {avg_dur_second:.0f}min)")

    # 5. Consecutive high-struggle sessions
    consecutive_high = 0
    max_consecutive = 0
    for s in reversed(sorted_sessions):
        if (s.get("struggle_score") or 0) > 0.7:
            consecutive_high += 1
            max_consecutive = max(max_consecutive, consecutive_high)
        else:
            consecutive_high = 0

    if max_consecutive >= 3:
        risk_signals.append(min(max_consecutive / 5, 1.0))
        factors.append(f"{max_consecutive} consecutive high-struggle sessions")

    # Aggregate risk score
    if not risk_signals:
        score = 0.0
    else:
        # Weighted average with max signal as floor
        avg_signal = sum(risk_signals) / len(risk_signals)
        max_signal = max(risk_signals)
        score = 0.6 * avg_signal + 0.4 * max_signal

    score = round(min(score, 1.0), 3)

    if score < 0.3:
        label = "low"
    elif score < 0.7:
        label = "moderate"
    else:
        label = "high"

    return BurnoutAssessment(
        score=score,
        label=label,
        factors=factors,
        sessions_analyzed=n,
    )


def _avg(sessions: list[dict], field: str) -> float:
    values = [s.get(field) or 0.0 for s in sessions]
    return sum(values) / max(len(values), 1)
