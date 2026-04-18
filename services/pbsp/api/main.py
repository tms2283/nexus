"""PBSP API Server — FastAPI application on port 8002.

Exposes the behavioral intelligence API that Nexus (and the browser
extension) communicate with.  Also starts the desktop agent in a
background thread.
"""

from __future__ import annotations

import time
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.config import settings
from agent.main import PBSPAgent
from api.routes import events, sessions, profile, insights, connectors, data_management, markers, feedback, recommend
from api.websocket import websocket_endpoint

logger = logging.getLogger(__name__)

# Global agent instance
_agent: PBSPAgent | None = None
_startup_time: float = 0.0


def get_agent() -> PBSPAgent:
    """Get the running agent instance. Used by route handlers."""
    if _agent is None:
        raise RuntimeError("Agent not initialized")
    return _agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the desktop agent on server startup, stop on shutdown."""
    global _agent, _startup_time
    _startup_time = time.time()
    _agent = PBSPAgent()
    _agent.start()
    logger.info("PBSP API Server started on %s:%d", settings.host, settings.port)
    yield
    _agent.stop()
    _agent = None
    logger.info("PBSP API Server stopped")


app = FastAPI(
    title="Behavioral Signal Processor",
    description="Personal behavioral intelligence API for the Nexus learning platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow local Nexus frontend and browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",       # Nexus dev
        "http://localhost:5173",       # Vite dev
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "chrome-extension://*",        # Browser extension
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount route modules
app.include_router(events.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(connectors.router, prefix="/api")
app.include_router(data_management.router, prefix="/api")
app.include_router(markers.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")

# WebSocket for real-time behavioral state
app.websocket("/api/ws/live")(websocket_endpoint)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    agent = get_agent()
    status = agent.get_status()
    return {
        "status": "healthy",
        "uptime": time.time() - _startup_time,
        "agent": status,
    }


def start():
    """Entry point for `pbsp-api` console script."""
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    uvicorn.run(
        "api.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
    )


if __name__ == "__main__":
    start()
