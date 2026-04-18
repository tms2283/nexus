"""Platform connector management endpoints."""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import verify_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/connectors", tags=["connectors"])

# Available connectors with their metadata
AVAILABLE_CONNECTORS = {
    "youtube": {"display_name": "YouTube", "auth_type": "oauth2", "description": "Watch/search history, likes, subscriptions"},
    "google_activity": {"display_name": "Google Activity", "auth_type": "oauth2", "description": "Search history, app activity"},
    "facebook": {"display_name": "Facebook", "auth_type": "oauth2", "description": "Posts, likes, interests, engagement"},
    "instagram": {"display_name": "Instagram", "auth_type": "oauth2", "description": "Media engagement, stories, saved posts"},
    "tiktok": {"display_name": "TikTok", "auth_type": "data_import", "description": "Watch history, engagement patterns"},
    "twitter": {"display_name": "X / Twitter", "auth_type": "oauth2", "description": "Tweets, likes, bookmarks, engagement"},
    "microsoft": {"display_name": "Microsoft", "auth_type": "oauth2", "description": "Office 365, Edge history, Teams"},
    "apple": {"display_name": "Apple", "auth_type": "data_import", "description": "Screen Time, app usage, health data"},
    "spotify": {"display_name": "Spotify", "auth_type": "oauth2", "description": "Listening patterns, playlists"},
    "chatgpt": {"display_name": "ChatGPT", "auth_type": "data_import", "description": "Conversation topics, question patterns"},
    "claude": {"display_name": "Claude", "auth_type": "data_import", "description": "Conversation topics"},
    "gemini": {"display_name": "Gemini", "auth_type": "data_import", "description": "Conversation topics, question patterns"},
    "gmail": {"display_name": "Gmail", "auth_type": "oauth2", "description": "Communication patterns (not content)"},
    "google_calendar": {"display_name": "Google Calendar", "auth_type": "oauth2", "description": "Events, meeting density"},
    "outlook_calendar": {"display_name": "Outlook Calendar", "auth_type": "oauth2", "description": "Events, meeting density"},
    "reddit": {"display_name": "Reddit", "auth_type": "oauth2", "description": "Subreddits, posts, comments, saved content"},
    "github": {"display_name": "GitHub", "auth_type": "oauth2", "description": "Repositories, commits, issues, pull requests"},
    "linkedin": {"display_name": "LinkedIn", "auth_type": "oauth2", "description": "Profile, positions, skills, recommendations"},
    # Note: the browser extension is NOT a connector — it pushes events directly via
    # POST /api/events/ingest using PBSP_API_KEY.  It intentionally has no entry here.
}


@router.get("")
async def list_connectors(
    _: str = Depends(verify_api_key),
):
    """List all available connectors and their current status."""
    from api.main import get_agent

    agent = get_agent()

    # Get live status from connector manager
    result = []
    try:
        if agent._connector_event_loop and agent._connector_event_loop.is_running():
            # Schedule get_all_statuses on the connector's event loop
            future = asyncio.run_coroutine_threadsafe(
                agent.connector_manager.get_all_statuses(),
                agent._connector_event_loop
            )
            statuses = future.result(timeout=5.0)
            status_dict = {s.connector_id: s for s in statuses}
        else:
            status_dict = {}
    except Exception as e:
        logger.warning("Failed to get live connector status: %s", e)
        status_dict = {}

    for conn_id, meta in AVAILABLE_CONNECTORS.items():
        status_info = status_dict.get(conn_id)
        result.append({
            "connector_id": conn_id,
            "display_name": meta["display_name"],
            "auth_type": meta["auth_type"],
            "description": meta["description"],
            "status": status_info.status.value if status_info else "disconnected",
            "last_sync": status_info.last_sync if status_info else None,
            "last_error": status_info.last_error if status_info else None,
        })

    return {"connectors": result}


class AuthRequest(BaseModel):
    redirect_uri: str | None = None
    auth_code: str | None = None


@router.post("/{connector_id}/auth")
async def initiate_auth(
    connector_id: str,
    body: AuthRequest,
    _: str = Depends(verify_api_key),
):
    """Initiate or complete OAuth flow for a connector."""
    from api.main import get_agent

    if connector_id not in AVAILABLE_CONNECTORS:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")

    meta = AVAILABLE_CONNECTORS[connector_id]
    if meta["auth_type"] == "data_import":
        raise HTTPException(status_code=400, detail=f"{connector_id} uses data import, not OAuth")

    agent = get_agent()
    try:
        if not agent._connector_event_loop or not agent._connector_event_loop.is_running():
            raise RuntimeError("Connector polling not active")

        # Prepare credentials from auth_code and redirect_uri
        credentials = {}
        if body.auth_code:
            credentials["auth_code"] = body.auth_code
        if body.redirect_uri:
            credentials["redirect_uri"] = body.redirect_uri

        # Schedule authentication on the connector's event loop
        future = asyncio.run_coroutine_threadsafe(
            agent.connector_manager.authenticate_connector(connector_id, credentials),
            agent._connector_event_loop
        )
        result = future.result(timeout=30.0)

        if result.success:
            return {
                "connector_id": connector_id,
                "status": "connected",
                "message": "Authentication successful",
                "access_token": result.access_token,
                "expires_at": result.expires_at,
            }
        else:
            return {
                "connector_id": connector_id,
                "status": "error",
                "message": result.error,
            }
    except Exception as e:
        logger.exception("Auth failed for %s", connector_id)
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


class ImportRequest(BaseModel):
    file_path: str | None = None
    # Raw export JSON — accepts a list (e.g. ChatGPT conversations.json) or a dict.
    # Use this instead of file_path when posting data directly from the browser.
    data: Any = None
    # Required for ai_chat_import (and the chatgpt/claude/gemini aliases).
    # Accepted values: "chatgpt", "claude", "gemini"
    platform: str | None = None


