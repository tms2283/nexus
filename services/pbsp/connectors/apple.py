"""Apple connector — Screen Time, app usage, and health/sleep data via privacy export.

Apple doesn't provide a direct API for Screen Time or Health data.
Data is imported via Apple's privacy portal (privacy.apple.com)
or Health app export (Export All Health Data -> export.xml).
"""

from __future__ import annotations

import csv
import json
import logging
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from core.schemas import BehavioralEvent, EventContext, MarkerType, DomainCategory, ConnectorStatus

logger = logging.getLogger(__name__)


class AppleConnector(BaseConnector):
    connector_id = "apple"
    display_name = "Apple"
    auth_type = "data_import"

    def __init__(self) -> None:
        self._status = ConnectorStatus.DISCONNECTED
        self._last_sync: float | None = None
        self._imported_events: list[BehavioralEvent] = []

    async def authenticate(self, credentials: dict) -> AuthResult:
        import_path = credentials.get("import_path")
        if not import_path:
            return AuthResult(
                success=False,
                error=(
                    "Apple data requires manual export. Options:\n"
                    "1. privacy.apple.com — Request a copy of your data\n"
                    "2. Health app — Export All Health Data (export.xml)\n"
                    "3. Screen Time — Screenshots or third-party extraction\n"
                    "Provide 'import_path' pointing to the exported data."
                ),
            )

        path = Path(import_path)
        if not path.exists():
            return AuthResult(success=False, error=f"Path does not exist: {import_path}")

        self._status = ConnectorStatus.CONNECTED
        return AuthResult(success=True)

    async def fetch_data(self, since: datetime | None = None) -> list[BehavioralEvent]:
        events = list(self._imported_events)
        self._imported_events.clear()
        return events

    def import_data(self, export_path: str) -> list[BehavioralEvent]:
        """Import Apple data from privacy export or Health export."""
        events: list[BehavioralEvent] = []
        root = Path(export_path)

        if not root.exists():
            logger.error("Apple export path does not exist: %s", export_path)
            return events

        # Try Health export (export.xml or apple_health_export/)
        events.extend(self._parse_health_export(root))

        # Try Screen Time data (CSV or JSON from privacy export)
        events.extend(self._parse_screen_time(root))

        # Try Apple Media Services (privacy export)
        events.extend(self._parse_media_services(root))

        logger.info("Imported %d events from Apple export", len(events))
        self._imported_events = events
        self._last_sync = time.time()
        self._status = ConnectorStatus.CONNECTED
        return events

    def _parse_health_export(self, root: Path) -> list[BehavioralEvent]:
        """Parse Apple Health export.xml for sleep and activity data."""
        events: list[BehavioralEvent] = []

        # Find export.xml
        export_xml = None
        for candidate in [
            root / "export.xml",
            root / "apple_health_export" / "export.xml",
        ]:
            if candidate.exists():
                export_xml = candidate
                break

        if not export_xml:
            return events

        try:
            tree = ET.parse(str(export_xml))
            root_elem = tree.getroot()

            # Extract sleep analysis records
            sleep_records = root_elem.findall(
                ".//Record[@type='HKCategoryTypeIdentifierSleepAnalysis']"
            )
            for record in sleep_records[-100:]:  # Last 100 sleep records
                start = record.get("startDate", "")
                end = record.get("endDate", "")
                value = record.get("value", "")

                # Only track InBed and Asleep states
                if "InBed" in value or "Asleep" in value or "AsleepCore" in value:
                    duration_hours = 0.0
                    try:
                        s = datetime.fromisoformat(start.replace(" ", "T").split("+")[0])
                        e = datetime.fromisoformat(end.replace(" ", "T").split("+")[0])
                        duration_hours = (e - s).total_seconds() / 3600
                    except (ValueError, IndexError):
                        pass

                    events.append(BehavioralEvent(
                        type=MarkerType.DAILY_PATTERN,
                        source="apple",
                        confidence=0.85,
                        context=EventContext(
                            app="Health",
                            window_title=f"Sleep: {value.split('.')[-1]}",
                            domain="apple.com",
                            domain_category=DomainCategory.UNKNOWN,
                            duration=duration_hours * 3600,
                        ),
                        metadata={
                            "action": "sleep",
                            "sleep_state": value.split(".")[-1],
                            "start": start,
                            "end": end,
                            "duration_hours": round(duration_hours, 2),
                        },
                    ))

            # Extract step count for activity level
            step_records = root_elem.findall(
                ".//Record[@type='HKQuantityTypeIdentifierStepCount']"
            )
            # Aggregate by day — take last 30 days
            daily_steps: dict[str, int] = {}
            for record in step_records[-500:]:
                start = record.get("startDate", "")
                value = record.get("value", "0")
                try:
                    day = start[:10]
                    daily_steps[day] = daily_steps.get(day, 0) + int(float(value))
                except (ValueError, IndexError):
                    pass

            for day, steps in sorted(daily_steps.items())[-30:]:
                events.append(BehavioralEvent(
                    type=MarkerType.DAILY_PATTERN,
                    source="apple",
                    confidence=0.8,
                    context=EventContext(
                        app="Health",
                        window_title=f"Steps: {steps:,}",
                        domain="apple.com",
                        domain_category=DomainCategory.UNKNOWN,
                    ),
                    metadata={
                        "action": "daily_steps",
                        "date": day,
                        "steps": steps,
                        "activity_level": (
                            "very_active" if steps > 12000
                            else "active" if steps > 8000
                            else "moderate" if steps > 5000
                            else "sedentary"
                        ),
                    },
                ))

        except ET.ParseError as e:
            logger.warning("Failed to parse Health export: %s", e)

        return events

    def _parse_screen_time(self, root: Path) -> list[BehavioralEvent]:
        """Parse Screen Time data from Apple privacy export."""
        events: list[BehavioralEvent] = []

        # Apple privacy export may include Knowledge/knowledgeC.db data as CSV
        # or in JSON format under various paths
        screen_time_files = list(root.rglob("*Screen*Time*"))
        screen_time_files.extend(root.rglob("*screentime*"))
        screen_time_files.extend(root.rglob("*App*Usage*"))

        for st_file in screen_time_files:
            if st_file.suffix.lower() == ".csv":
                events.extend(self._parse_screen_time_csv(st_file))
            elif st_file.suffix.lower() == ".json":
                events.extend(self._parse_screen_time_json(st_file))

        return events

    def _parse_screen_time_csv(self, csv_path: Path) -> list[BehavioralEvent]:
        events: list[BehavioralEvent] = []
        try:
            with open(csv_path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in list(reader)[:500]:
                    app_name = row.get("App Name", row.get("app", ""))
                    duration = row.get("Duration", row.get("usage_minutes", "0"))
                    date = row.get("Date", row.get("date", ""))

                    if app_name:
                        try:
                            duration_min = float(duration)
                        except ValueError:
                            duration_min = 0

                        events.append(BehavioralEvent(
                            type=MarkerType.TIME_CLUSTER,
                            source="apple",
                            confidence=0.75,
                            context=EventContext(
                                app=app_name,
                                window_title=f"Screen Time: {app_name}",
                                domain="apple.com",
                                domain_category=DomainCategory.UNKNOWN,
                                duration=duration_min * 60,
                            ),
                            metadata={
                                "action": "screen_time",
                                "app_name": app_name,
                                "duration_minutes": duration_min,
                                "date": date,
                            },
                        ))
        except (OSError, csv.Error) as e:
            logger.warning("Failed to parse Screen Time CSV %s: %s", csv_path, e)

        return events

    def _parse_screen_time_json(self, json_path: Path) -> list[BehavioralEvent]:
        events: list[BehavioralEvent] = []
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
            items = data if isinstance(data, list) else data.get("items", data.get("usage", []))

            for item in items[:500]:
                app_name = item.get("app", item.get("bundleIdentifier", ""))
                duration = item.get("duration", item.get("totalTime", 0))
                date = item.get("date", "")

                if app_name:
                    events.append(BehavioralEvent(
                        type=MarkerType.TIME_CLUSTER,
                        source="apple",
                        confidence=0.75,
                        context=EventContext(
                            app=app_name,
                            window_title=f"Screen Time: {app_name}",
                            domain="apple.com",
                            domain_category=DomainCategory.UNKNOWN,
                            duration=float(duration) if duration else 0,
                        ),
                        metadata={
                            "action": "screen_time",
                            "app_name": app_name,
                            "duration_seconds": duration,
                            "date": date,
                        },
                    ))
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Failed to parse Screen Time JSON %s: %s", json_path, e)

        return events

    def _parse_media_services(self, root: Path) -> list[BehavioralEvent]:
        """Parse Apple Media Services data (Apple Music, Podcasts, etc.)."""
        events: list[BehavioralEvent] = []

        # Look for Apple Media Services files
        media_files = list(root.rglob("*Apple Media*"))
        media_files.extend(root.rglob("*Apple_Music*"))
        media_files.extend(root.rglob("*Podcasts*"))

        for media_file in media_files:
            if not media_file.is_file():
                continue

            if media_file.suffix.lower() == ".json":
                try:
                    data = json.loads(media_file.read_text(encoding="utf-8"))
                    items = data if isinstance(data, list) else data.get("items", [])

                    for item in items[:200]:
                        title = item.get("title", item.get("name", ""))
                        artist = item.get("artist", item.get("creator", ""))
                        media_type = item.get("type", "unknown")

                        if title:
                            events.append(BehavioralEvent(
                                type=MarkerType.RESEARCH_SESSION,
                                source="apple",
                                confidence=0.65,
                                context=EventContext(
                                    app="Apple Media",
                                    window_title=title[:200],
                                    domain="apple.com",
                                    domain_category=DomainCategory.ENTERTAINMENT,
                                ),
                                metadata={
                                    "action": "media_consumption",
                                    "title": title,
                                    "artist": artist,
                                    "media_type": media_type,
                                },
                            ))
                except (json.JSONDecodeError, OSError):
                    pass

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
