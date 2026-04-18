"""Learning style classification from behavioral signals.

Classifies across three dimensions:
1. VAK: Visual / Auditory / Reading-Writing / Kinesthetic
2. Approach: Sequential (linear progression) vs Global (topic hopping)
3. Mode: Active (immediate application) vs Reflective (research/reading)

All inferred from observed content-type preferences and learning behaviors,
not from surveys.
"""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass
from typing import Any


@dataclass
class LearningStyleResult:
    # VAK
    primary_style: str | None = None  # "visual" | "auditory" | "reading" | "kinesthetic"
    secondary_style: str | None = None
    style_scores: dict[str, float] | None = None  # raw scores

    # Approach
    approach: str | None = None  # "sequential" | "global"
    approach_score: float = 0.5  # 0=pure sequential, 1=pure global

    # Mode
    mode: str | None = None  # "active" | "reflective"
    mode_score: float = 0.5  # 0=pure active, 1=pure reflective

    confidence: float = 0.0
    sessions_analyzed: int = 0


# Domain -> content type mapping
_VIDEO_DOMAINS = {
    "youtube.com", "vimeo.com", "twitch.tv", "netflix.com",
    "coursera.org",  # Often video-heavy
    "udemy.com",
    "skillshare.com",
}

_READING_DOMAINS = {
    "medium.com", "dev.to", "stackoverflow.com", "wikipedia.org",
    "arxiv.org", "realpython.com", "docs.python.org",
    "developer.mozilla.org", "learn.microsoft.com",
    "news.ycombinator.com",
}

_INTERACTIVE_DOMAINS = {
    "leetcode.com", "hackerrank.com", "codecademy.com",
    "freecodecamp.org", "brilliant.org",
    "codewars.com", "exercism.io",
}

_WORK_APPS = {
    "code", "visual studio code", "vscode", "pycharm", "intellij",
    "terminal", "cmd", "powershell", "windows terminal",
    "git bash", "postman", "unity", "blender",
}


def classify_learning_style(
    sessions: list[dict[str, Any]],
    events: list[dict[str, Any]] | None = None,
) -> LearningStyleResult:
    """Classify learning style from session and event data.

    Args:
        sessions: Session records from the database.
        events: Optional event records for more detailed analysis.
    """
    n = len(sessions)
    if n < 10:
        return LearningStyleResult(sessions_analyzed=n, confidence=0.0)

    # ── VAK Classification ──────────────────────────────────────────────

    video_time = 0.0
    reading_time = 0.0
    interactive_time = 0.0
    audio_time = 0.0

    for s in sessions:
        domains = _parse_json_list(s.get("top_domains"))
        apps = _parse_json_list(s.get("top_apps"))
        duration = s.get("duration_minutes") or 0

        for domain in domains:
            d = domain.lower()
            if d in _VIDEO_DOMAINS:
                video_time += duration * 0.5
            elif d in _READING_DOMAINS:
                reading_time += duration * 0.5
            elif d in _INTERACTIVE_DOMAINS:
                interactive_time += duration * 0.5

        for app in apps:
            a = app.lower()
            if a in _WORK_APPS:
                interactive_time += duration * 0.3
            if "spotify" in a or "music" in a or "podcast" in a:
                audio_time += duration * 0.3

    total_learning_time = video_time + reading_time + interactive_time + audio_time
    if total_learning_time == 0:
        total_learning_time = 1  # Avoid division by zero

    style_scores = {
        "visual": round(video_time / total_learning_time, 3),
        "auditory": round(audio_time / total_learning_time, 3),
        "reading": round(reading_time / total_learning_time, 3),
        "kinesthetic": round(interactive_time / total_learning_time, 3),
    }

    sorted_styles = sorted(style_scores.items(), key=lambda x: x[1], reverse=True)
    primary_style = sorted_styles[0][0] if sorted_styles[0][1] > 0.1 else None
    secondary_style = sorted_styles[1][0] if len(sorted_styles) > 1 and sorted_styles[1][1] > 0.1 else None

    # ── Sequential vs Global ───────────────────────────────────────────

    # Sequential: Linear topic progression (same topic across consecutive sessions)
    # Global: Topic hopping (different topics each session)
    topic_sequences: list[list[str]] = []
    for s in sessions:
        topics = _parse_json_list(s.get("topic_clusters"))
        if topics:
            topic_sequences.append([t.lower() for t in topics[:3]])

    sequential_score = 0.0
    if len(topic_sequences) >= 3:
        continuity_count = 0
        for i in range(1, len(topic_sequences)):
            prev_set = set(topic_sequences[i - 1])
            curr_set = set(topic_sequences[i])
            if prev_set & curr_set:  # Any overlap
                continuity_count += 1

        sequential_ratio = continuity_count / (len(topic_sequences) - 1)
        sequential_score = sequential_ratio  # 0 = global, 1 = sequential

    approach = "sequential" if sequential_score > 0.5 else "global"

    # ── Active vs Reflective ───────────────────────────────────────────

    # Active: More time in code editors/terminals, interactive platforms
    # Reflective: More time reading, researching, browsing documentation
    active_time = interactive_time
    reflective_time = reading_time + video_time

    total_ar = active_time + reflective_time
    if total_ar > 0:
        mode_score = reflective_time / total_ar  # 0 = active, 1 = reflective
    else:
        mode_score = 0.5

    mode = "reflective" if mode_score > 0.5 else "active"

    # Confidence
    import math
    confidence = 1.0 - math.exp(-n / 30)

    return LearningStyleResult(
        primary_style=primary_style,
        secondary_style=secondary_style,
        style_scores=style_scores,
        approach=approach,
        approach_score=round(1.0 - sequential_score, 3),  # 0=sequential, 1=global
        mode=mode,
        mode_score=round(mode_score, 3),
        confidence=round(confidence, 3),
        sessions_analyzed=n,
    )


def _parse_json_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []
