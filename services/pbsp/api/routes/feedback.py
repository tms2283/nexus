"""Content feedback endpoints — lets users rate Nexus lessons and content.

Feedback creates ground-truth labels that improve recommendation accuracy
over time. All fields are optional except the lesson_id.
"""

from __future__ import annotations

import time
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from api.auth import verify_api_key

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    lesson_id: str
    course_id: str | None = None
    content_type: str | None = None  # "video" | "article" | "quiz" | "exercise"
    topic_tags: list[str] = Field(default_factory=list)
    difficulty_felt: Literal["too_easy", "just_right", "too_hard"] | None = None
    helpfulness: int | None = Field(None, ge=1, le=5, description="1 = not helpful, 5 = very helpful")
    engagement: int | None = Field(None, ge=1, le=5, description="1 = boring, 5 = highly engaging")
    would_revisit: bool | None = None
    free_text: str | None = Field(None, max_length=1000)
    user_nexus_id: str | None = None


class FeedbackResponse(BaseModel):
    id: int
    recorded_at: float


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    body: FeedbackRequest,
    _: str = Depends(verify_api_key),
):
    """Record user feedback on a piece of Nexus content.

    Called by the Nexus frontend after a user rates a lesson, completes
    a quiz, or explicitly dismisses a recommendation.
    """
    from api.main import get_agent

    agent = get_agent()
    record = body.model_dump()
    record["would_revisit"] = int(body.would_revisit) if body.would_revisit is not None else None
    row_id = agent.db.insert_feedback(record)
    return FeedbackResponse(id=row_id, recorded_at=time.time())


@router.get("")
async def list_feedback(
    lesson_id: str | None = Query(None),
    user_nexus_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: str = Depends(verify_api_key),
):
    """List feedback records, optionally filtered by lesson or user."""
    from api.main import get_agent

    agent = get_agent()
    rows = agent.db.get_feedback(
        lesson_id=lesson_id,
        user_nexus_id=user_nexus_id,
        limit=limit,
        offset=offset,
    )
    return {"feedback": rows, "count": len(rows)}


@router.get("/{lesson_id}/summary")
async def feedback_summary(
    lesson_id: str,
    _: str = Depends(verify_api_key),
):
    """Aggregated feedback stats for a single lesson.

    Returns average helpfulness, engagement, difficulty distribution,
    and revisit intent — useful for Nexus content editors.
    """
    from api.main import get_agent

    agent = get_agent()
    summary = agent.db.get_feedback_summary(lesson_id)
    return {"lesson_id": lesson_id, "summary": summary}
