"""Event ingestion and query endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from api.auth import verify_api_key
from core.schemas import BehavioralEvent

router = APIRouter(prefix="/events", tags=["events"])


class IngestRequest(BaseModel):
    events: list[BehavioralEvent]


class IngestResponse(BaseModel):
    accepted: int
    total: int


@router.post("/ingest", response_model=IngestResponse)
async def ingest_events(
    body: IngestRequest,
    _: str = Depends(verify_api_key),
):
    """Batch ingest events from the browser extension or external sources."""
    from api.main import get_agent

    agent = get_agent()
    accepted = agent.collector.collect_batch(body.events)
    return IngestResponse(accepted=accepted, total=len(body.events))


@router.get("")
async def list_events(
    since: float | None = Query(None, description="Unix timestamp lower bound"),
    until: float | None = Query(None, description="Unix timestamp upper bound"),
    event_type: str | None = Query(None, description="Filter by marker type"),
    source: str | None = Query(None, description="Filter by source"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    _: str = Depends(verify_api_key),
):
    """Query stored events with optional filters."""
    from api.main import get_agent

    agent = get_agent()
    events = agent.db.get_events(
        since=since, until=until, event_type=event_type,
        source=source, limit=limit, offset=offset,
    )
    return {"events": events, "count": len(events)}
