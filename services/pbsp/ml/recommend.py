"""Content recommendation engine for Nexus.

Scores a list of content candidates against the user's behavioral profile
and returns them ranked by predicted fit. No external model required —
all signals come from the local SQLite database.

Scoring factors (each 0–1, weighted and summed):
  1. Topic interest match    — candidate tags overlap user's search history
  2. Difficulty fit          — candidate difficulty vs user's friction tolerance
  3. Content-type preference — what formats the user completes vs abandons
  4. Time-of-day fit         — is it the user's peak focus window right now?
  5. Struggle avoidance      — avoid re-surfacing topics with high struggle rates
  6. Feedback signal         — penalise content the user marked unhelpful before
"""

from __future__ import annotations

import json
import logging
import math
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

_DIFFICULTY_WEIGHT = 0.25
_INTEREST_WEIGHT = 0.30
_FORMAT_WEIGHT = 0.15
_TIME_WEIGHT = 0.15
_STRUGGLE_WEIGHT = 0.10
_FEEDBACK_WEIGHT = 0.05


@dataclass
class ContentCandidate:
    """A piece of Nexus content to be scored."""
    content_id: str
    title: str
    topic_tags: list[str] = field(default_factory=list)
    difficulty: int = 3          # 1 (easiest) – 5 (hardest)
    content_type: str = "lesson" # "video" | "article" | "quiz" | "exercise" | "lesson"
    estimated_minutes: float = 10.0
    lesson_id: str | None = None
    course_id: str | None = None


@dataclass
class ScoredCandidate:
    candidate: ContentCandidate
    score: float                  # 0–1 composite
    reasons: list[str] = field(default_factory=list)


def rank_content(
    candidates: list[ContentCandidate],
    db: Any,  # storage.database.Database
    top_n: int = 10,
) -> list[ScoredCandidate]:
    """Score and rank content candidates for the current user.

    Args:
        candidates: Content items from Nexus to score.
        db: Open Database instance.
        top_n: How many results to return (at most len(candidates)).

    Returns:
        Sorted list of ScoredCandidate, highest score first.
    """
    if not candidates:
        return []

    ctx = _build_user_context(db)
    results: list[ScoredCandidate] = []

    for c in candidates:
        score, reasons = _score_candidate(c, ctx)
        results.append(ScoredCandidate(candidate=c, score=round(score, 4), reasons=reasons))

    results.sort(key=lambda x: x.score, reverse=True)
    return results[:top_n]


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------

def _build_user_context(db: Any) -> dict[str, Any]:
    """Assemble all signals needed for scoring from the database."""
    profile = db.get_profile()
    sessions = db.get_sessions(limit=100)

    # Interest topics from search events and Nexus lesson events
    search_events = db.get_events(event_type="SEARCH_QUERY", limit=300)
    nexus_started = db.get_events(event_type="NEXUS_LESSON_STARTED", limit=200)
    nexus_completed = db.get_events(event_type="NEXUS_LESSON_COMPLETED", limit=200)
    nexus_abandoned = db.get_events(event_type="NEXUS_LESSON_ABANDONED", limit=200)
    struggle_events = (
        db.get_events(event_type="RAPID_EDITING", limit=100)
        + db.get_events(event_type="ERROR_RETRY", limit=100)
        + db.get_events(event_type="REWRITE_LOOP", limit=100)
    )

    # Build topic interest weights from searches
    interest_counter: Counter[str] = Counter()
    for e in search_events:
        meta = _parse_meta(e.get("metadata"))
        query = meta.get("query", "").lower().strip()
        for token in _tokenise(query):
            interest_counter[token] += 1

    # Boost topics from completed Nexus lessons
    for e in nexus_completed:
        tags = _parse_json(e.get("topic_tags"))
        for tag in tags:
            interest_counter[tag.lower()] += 2

    # Content-type completion rate
    type_started: Counter[str] = Counter()
    type_completed: Counter[str] = Counter()
    for e in nexus_started:
        ct = e.get("content_type") or "lesson"
        type_started[ct] += 1
    for e in nexus_completed:
        ct = e.get("content_type") or "lesson"
        type_completed[ct] += 1
    format_completion_rate: dict[str, float] = {}
    for ct, started in type_started.items():
        format_completion_rate[ct] = type_completed.get(ct, 0) / max(started, 1)

    # Abandoned lesson ids — surface these with penalty
    abandoned_lesson_ids: set[str] = set()
    for e in nexus_abandoned:
        if e.get("lesson_id"):
            abandoned_lesson_ids.add(e["lesson_id"])

    # Struggle topics (window title heuristic)
    struggle_topics: Counter[str] = Counter()
    for e in struggle_events:
        title = (e.get("context_title") or "").split(" - ")[0].strip().lower()
        if title:
            for token in _tokenise(title):
                struggle_topics[token] += 1

    # Feedback: unhelpful lesson ids
    unhelpful_lessons: set[str] = set()
    try:
        feedback_rows = db.get_feedback(limit=500)
        for row in feedback_rows:
            if row.get("helpfulness") is not None and row["helpfulness"] <= 2 and row.get("lesson_id"):
                unhelpful_lessons.add(row["lesson_id"])
    except Exception:
        pass

    # Peak focus hours
    peak_hours_raw = profile.get("peak_focus_hours")
    peak_hours: set[int] = set(_parse_json(peak_hours_raw) if peak_hours_raw else [])

    # Friction tolerance (0–1) drives difficulty preference
    friction_tolerance = profile.get("trait_friction_tolerance", 0.5)

    return {
        "interest_counter": interest_counter,
        "format_completion_rate": format_completion_rate,
        "abandoned_lesson_ids": abandoned_lesson_ids,
        "struggle_topics": struggle_topics,
        "unhelpful_lessons": unhelpful_lessons,
        "peak_hours": peak_hours,
        "friction_tolerance": friction_tolerance,
        "current_hour": datetime.now().hour,
    }


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def _score_candidate(
    c: ContentCandidate,
    ctx: dict[str, Any],
) -> tuple[float, list[str]]:
    reasons: list[str] = []
    total = 0.0

    # 1. Interest match
    interest_score = _interest_match(c.topic_tags, ctx["interest_counter"])
    total += interest_score * _INTEREST_WEIGHT
    if interest_score > 0.5:
        reasons.append(f"Matches your interests ({', '.join(c.topic_tags[:2])})")

    # 2. Difficulty fit
    diff_score = _difficulty_fit(c.difficulty, ctx["friction_tolerance"])
    total += diff_score * _DIFFICULTY_WEIGHT
    if diff_score > 0.7:
        reasons.append("Good difficulty match for your current pace")

    # 3. Content-type preference
    format_score = ctx["format_completion_rate"].get(c.content_type, 0.5)
    total += format_score * _FORMAT_WEIGHT
    if format_score > 0.7:
        reasons.append(f"You tend to complete {c.content_type}s")

    # 4. Time-of-day fit
    time_score = 1.0 if ctx["current_hour"] in ctx["peak_hours"] else 0.4
    total += time_score * _TIME_WEIGHT
    if time_score > 0.8:
        reasons.append("This is your peak focus window")

    # 5. Struggle avoidance
    struggle_score = _struggle_penalty(c.topic_tags, ctx["struggle_topics"])
    total += struggle_score * _STRUGGLE_WEIGHT

    # 6. Feedback signal — penalise previously rated unhelpful
    if c.lesson_id and c.lesson_id in ctx["unhelpful_lessons"]:
        total *= 0.5
        reasons.append("You rated this lesson as unhelpful before")

    # Penalise previously abandoned content (mild — maybe they'll retry)
    if c.lesson_id and c.lesson_id in ctx["abandoned_lesson_ids"]:
        total *= 0.75

    return min(total, 1.0), reasons


def _interest_match(topic_tags: list[str], interest_counter: Counter) -> float:
    if not topic_tags or not interest_counter:
        return 0.3  # neutral when no data
    total_interest = sum(interest_counter.values()) or 1
    match_score = sum(
        interest_counter.get(tag.lower(), 0) for tag in topic_tags
        for token in _tokenise(tag)
        for _ in [interest_counter.get(token, 0)]
    )
    # Normalise: diminishing returns past 10 interest signals
    return min(math.log1p(match_score) / math.log1p(10), 1.0)


def _difficulty_fit(difficulty: int, friction_tolerance: float) -> float:
    """Map candidate difficulty (1–5) to a fit score given friction tolerance.

    Low friction tolerance users → prefer easier content (1–2).
    High friction tolerance users → can handle harder content (4–5).
    """
    # Ideal difficulty for this user: 1 + friction_tolerance * 4 (maps to 1–5)
    ideal = 1.0 + friction_tolerance * 4.0
    distance = abs(difficulty - ideal)
    # Gaussian penalty: 0 distance = 1.0, distance 2 = ~0.6, distance 4 = ~0.14
    return math.exp(-(distance ** 2) / 4.0)


def _struggle_penalty(topic_tags: list[str], struggle_topics: Counter) -> float:
    """Return a score that penalises topics the user already struggles with."""
    if not topic_tags or not struggle_topics:
        return 1.0
    total_struggle = sum(struggle_topics.values()) or 1
    match = sum(
        struggle_topics.get(token, 0)
        for tag in topic_tags
        for token in _tokenise(tag)
    )
    # High struggle on this topic → low score (the user probably needs a break)
    penalty = min(match / total_struggle * 10, 1.0)
    return 1.0 - penalty * 0.6  # never go below 0.4


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _tokenise(text: str) -> list[str]:
    return [w for w in text.lower().split() if len(w) > 2]


def _parse_meta(value: Any) -> dict:
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value) if value else {}
    except Exception:
        return {}


def _parse_json(value: Any) -> list:
    if isinstance(value, list):
        return value
    try:
        return json.loads(value) if value else []
    except Exception:
        return []
