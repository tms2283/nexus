"""Content recommendation endpoint.

Nexus sends a list of content candidates; PBSP ranks them using the
user's behavioral profile and returns the sorted list with scores and
human-readable reasons.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from api.auth import verify_api_key
from ml.recommend import ContentCandidate, rank_content

router = APIRouter(prefix="/recommend", tags=["recommend"])


class RecommendRequest(BaseModel):
    candidates: list[ContentCandidate] = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Content items from Nexus to rank",
    )
    top_n: int = Field(10, ge=1, le=50, description="How many results to return")


class ScoredItem(BaseModel):
    content_id: str
    title: str
    score: float
    reasons: list[str]
    topic_tags: list[str]
    difficulty: int
    content_type: str
    estimated_minutes: float
    lesson_id: str | None
    course_id: str | None


@router.post("")
async def recommend_content(
    body: RecommendRequest,
    _: str = Depends(verify_api_key),
):
    """Rank Nexus content candidates for the current user.

    Send your full candidate pool; receive them sorted by predicted fit.
    Each result includes a score (0–1) and human-readable reason strings
    that can be shown to the user ("Matches your interests in Python").
    """
    from api.main import get_agent

    agent = get_agent()
    ranked = rank_content(body.candidates, agent.db, top_n=body.top_n)

    return {
        "recommendations": [
            ScoredItem(
                content_id=r.candidate.content_id,
                title=r.candidate.title,
                score=r.score,
                reasons=r.reasons,
                topic_tags=r.candidate.topic_tags,
                difficulty=r.candidate.difficulty,
                content_type=r.candidate.content_type,
                estimated_minutes=r.candidate.estimated_minutes,
                lesson_id=r.candidate.lesson_id,
                course_id=r.candidate.course_id,
            )
            for r in ranked
        ],
        "total_candidates": len(body.candidates),
        "returned": len(ranked),
    }
