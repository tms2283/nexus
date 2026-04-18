"""Live marker state endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api.auth import verify_api_key

router = APIRouter(prefix="/markers", tags=["markers"])


@router.get("/live")
async def live_markers(
    _: str = Depends(verify_api_key),
):
    """Get the current marker state from the running agent."""
    from api.main import get_agent

    agent = get_agent()

    recent = agent.collector.get_recent_events(count=20)
    markers = [
        {
            "type": e.type.value,
            "confidence": e.confidence,
            "timestamp": e.timestamp,
            "app": e.context.app,
            "window_title": e.context.window_title,
        }
        for e in recent
    ]

    current_state = None
    if agent._running:
        state = agent.state_tracker.get_state()
        current_state = {
            "active_app": state.active_app,
            "window_title": state.window_title,
            "keystroke_rate": state.keystroke_rate,
            "focus_duration": state.focus_duration,
            "idle_seconds": state.idle_seconds,
            "app_switches": state.app_switches,
        }

    return {
        "recent_markers": markers,
        "current_state": current_state,
    }
