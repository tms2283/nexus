"""Learning insights endpoints — the primary interface for Nexus integration."""

from __future__ import annotations

import json
from collections import Counter

from fastapi import APIRouter, Depends

from api.auth import verify_api_key

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/learning")
async def learning_insights(
    _: str = Depends(verify_api_key),
):
    """Primary endpoint for Nexus — returns learning profile, optimal times,
    struggle areas, and personalized recommendations."""
    from api.main import get_agent

    agent = get_agent()
    profile = agent.db.get_profile()
    sessions = agent.db.get_sessions(limit=100)

    # Optimal study times — analyze session focus scores by hour
    hour_focus: dict[int, list[float]] = {}
    for s in sessions:
        if s.get("start_time") and s.get("focus_score"):
            from datetime import datetime
            dt = datetime.fromtimestamp(s["start_time"])
            hour = dt.hour
            hour_focus.setdefault(hour, []).append(s["focus_score"])

    optimal_times = []
    for hour, scores in sorted(hour_focus.items()):
        if len(scores) >= 2:
            avg = sum(scores) / len(scores)
            optimal_times.append({
                "hour": hour,
                "focus_probability": round(avg, 3),
                "sample_size": len(scores),
            })
    optimal_times.sort(key=lambda x: x["focus_probability"], reverse=True)

    # Struggle areas — from events with struggle markers
    struggle_events = agent.db.get_events(event_type="RAPID_EDITING", limit=200)
    struggle_events += agent.db.get_events(event_type="ERROR_RETRY", limit=200)
    struggle_events += agent.db.get_events(event_type="REWRITE_LOOP", limit=200)

    struggle_topics: Counter[str] = Counter()
    for e in struggle_events:
        title = e.get("context_title", "")
        if title:
            # Extract a topic hint from window title
            topic = title.split(" - ")[0].strip()[:50]
            if topic:
                struggle_topics[topic] += 1

    struggle_areas = [
        {"topic": topic, "frequency": count}
        for topic, count in struggle_topics.most_common(10)
    ]

    # Current interests — from search queries
    search_events = agent.db.get_events(event_type="SEARCH_QUERY", limit=200)
    interest_topics: Counter[str] = Counter()
    for e in search_events:
        meta = e.get("metadata")
        if meta:
            try:
                meta_dict = json.loads(meta) if isinstance(meta, str) else meta
                query = meta_dict.get("query", "")
                if query:
                    interest_topics[query.lower()] += 1
            except (json.JSONDecodeError, AttributeError):
                pass

    interests = [
        {"topic": topic, "confidence": min(count / 10, 1.0), "frequency": count}
        for topic, count in interest_topics.most_common(20)
    ]

    # Learning style from profile
    learning_profile = {
        "style_primary": profile.get("learning_style_primary"),
        "style_secondary": profile.get("learning_style_secondary"),
        "approach": profile.get("learning_approach"),
        "mode": profile.get("learning_mode"),
    }

    # Recommendations
    recommendations = []
    if optimal_times:
        best = optimal_times[0]
        recommendations.append({
            "type": "study_time",
            "message": f"Your peak focus window is around {best['hour']}:00 (focus probability: {best['focus_probability']:.0%})",
        })
    if struggle_areas:
        top_struggle = struggle_areas[0]
        recommendations.append({
            "type": "difficulty",
            "message": f"'{top_struggle['topic']}' causes frequent struggle — try breaking it into smaller sub-topics",
        })

    # Dominant mode distribution
    mode_counts: Counter[str] = Counter()
    for s in sessions:
        mode = s.get("dominant_mode", "EXPLORE")
        mode_counts[mode] += 1
    total = sum(mode_counts.values()) or 1
    mode_distribution = {mode: round(count / total, 3) for mode, count in mode_counts.items()}

    return {
        "learning_profile": learning_profile,
        "optimal_study_times": optimal_times[:5],
        "current_interests": interests[:15],
        "struggle_areas": struggle_areas,
        "recommendations": recommendations,
        "mode_distribution": mode_distribution,
        "burnout_risk": {
            "score": profile.get("burnout_risk_score", 0.0),
            "label": "low" if profile.get("burnout_risk_score", 0) < 0.3 else "moderate" if profile.get("burnout_risk_score", 0) < 0.7 else "high",
        },
        "total_sessions_analyzed": len(sessions),
    }


