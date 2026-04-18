"""PBSP Desktop Agent — main entry point.

Runs the behavioral signal processing loop:
1. Poll active window every second
2. Collect keyboard/mouse patterns via pynput listeners
3. Build AgentState snapshots
4. Run marker detectors
5. Feed events through collector -> session builder -> sentiment triggers
6. Expose state for the API server

Also runs a system tray icon via pystray for unobtrusive operation.
"""

from __future__ import annotations

import sys
import time
import signal
import logging
import threading
import asyncio
from pathlib import Path

from agent.config import settings
from agent.state import StateTracker
try:
    from agent.platform.windows import get_active_window, KeyboardMonitor, MouseMonitor
except ImportError:
    # VPS/Headless fallback
    def get_active_window(): return "", ""
    class KeyboardMonitor:
        def __init__(self, on_keystroke): pass
        def start(self): pass
        def stop(self): pass
    class MouseMonitor:
        def __init__(self, on_click, on_scroll): pass
        def start(self): pass
        def stop(self): pass
from core.schemas import BehavioralEvent, EventContext, MarkerType
from core.collector import EventCollector
from core.markers.registry import MarkerRegistry
from core.session_builder import SessionBuilder
from core.sentiment_triggers import SentimentTriggerEngine
from core.domain_classifier import classify_app
from storage.database import Database
from ml.sentiment import create_sentiment_result
from ml.insights import update_profile_insights
from connectors.manager import ConnectorManager
from storage.retention import run_retention, cleanup_logs

logger = logging.getLogger(__name__)


class PBSPAgent:
    """Orchestrates the desktop behavioral signal processing loop."""

    def __init__(self) -> None:
        settings.ensure_dirs()

        # Storage
        self.db = Database(settings.db_path)
        self.db.initialize()

        # Core pipeline
        self.collector = EventCollector(
            db=self.db,
            log_dir=settings.log_dir,
            batch_size=settings.event_batch_size,
            flush_interval=settings.event_flush_interval,
        )
        self.marker_registry = MarkerRegistry()
        self.session_builder = SessionBuilder(db=self.db)
        self.sentiment_engine = SentimentTriggerEngine()

        # Platform connectors
        self.connector_manager = ConnectorManager()
        self.connector_manager.register_all_defaults()

        # State tracker
        self.state_tracker = StateTracker(window_seconds=60.0)

        # Input monitors
        self.keyboard_monitor = KeyboardMonitor(
            on_keystroke=self.state_tracker.record_keystroke
        )
        self.mouse_monitor = MouseMonitor(
            on_click=self.state_tracker.record_click,
            on_scroll=self.state_tracker.record_scroll,
        )

        # Control
        self._running = False
        self._poll_thread: threading.Thread | None = None
        self._connector_thread: threading.Thread | None = None
        self._retention_thread: threading.Thread | None = None
        self._connector_event_loop: asyncio.AbstractEventLoop | None = None

    def start(self) -> None:
        """Start the agent: input monitors + polling loop."""
        logger.info("Starting PBSP Desktop Agent...")
        self._running = True

        # Start input listeners
        self.keyboard_monitor.start()
        self.mouse_monitor.start()

        # Start polling loop in a thread
        self._poll_thread = threading.Thread(
            target=self._poll_loop,
            name="pbsp-poll",
            daemon=True,
        )
        self._poll_thread.start()

        # Start connector polling in a separate async thread
        self._connector_thread = threading.Thread(
            target=self._connector_poll_runner,
            name="pbsp-connectors",
            daemon=True,
        )
        self._connector_thread.start()

        # Start daily retention cleanup thread
        self._retention_thread = threading.Thread(
            target=self._retention_loop,
            name="pbsp-retention",
            daemon=True,
        )
        self._retention_thread.start()

        logger.info("PBSP Desktop Agent running (poll interval: %.1fs)", settings.poll_interval_desktop)

    def stop(self) -> None:
        """Stop the agent gracefully."""
        logger.info("Stopping PBSP Desktop Agent...")
        self._running = False

        self.keyboard_monitor.stop()
        self.mouse_monitor.stop()

        # Stop connector polling
        if self._connector_event_loop and self._connector_event_loop.is_running():
            # Schedule the stop_polling coroutine on the event loop
            asyncio.run_coroutine_threadsafe(
                self.connector_manager.stop_polling(),
                self._connector_event_loop
            ).result(timeout=5.0)
            logger.info("Connector polling stopped")

        # End current session
        completed = self.session_builder.force_end_current()
        if completed:
            logger.info("Closed final session: %s (%.1f min)",
                        completed.session_id, completed.duration_minutes)

        # Flush remaining events
        flushed = self.collector.flush()
        logger.info("Flushed %d remaining events", flushed)

        self.db.close()
        logger.info("PBSP Desktop Agent stopped")

    def _connector_poll_runner(self) -> None:
        """Run the connector polling loop in its own asyncio event loop."""
        try:
            self._connector_event_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._connector_event_loop)
            self._connector_event_loop.run_until_complete(
                self._run_connector_polling()
            )
        except Exception:
            logger.exception("Error in connector poll runner")
        finally:
            if self._connector_event_loop:
                self._connector_event_loop.close()

    async def _run_connector_polling(self) -> None:
        """Async wrapper for connector polling."""
        try:
            await self.connector_manager.start_polling()
            # Keep the loop alive until _running becomes False
            while self._running:
                await asyncio.sleep(1.0)
        finally:
            await self.connector_manager.stop_polling()

    def _retention_loop(self) -> None:
        """Run data retention cleanup once per day."""
        # Wait 60s after startup before first run so DB is fully warmed up
        time.sleep(60)
        while self._running:
            try:
                deleted = run_retention(self.db)
                cleanup_logs(settings.log_dir)
                logger.info("Retention complete: %s", deleted)
            except Exception:
                logger.exception("Error in retention cleanup")
            # Sleep 24 hours, waking every minute to check _running
            for _ in range(24 * 60):
                if not self._running:
                    break
                time.sleep(60)

    def _poll_loop(self) -> None:
        """Main polling loop — runs at the configured interval.

        Uses adaptive timing: if a tick takes longer than the target interval,
        the next tick starts immediately rather than adding extra delay.
        """
        interval = settings.poll_interval_desktop
        while self._running:
            tick_start = time.monotonic()
            try:
                self._tick()
            except Exception:
                logger.exception("Error in poll tick")

            elapsed = time.monotonic() - tick_start
            sleep_for = max(0.0, interval - elapsed)
            if elapsed > interval:
                logger.debug("Tick overran by %.2fs — skipping sleep", elapsed - interval)
            time.sleep(sleep_for)

    def _tick(self) -> None:
        """Single polling cycle: observe, detect, process."""
        # 1. Poll active window
        app_name, window_title = get_active_window()
        if app_name or window_title:
            self.state_tracker.record_window_change(app_name, window_title)

        # 2. Get current state snapshot
        state = self.state_tracker.get_state()

        # 3. Run marker detectors
        marker_results = self.marker_registry.detect_all(state, self.collector.history)

        # 4. Convert marker results to events and collect them
        for marker_result in marker_results:
            event = BehavioralEvent(
                type=marker_result.marker,
                source="desktop",
                confidence=marker_result.confidence,
                context=marker_result.context,
                metadata=marker_result.metadata,
            )

            if self.collector.collect(event):
                # 5. Process through session builder
                completed_session = self.session_builder.process_event(event)

                # 6. Check sentiment triggers for the event
                triggered = self.sentiment_engine.check_event(
                    event, self.collector.history
                )
                for trigger_name, context_text in triggered:
                    logger.info("Sentiment trigger fired: %s — %s", trigger_name, context_text)
                    try:
                        sentiment_result = create_sentiment_result(
                            trigger_name, context_text,
                            event_id=event.event_id,
                        )
                        self.db.insert_sentiment(sentiment_result)
                        logger.debug("Sentiment: %s (%.2f) for %s",
                                     sentiment_result.label.value, sentiment_result.polarity, trigger_name)
                    except Exception:
                        logger.debug("Sentiment analysis failed", exc_info=True)

                # 7. If a session completed, check session-level triggers + update profile
                if completed_session:
                    session_triggered = self.sentiment_engine.check_session_end(
                        completed_session, self.collector.history
                    )
                    for trigger_name, context_text in session_triggered:
                        logger.info("Session sentiment trigger: %s — %s", trigger_name, context_text)
                        try:
                            sentiment_result = create_sentiment_result(
                                trigger_name, context_text,
                                session_id=completed_session.session_id,
                            )
                            self.db.insert_sentiment(sentiment_result)
                        except Exception:
                            logger.debug("Session sentiment failed", exc_info=True)

                    # Update ML insights every 5 sessions
                    session_count = len(self.session_builder.recent_sessions)
                    if session_count % 5 == 0 and session_count > 0:
                        try:
                            update_profile_insights(self.db)
                        except Exception:
                            logger.debug("Profile insight update failed", exc_info=True)

    def get_status(self) -> dict:
        """Return agent status for the API health endpoint."""
        return {
            "running": self._running,
            "buffer_size": self.collector.buffer_size,
            "history_size": self.collector.history_size,
            "current_session": self.session_builder.current_session.session_id
            if self.session_builder.current_session else None,
            "total_sessions": len(self.session_builder.recent_sessions),
            "current_state": self.state_tracker.get_state().model_dump()
            if self._running else None,
            "connector_count": len(self.connector_manager._connectors),
            "connector_polling": self.connector_manager._running,
        }


