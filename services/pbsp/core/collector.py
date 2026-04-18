"""Event Collector — normalizes, deduplicates, and batches behavioral events.

Sits between input sources (desktop agent, browser extension, connectors)
and the storage/processing pipeline.  Events are buffered in memory and
flushed to SQLite in batches for efficiency.
"""

from __future__ import annotations

import json
import time
import threading
import logging
from collections import deque
from datetime import datetime
from pathlib import Path

from core.schemas import BehavioralEvent, EventContext, MarkerType, DomainCategory
from core.domain_classifier import classify_domain, classify_app
from storage.database import Database

logger = logging.getLogger(__name__)


class EventCollector:
    """Thread-safe event collection with batched persistence."""

    def __init__(
        self,
        db: Database,
        log_dir: Path | None = None,
        batch_size: int = 100,
        flush_interval: float = 5.0,
    ) -> None:
        self.db = db
        self.log_dir = log_dir
        self.batch_size = batch_size
        self.flush_interval = flush_interval

        self._buffer: list[BehavioralEvent] = []
        self._lock = threading.Lock()
        self._last_flush = time.time()

        # Ring buffer of recent events for marker detection context
        self.history: deque[BehavioralEvent] = deque(maxlen=500)

        # Deduplication: track recent event fingerprints
        self._recent_fingerprints: deque[str] = deque(maxlen=200)

    def collect(self, event: BehavioralEvent) -> bool:
        """Normalize, deduplicate, and buffer an event.

        Returns True if the event was accepted, False if deduplicated away.
        """
        # Normalize: fill in domain classification if URL present
        event = self._normalize(event)

        fingerprint = self._fingerprint(event)
        with self._lock:
            if fingerprint in self._recent_fingerprints:
                return False
            self._recent_fingerprints.append(fingerprint)
            self._buffer.append(event)
            self.history.append(event)

        # Check if we should flush
        if self._should_flush():
            self.flush()

        return True

    def collect_batch(self, events: list[BehavioralEvent]) -> int:
        """Collect multiple events. Returns count of accepted events."""
        accepted = 0
        for event in events:
            if self.collect(event):
                accepted += 1
        return accepted

    def flush(self) -> int:
        """Persist buffered events to database and optional JSON log.

        Returns the number of events flushed.
        """
        with self._lock:
            if not self._buffer:
                return 0
            batch = self._buffer.copy()
            self._buffer.clear()
            self._last_flush = time.time()

        try:
            self.db.insert_events_batch(batch)
        except Exception:
            logger.exception("Failed to flush events to database")
            # Put events back in buffer
            with self._lock:
                self._buffer = batch + self._buffer
            return 0

        # Write to JSON debug log
        if self.log_dir:
            self._write_json_log(batch)

        logger.debug("Flushed %d events to storage", len(batch))
        return len(batch)

    def _should_flush(self) -> bool:
        return (
            len(self._buffer) >= self.batch_size
            or (time.time() - self._last_flush) >= self.flush_interval
        )

    def _normalize(self, event: BehavioralEvent) -> BehavioralEvent:
        """Enrich event with domain classification and clean up context."""
        ctx = event.context

        # Classify URL if present
        if ctx.url and ctx.domain_category == DomainCategory.UNKNOWN:
            domain, category = classify_domain(ctx.url)
            ctx.domain = domain
            ctx.domain_category = category

        # Classify app if no URL classification
        if ctx.domain_category == DomainCategory.UNKNOWN and ctx.app:
            ctx.domain_category = classify_app(ctx.app)

        return event

    def _fingerprint(self, event: BehavioralEvent) -> str:
        """Generate a deduplication fingerprint.

        Events with the same type, source, and context within a 2-second
        window are considered duplicates.
        """
        time_bucket = int(event.timestamp / 2)  # 2-second buckets
        return f"{event.type.value}:{event.source}:{event.context.app}:{time_bucket}"

    def _write_json_log(self, events: list[BehavioralEvent]) -> None:
        """Append events to a daily JSONL file."""
        if not self.log_dir:
            return

        try:
            self.log_dir.mkdir(parents=True, exist_ok=True)
            date_str = datetime.now().strftime("%Y-%m-%d")
            log_file = self.log_dir / f"{date_str}.jsonl"

            with open(log_file, "a", encoding="utf-8") as f:
                for event in events:
                    line = event.model_dump_json()
                    f.write(line + "\n")
        except Exception:
            logger.exception("Failed to write JSON log")

    def get_recent_events(self, count: int = 50) -> list[BehavioralEvent]:
        """Return the N most recent events from the ring buffer."""
        items = list(self.history)
        return items[-count:]

    @property
    def buffer_size(self) -> int:
        return len(self._buffer)

    @property
    def history_size(self) -> int:
        return len(self.history)
