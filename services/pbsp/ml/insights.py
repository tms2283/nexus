"""Insight generation orchestrator — runs ML models and updates the profile.

Called periodically (e.g., after each session ends) to recompute
personality, learning style, and burnout scores from accumulated data.
"""

from __future__ import annotations

import json
import logging
import time

from storage.database import Database
from ml.personality import infer_personality
from ml.learning_style import classify_learning_style
from ml.burnout import assess_burnout

logger = logging.getLogger(__name__)


def update_profile_insights(db: Database) -> dict:
    """Recompute all ML insights and update the profile table.

    Returns a summary of what was updated.
    """
    sessions = db.get_sessions(limit=200)
    if len(sessions) < 5:
        return {"status": "insufficient_data", "sessions": len(sessions)}

    updates = {}

    # ── Behavioral Traits ────────────────────────────────────────────────
    personality = infer_personality(sessions)
    if personality.confidence > 0.1:
        updates["trait_exploration_breadth"] = personality.exploration_breadth
        updates["trait_focus_consistency"] = personality.focus_consistency
        updates["trait_social_orientation"] = personality.social_orientation
        updates["trait_friction_tolerance"] = personality.friction_tolerance
        updates["trait_emotional_volatility"] = personality.emotional_volatility
        updates["trait_confidence"] = personality.confidence

    # ── Learning Style ──────────────────────────────────────────────────
    learning = classify_learning_style(sessions)
    if learning.confidence > 0.1:
        updates["learning_style_primary"] = learning.primary_style
        updates["learning_style_secondary"] = learning.secondary_style
        updates["learning_approach"] = learning.approach
        updates["learning_mode"] = learning.mode

    # ── Burnout ─────────────────────────────────────────────────────────
    burnout = assess_burnout(sessions)
    updates["burnout_risk_score"] = burnout.score

    # ── Aggregate Scores ────────────────────────────────────────────────
    focus_scores = [s.get("focus_score") or 0 for s in sessions if s.get("focus_score") is not None]
    struggle_scores = [s.get("struggle_score") or 0 for s in sessions if s.get("struggle_score") is not None]

    if focus_scores:
        updates["avg_focus_score"] = round(sum(focus_scores) / len(focus_scores), 3)
    if struggle_scores:
        updates["avg_struggle_score"] = round(sum(struggle_scores) / len(struggle_scores), 3)

    # ── Peak / Low Energy Hours ─────────────────────────────────────────
    from datetime import datetime
    from collections import Counter

    hour_focus: dict[int, list[float]] = {}
    for s in sessions:
        if s.get("start_time") and s.get("focus_score") is not None:
            dt = datetime.fromtimestamp(s["start_time"])
            hour_focus.setdefault(dt.hour, []).append(s["focus_score"])

    if hour_focus:
        hour_avgs = {h: sum(scores) / len(scores) for h, scores in hour_focus.items() if len(scores) >= 2}
        if hour_avgs:
            sorted_hours = sorted(hour_avgs.items(), key=lambda x: x[1], reverse=True)
            peak_hours = [h for h, _ in sorted_hours[:4]]
            low_hours = [h for h, _ in sorted_hours[-3:]]
            updates["peak_focus_hours"] = json.dumps(peak_hours)
            updates["low_energy_hours"] = json.dumps(low_hours)

    # ── Top Interests ───────────────────────────────────────────────────
    events = db.get_events(event_type="SEARCH_QUERY", limit=300)
    interest_counts: Counter[str] = Counter()
    for e in events:
        meta = e.get("metadata")
        if meta:
            try:
                meta_dict = json.loads(meta) if isinstance(meta, str) else meta
                query = meta_dict.get("query", "").lower().strip()
                if query and len(query) > 2:
                    interest_counts[query] += 1
            except (json.JSONDecodeError, AttributeError):
                pass

    if interest_counts:
        top = [
            {"topic": topic, "confidence": min(count / 10, 1.0)}
            for topic, count in interest_counts.most_common(20)
        ]
        updates["top_interests"] = json.dumps(top)

    # ── Totals ──────────────────────────────────────────────────────────
    updates["total_sessions"] = db.get_session_count()
    updates["total_events"] = db.get_event_count()

    # Write to database
    if updates:
        db.update_profile(updates)
        logger.info(
            "Profile updated: personality(conf=%.2f), learning(%s/%s), burnout(%.2f)",
            personality.confidence,
            learning.primary_style,
            learning.approach,
            burnout.score,
        )

    return {
        "status": "updated",
        "sessions_analyzed": len(sessions),
        "personality_confidence": personality.confidence,
        "learning_confidence": learning.confidence,
        "burnout_score": burnout.score,
        "burnout_label": burnout.label,
        "fields_updated": len(updates),
    }
