"""Data retention and cleanup policies.

Runs periodically to purge old data according to the configured
retention windows, keeping the local database from growing unbounded.
"""

from __future__ import annotations

import time
import logging
from pathlib import Path
from datetime import datetime, timedelta

from storage.database import Database
from agent.config import settings

logger = logging.getLogger(__name__)


def run_retention(db: Database) -> dict[str, int]:
    """Execute all retention policies. Returns counts of deleted records."""
    now = time.time()
    deleted = {}

    # Events: 90 days
    cutoff = now - (settings.retention_events * 86400)
    cursor = db.conn.execute("DELETE FROM events WHERE timestamp < ?", (cutoff,))
    deleted["events"] = cursor.rowcount
    db.conn.commit()

    # Sessions: 365 days
    cutoff = now - (settings.retention_sessions * 86400)
    cursor = db.conn.execute("DELETE FROM sessions WHERE start_time < ?", (cutoff,))
    deleted["sessions"] = cursor.rowcount
    db.conn.commit()

    # Sentiment results: 180 days
    cutoff = now - (settings.retention_sentiment * 86400)
    cursor = db.conn.execute("DELETE FROM sentiment_results WHERE created_at < ?", (cutoff,))
    deleted["sentiment"] = cursor.rowcount
    db.conn.commit()

    total = sum(deleted.values())
    if total > 0:
        logger.info("Retention cleanup: deleted %d records (%s)", total, deleted)
        db.conn.execute("PRAGMA optimize")

    return deleted


def cleanup_logs(log_dir: Path | None = None) -> int:
    """Remove JSON debug logs older than retention_debug_logs days."""
    log_dir = log_dir or settings.log_dir
    if not log_dir.exists():
        return 0

    cutoff = datetime.now() - timedelta(days=settings.retention_debug_logs)
    deleted = 0

    for log_file in log_dir.glob("*.jsonl"):
        try:
            # Parse date from filename (YYYY-MM-DD.jsonl)
            date_str = log_file.stem
            file_date = datetime.strptime(date_str, "%Y-%m-%d")
            if file_date < cutoff:
                log_file.unlink()
                deleted += 1
        except (ValueError, OSError):
            continue

    if deleted:
        logger.info("Cleaned up %d old log files", deleted)

    return deleted
