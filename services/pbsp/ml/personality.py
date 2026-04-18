"""Big Five personality inference from behavioral signals.

Infers personality traits from observed behavior over time — NOT from
self-report surveys.  This complements the quiz-based `userPsychProfiles`
already in Nexus by providing a behavioral ground truth.

Each trait is scored 0.0-1.0 (0.5 = neutral/insufficient data).
Confidence increases with more data (more sessions analyzed).
"""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass
from typing import Any

from core.schemas import Session, DominantMode, MarkerType


@dataclass
class BehavioralTraitScores:
    exploration_breadth: float = 0.5    # topic/domain diversity and curiosity
    focus_consistency: float = 0.5       # routine regularity and sustained attention
    social_orientation: float = 0.5      # communication/social platform preference
    friction_tolerance: float = 0.5      # persistence under difficulty
    emotional_volatility: float = 0.5    # variance in engagement patterns
    confidence: float = 0.0              # 0–1, grows with more sessions
    sessions_analyzed: int = 0


def infer_personality(sessions: list[dict[str, Any]]) -> BehavioralTraitScores:
    """Infer behavioral trait scores from session history.

    Args:
        sessions: List of session dicts from the database. Meaningful results
                  require at least 5 sessions; confidence grows toward 1.0
                  asymptotically as more sessions accumulate.

    Returns:
        BehavioralTraitScores with 0-1 values per trait.
    """
    n = len(sessions)
    if n < 5:
        return BehavioralTraitScores(sessions_analyzed=n, confidence=0.0)

    # Confidence scales with data volume (asymptotic toward 1.0)
    confidence = 1.0 - math.exp(-n / 50)

    # ── Exploration Breadth ─────────────────────────────────────────────
    # High: diverse topics, many unique domains, exploration mode
    all_topics: set[str] = set()
    all_domains: set[str] = set()
    explore_count = 0

    for s in sessions:
        topics = _parse_json_field(s.get("topic_clusters"))
        domains = _parse_json_field(s.get("top_domains"))
        all_topics.update(t.lower() for t in topics if t)
        all_domains.update(d.lower() for d in domains if d)
        if s.get("dominant_mode") == "EXPLORE":
            explore_count += 1

    topic_diversity = min(len(all_topics) / max(n * 2, 1), 1.0)
    domain_diversity = min(len(all_domains) / max(n, 1), 1.0)
    explore_ratio = explore_count / n
    exploration_breadth = _blend(0.5, [topic_diversity, domain_diversity, explore_ratio], [0.4, 0.3, 0.3])

    # ── Focus Consistency ───────────────────────────────────────────────
    # High: consistent routines, task completion, sustained focus
    focus_scores = [s.get("focus_score") or 0.0 for s in sessions]
    avg_focus = sum(focus_scores) / n

    routine_count = sum(1 for s in sessions if s.get("dominant_mode") == "ROUTINE")
    routine_ratio = routine_count / n

    # Session regularity — low variance in start times
    durations = [s.get("duration_minutes") or 0 for s in sessions]
    duration_cv = _coefficient_of_variation(durations)
    regularity = max(0, 1.0 - duration_cv)

    focus_consistency = _blend(0.5, [avg_focus, routine_ratio, regularity], [0.5, 0.25, 0.25])

    # ── Social Orientation ──────────────────────────────────────────────
    # High: social app usage, communication tools, collaboration frequency
    social_markers = 0
    comm_markers = 0
    for s in sessions:
        markers = _parse_json_field(s.get("marker_counts"))
        if isinstance(markers, dict):
            social_markers += markers.get("SOCIAL_CHECK_LOOP", 0)
            comm_markers += markers.get("CONTEXT_SHIFT", 0)

    social_rate = min(social_markers / max(n * 3, 1), 1.0)

    # Check for communication/social domains in top domains
    social_domains = {"facebook.com", "twitter.com", "x.com", "instagram.com",
                      "discord.com", "slack.com", "linkedin.com", "reddit.com"}
    social_domain_count = sum(1 for d in all_domains if d in social_domains)
    social_domain_ratio = min(social_domain_count / max(len(all_domains), 1), 1.0)

    social_orientation = _blend(0.5, [social_rate, social_domain_ratio], [0.5, 0.5])

    # ── Friction Tolerance ──────────────────────────────────────────────
    # High: persists through difficulty; low: avoids or abandons on struggle.
    # (Limited signal from desktop monitoring — moderate confidence)
    escape_count = sum(1 for s in sessions if s.get("dominant_mode") == "ESCAPE")
    escape_ratio = escape_count / n
    low_escape = 1.0 - escape_ratio

    struggle_scores = [s.get("struggle_score") or 0.0 for s in sessions]
    avg_struggle = sum(struggle_scores) / n
    low_frustration = 1.0 - avg_struggle

    friction_tolerance = _blend(0.5, [low_escape, low_frustration], [0.5, 0.5])

    # ── Emotional Volatility ────────────────────────────────────────────
    # High: frequent struggles, escape behavior, inconsistent focus
    avg_struggle_score = sum(struggle_scores) / n
    escape_frequency = escape_ratio

    # Variance in focus scores (emotional instability -> inconsistent focus)
    focus_cv = _coefficient_of_variation(focus_scores)

    emotional_volatility = _blend(0.5, [avg_struggle_score, escape_frequency, min(focus_cv, 1.0)], [0.4, 0.3, 0.3])

    return BehavioralTraitScores(
        exploration_breadth=round(_clamp(exploration_breadth), 3),
        focus_consistency=round(_clamp(focus_consistency), 3),
        social_orientation=round(_clamp(social_orientation), 3),
        friction_tolerance=round(_clamp(friction_tolerance), 3),
        emotional_volatility=round(_clamp(emotional_volatility), 3),
        confidence=round(confidence, 3),
        sessions_analyzed=n,
    )


# ── Helpers ─────────────────────────────────────────────────────────────────

def _blend(baseline: float, values: list[float], weights: list[float]) -> float:
    """Weighted blend toward or away from baseline."""
    weighted = sum(v * w for v, w in zip(values, weights))
    total_weight = sum(weights)
    if total_weight == 0:
        return baseline
    signal = weighted / total_weight
    # Blend 60% signal, 40% baseline (conservative)
    return 0.6 * signal + 0.4 * baseline


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _coefficient_of_variation(values: list[float]) -> float:
    """CV = std_dev / mean. Returns 0 if insufficient data."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    if mean == 0:
        return 0.0
    variance = sum((x - mean) ** 2 for x in values) / len(values)
    return math.sqrt(variance) / abs(mean)


def _parse_json_field(value: Any) -> list | dict:
    """Parse a JSON string field from the database, or return as-is if already parsed."""
    if value is None:
        return []
    if isinstance(value, (list, dict)):
        return value
    try:
        import json
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []
