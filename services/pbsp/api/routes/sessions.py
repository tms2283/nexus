"""Session query endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, HTTPException

from api.auth import verify_api_key

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("")
async def list_sessions(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _: str = Depends(verify_api_key),
):
    """List behavioral sessions, most recent first."""
    from api.main import get_agent

    agent = get_agent()
    sessions = agent.db.get_sessions(limit=limit, offset=offset)
    return {"sessions": sessions, "count": len(sessions)}


@router.get("/current")
async def current_session(
    _: str = Depends(verify_api_key),
):
    """Get the currently active session (if any)."""
    from api.main import get_agent

    agent = get_agent()
    session = agent.session_builder.current_session
    if session is None:
        return {"session": None, "message": "No active session"}
    return {"session": session.model_dump()}


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    _: str = Depends(verify_api_key),
):
    """Get a specific session by ID."""
    from api.main import get_agent

    agent = get_agent()
    session = agent.db.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
