"""Behavioral profile and personality endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api.auth import verify_api_key

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
async def get_profile(
    _: str = Depends(verify_api_key),
):
    """Get the full behavioral profile."""
    from api.main import get_agent

    agent = get_agent()
    profile = agent.db.get_profile()

    # Enrich with live stats
    profile["total_events"] = agent.db.get_event_count()
    profile["total_sessions"] = agent.db.get_session_count()

    return profile


@router.get("/{user_id}")
async def get_profile_by_user(
    user_id: str,
    _: str = Depends(verify_api_key),
):
    """Get behavioral profile for a specific Nexus user.

    In the MVP (single-user, local), this returns the same profile
    regardless of user_id.  Multi-user support comes in a later phase.
    """
    from api.main import get_agent

    agent = get_agent()
    profile = agent.db.get_profile()
    profile["user_nexus_id"] = user_id
    profile["total_events"] = agent.db.get_event_count()
    profile["total_sessions"] = agent.db.get_session_count()

    return profile
