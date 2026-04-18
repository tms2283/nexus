"""GDPR data management endpoints — export and erasure."""

from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from api.auth import verify_api_key

router = APIRouter(prefix="/data", tags=["data-management"])


@router.get("/export")
async def export_all_data(
    _: str = Depends(verify_api_key),
):
    """Export all stored behavioral data as JSON (GDPR right to access)."""
    from api.main import get_agent

    agent = get_agent()
    data = agent.db.export_all()

    return JSONResponse(
        content={
            "exported_at": time.time(),
            "tables": data,
        },
        headers={
            "Content-Disposition": "attachment; filename=pbsp-data-export.json",
        },
    )


@router.delete("")
async def delete_all_data(
    _: str = Depends(verify_api_key),
):
    """Delete all stored behavioral data (GDPR right to erasure).

    This action is irreversible. All events, sessions, profiles,
    sentiment results, and connector data will be permanently deleted.
    """
    from api.main import get_agent

    agent = get_agent()
    agent.db.delete_all()

    return {
        "status": "deleted",
        "message": "All behavioral data has been permanently deleted.",
        "deleted_at": time.time(),
    }
