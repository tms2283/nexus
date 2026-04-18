"""API authentication — Bearer token validation."""

from __future__ import annotations

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from agent.config import settings

_security = HTTPBearer()


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(_security),
) -> str:
    """Validate the Bearer token against the configured API key.

    Returns the token on success, raises 401 on failure.
    """
    if credentials.credentials != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return credentials.credentials