# ---------------------------------------------------------------------------
# System tray (optional — runs when launched as standalone)
# ---------------------------------------------------------------------------

def _run_tray(agent: PBSPAgent) -> None:
    """Run a system tray icon for the agent."""
    try:
        from PIL import Image, ImageDraw
        import pystray

        # Create a simple icon
        icon_size = 64
        image = Image.new("RGB", (icon_size, icon_size), color=(30, 30, 30))
        draw = ImageDraw.Draw(image)
        # Draw a brain-like shape (simple circle with internal lines)
        draw.ellipse([8, 8, 56, 56], fill=(70, 130, 240), outline=(100, 170, 255), width=2)
        draw.line([32, 16, 32, 48], fill=(200, 200, 255), width=2)
        draw.arc([16, 12, 48, 44], 0, 180, fill=(200, 200, 255), width=2)

        def on_quit(icon, item):
            agent.stop()
            icon.stop()

        def on_status(icon, item):
            status = agent.get_status()
            logger.info("Agent status: %s", status)

        menu = pystray.Menu(
            pystray.MenuItem("Status", on_status),
            pystray.MenuItem("Quit", on_quit),
        )

        icon = pystray.Icon("PBSP", image, "Behavioral Signal Processor", menu)
        icon.run()

    except ImportError:
        logger.warning("pystray/Pillow not available — running without system tray")
        # Block the main thread
        try:
            while agent._running:
                time.sleep(1)
        except KeyboardInterrupt:
            pass


def main() -> None:
    """Entry point for the PBSP desktop agent."""
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    agent = PBSPAgent()

    # Handle graceful shutdown
    def signal_handler(sig, frame):
        agent.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    agent.start()

    # Run system tray (blocks until quit)
    _run_tray(agent)


if __name__ == "__main__":
    main()