@router.post("/{connector_id}/import")
async def import_data(
    connector_id: str,
    body: ImportRequest,
    _: str = Depends(verify_api_key),
):
    """Import user data from a manually exported archive.

    Supported connectors: tiktok, apple, ai_chat_import (and its aliases
    chatgpt, claude, gemini).

    Two delivery methods:
    - ``file_path``: absolute path to the export directory/file on the server.
    - ``data``: inline JSON (list or dict) posted directly in the request body.
      Only supported for AI-chat imports; TikTok and Apple exports are too
      large and must be supplied as a local path.

    For ``ai_chat_import`` (or aliases ``chatgpt``/``claude``/``gemini``)
    you must also pass ``platform``: ``"chatgpt"``, ``"claude"``, or
    ``"gemini"``.  When using the named aliases the platform is inferred
    automatically.
    """
    from api.main import get_agent

    if connector_id not in AVAILABLE_CONNECTORS:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")

    meta = AVAILABLE_CONNECTORS[connector_id]
    if meta["auth_type"] != "data_import":
        raise HTTPException(
            status_code=400,
            detail=f"{connector_id} uses {meta['auth_type']} auth — use /auth for OAuth connectors",
        )

    if not body.file_path and body.data is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "Provide 'file_path' (absolute path to the export on the server) "
                "or 'data' (inline JSON for AI-chat imports)."
            ),
        )

    # ------------------------------------------------------------------
    # Route chatgpt / claude / gemini aliases to the shared connector
    # ------------------------------------------------------------------
    platform: str | None = body.platform
    actual_id = connector_id
    if connector_id in ("chatgpt", "claude", "gemini"):
        platform = platform or connector_id  # infer from alias
        actual_id = "ai_chat_import"

    agent = get_agent()
    connector = agent.connector_manager.get_connector(actual_id)
    if connector is None:
        raise HTTPException(status_code=503, detail=f"Connector '{actual_id}' is not registered")

    loop = asyncio.get_event_loop()
    temp_dir: str | None = None

    try:
        # ------------------------------------------------------------------
        # Resolve the local path we will pass to the synchronous parser
        # ------------------------------------------------------------------
        if body.file_path:
            import_path = body.file_path
            if not Path(import_path).exists():
                raise HTTPException(
                    status_code=422,
                    detail=f"Path does not exist on server: {import_path}",
                )
        else:
            # Inline JSON is only supported for AI-chat imports.
            if actual_id != "ai_chat_import":
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"{connector_id} exports are too large for inline upload. "
                        "Supply 'file_path' pointing to the extracted archive on the server."
                    ),
                )
            # Write the JSON payload to a temp directory so the existing
            # parser methods (which expect a file-system path) can read it.
            temp_dir = tempfile.mkdtemp(prefix="pbsp_import_")
            conv_file = Path(temp_dir) / "conversations.json"
            conv_file.write_text(json.dumps(body.data), encoding="utf-8")
            import_path = temp_dir

        # ------------------------------------------------------------------
        # Dispatch to the correct synchronous parser (run in a thread pool
        # to avoid blocking the uvicorn event loop during file I/O)
        # ------------------------------------------------------------------
        if actual_id == "tiktok":
            events = await loop.run_in_executor(None, connector.import_data, import_path)

        elif actual_id == "apple":
            events = await loop.run_in_executor(None, connector.import_data, import_path)

        elif actual_id == "ai_chat_import":
            plat = (platform or "").lower()
            if plat == "chatgpt":
                fn = connector.import_chatgpt
            elif plat == "claude":
                fn = connector.import_claude
            elif plat in ("gemini", "bard"):
                fn = connector.import_gemini
            else:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Specify 'platform': 'chatgpt', 'claude', or 'gemini'. "
                        "Alternatively, POST to /connectors/chatgpt/import (or "
                        "/claude, /gemini) and the platform is inferred automatically."
                    ),
                )
            events = await loop.run_in_executor(None, fn, import_path)

        else:
            # Should be unreachable given the auth_type guard above
            raise HTTPException(status_code=500, detail=f"No import handler for '{actual_id}'")

        # ------------------------------------------------------------------
        # Feed the parsed events into the behavioral signal pipeline
        # ------------------------------------------------------------------
        accepted = agent.collector.collect_batch(events) if events else 0

        return {
            "connector_id": connector_id,
            "status": "imported",
            "events_parsed": len(events) if events else 0,
            "events_accepted": accepted,
            "message": f"Successfully imported {accepted} behavioral events.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Import failed for %s", connector_id)
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")
    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)


@router.delete("/{connector_id}")
async def disconnect(
    connector_id: str,
    _: str = Depends(verify_api_key),
):
    """Disconnect a platform and remove stored tokens."""
    from api.main import get_agent

    if connector_id not in AVAILABLE_CONNECTORS:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")

    agent = get_agent()
    try:
        if not agent._connector_event_loop or not agent._connector_event_loop.is_running():
            raise RuntimeError("Connector polling not active")

        # Schedule disconnection on the connector's event loop
        future = asyncio.run_coroutine_threadsafe(
            agent.connector_manager.disconnect_connector(connector_id),
            agent._connector_event_loop
        )
        result = future.result(timeout=10.0)

        if result:
            return {
                "connector_id": connector_id,
                "status": "disconnected",
                "message": "Connector successfully disconnected",
            }
        else:
            return {
                "connector_id": connector_id,
                "status": "error",
                "message": "Failed to disconnect connector",
            }
    except Exception as e:
        logger.exception("Disconnect failed for %s", connector_id)
        raise HTTPException(status_code=500, detail=f"Disconnection failed: {str(e)}")
