"""WebSocket endpoint for real-time behavioral state streaming.

Pushes marker detections and session state to connected clients
(Nexus dashboard, browser extension) in real-time.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        logger.info("WebSocket client connected (%d total)", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)
        logger.info("WebSocket client disconnected (%d remaining)", len(self._connections))

    async def broadcast(self, data: dict) -> None:
        """Send data to all connected clients. Disconnects broken ones."""
        dead: list[WebSocket] = []
        message = json.dumps(data)

        for ws in self._connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Global connection manager
ws_manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """WebSocket handler for /api/ws/live.

    Streams real-time behavioral state updates to connected clients.
    """
    from api.main import get_agent

    await ws_manager.connect(websocket)

    try:
        agent = get_agent()

        # Send initial state
        state = agent.state_tracker.get_state()
        await websocket.send_json({
            "type": "initial_state",
            "timestamp": time.time(),
            "state": {
                "active_app": state.active_app,
                "window_title": state.window_title,
                "keystroke_rate": state.keystroke_rate,
                "focus_duration": state.focus_duration,
                "idle_seconds": state.idle_seconds,
                "app_switches": state.app_switches,
            },
            "session": {
                "session_id": agent.session_builder.current_session.session_id,
                "start": agent.session_builder.current_session.start,
                "marker_count": len(agent.session_builder.current_session.markers),
            } if agent.session_builder.current_session else None,
        })

        # Stream updates at 1Hz
        last_event_count = agent.collector.history_size
        while True:
            await asyncio.sleep(1.0)

            state = agent.state_tracker.get_state()
            current_session = agent.session_builder.current_session

            update = {
                "type": "state_update",
                "timestamp": time.time(),
                "state": {
                    "active_app": state.active_app,
                    "window_title": state.window_title,
                    "keystroke_rate": state.keystroke_rate,
                    "focus_duration": state.focus_duration,
                    "idle_seconds": state.idle_seconds,
                    "app_switches": state.app_switches,
                },
            }

            # Include session info
            if current_session:
                elapsed = time.time() - current_session.start
                update["session"] = {
                    "session_id": current_session.session_id,
                    "duration_min": round(elapsed / 60, 1),
                    "marker_count": len(current_session.markers),
                    "focus_score": current_session.summary.focus_score,
                    "dominant_mode": current_session.summary.dominant_mode.value,
                }

            # Include new markers since last update
            current_count = agent.collector.history_size
            if current_count > last_event_count:
                new_events = agent.collector.get_recent_events(
                    count=current_count - last_event_count
                )
                update["new_markers"] = [
                    {
                        "type": e.type.value,
                        "confidence": e.confidence,
                        "timestamp": e.timestamp,
                        "app": e.context.app,
                    }
                    for e in new_events
                ]
                last_event_count = current_count

            await websocket.send_json(update)

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("WebSocket error", exc_info=True)
    finally:
        ws_manager.disconnect(websocket)