@router.get("/optimal-times")
async def optimal_times(
    _: str = Depends(verify_api_key),
):
    """Best focus/learning hours based on historical session data."""
    from api.main import get_agent
    from datetime import datetime

    agent = get_agent()
    sessions = agent.db.get_sessions(limit=200)

    hour_data: dict[int, dict] = {}
    for s in sessions:
        if s.get("start_time") and s.get("focus_score") is not None:
            dt = datetime.fromtimestamp(s["start_time"])
            hour = dt.hour
            day_type = "weekend" if dt.weekday() >= 5 else "weekday"
            key = hour

            if key not in hour_data:
                hour_data[key] = {"scores": [], "day_types": Counter()}
            hour_data[key]["scores"].append(s["focus_score"])
            hour_data[key]["day_types"][day_type] += 1

    results = []
    for hour, data in sorted(hour_data.items()):
        if len(data["scores"]) >= 2:
            avg = sum(data["scores"]) / len(data["scores"])
            primary_day = data["day_types"].most_common(1)[0][0]
            results.append({
                "hour": hour,
                "day": primary_day,
                "focus_probability": round(avg, 3),
                "sample_size": len(data["scores"]),
            })

    results.sort(key=lambda x: x["focus_probability"], reverse=True)
    return {"optimal_times": results}


@router.get("/struggles")
async def struggle_areas(
    _: str = Depends(verify_api_key),
):
    """Current struggle areas and blockers."""
    from api.main import get_agent

    agent = get_agent()
    events = agent.db.get_events(event_type="RAPID_EDITING", limit=100)
    events += agent.db.get_events(event_type="ERROR_RETRY", limit=100)
    events += agent.db.get_events(event_type="REWRITE_LOOP", limit=100)

    topic_durations: dict[str, list[float]] = {}
    for e in events:
        title = e.get("context_title", "")
        dur = e.get("context_duration") or 0
        if title:
            topic = title.split(" - ")[0].strip()[:50]
            topic_durations.setdefault(topic, []).append(dur)

    struggles = []
    for topic, durations in topic_durations.items():
        struggles.append({
            "topic": topic,
            "frequency": len(durations),
            "avg_struggle_duration": round(sum(durations) / len(durations), 1) if durations else 0,
            "total_duration": round(sum(durations), 1),
        })
    struggles.sort(key=lambda x: x["frequency"], reverse=True)

    return {"struggles": struggles[:20]}


@router.get("/interests")
async def interest_graph(
    _: str = Depends(verify_api_key),
):
    """Interest graph with confidence scores."""
    from api.main import get_agent
    import json

    agent = get_agent()
    events = agent.db.get_events(event_type="SEARCH_QUERY", limit=500)

    topics: Counter[str] = Counter()
    for e in events:
        meta = e.get("metadata")
        if meta:
            try:
                meta_dict = json.loads(meta) if isinstance(meta, str) else meta
                query = meta_dict.get("query", "")
                if query:
                    topics[query.lower().strip()] += 1
            except (json.JSONDecodeError, AttributeError):
                pass

    interests = [
        {
            "topic": topic,
            "confidence": min(count / 10, 1.0),
            "frequency": count,
            "trend": "stable",
        }
        for topic, count in topics.most_common(30)
    ]

    return {"interests": interests}


@router.get("/personality")
async def personality_profile(
    _: str = Depends(verify_api_key),
):
    """Behavioral trait scores + learning style (inferred from behavior, not self-report)."""
    from api.main import get_agent

    agent = get_agent()
    profile = agent.db.get_profile()

    return {
        "traits": {
            "exploration_breadth": profile.get("trait_exploration_breadth", 0.5),
            "focus_consistency": profile.get("trait_focus_consistency", 0.5),
            "social_orientation": profile.get("trait_social_orientation", 0.5),
            "friction_tolerance": profile.get("trait_friction_tolerance", 0.5),
            "emotional_volatility": profile.get("trait_emotional_volatility", 0.5),
            "confidence": profile.get("trait_confidence", 0.0),
        },
        "trait_descriptions": {
            "exploration_breadth": "How broadly this user explores topics and domains",
            "focus_consistency": "How consistently they sustain attention and follow routines",
            "social_orientation": "Preference for social/communication tools vs solo work",
            "friction_tolerance": "Persistence when tasks are difficult or frustrating",
            "emotional_volatility": "Variability in engagement and frustration patterns",
        },
        "learning_style": {
            "primary": profile.get("learning_style_primary"),
            "secondary": profile.get("learning_style_secondary"),
            "approach": profile.get("learning_approach"),
            "mode": profile.get("learning_mode"),
        },
    }


@router.get("/burnout-risk")
async def burnout_risk(
    _: str = Depends(verify_api_key),
):
    """Current burnout risk assessment."""
    from api.main import get_agent

    agent = get_agent()
    profile = agent.db.get_profile()
    score = profile.get("burnout_risk_score", 0.0)

    factors = []
    sessions = agent.db.get_sessions(limit=10)
    high_struggle = sum(1 for s in sessions if (s.get("struggle_score") or 0) > 0.7)
    if high_struggle >= 3:
        factors.append(f"{high_struggle} of last 10 sessions had high struggle scores")

    escape_events = agent.db.get_events(event_type="CONTEXT_ESCAPE", limit=50)
    if len(escape_events) > 20:
        factors.append(f"High escape frequency: {len(escape_events)} context escapes recently")

    return {
        "score": score,
        "label": "low" if score < 0.3 else "moderate" if score < 0.7 else "high",
        "factors": factors,
    }
