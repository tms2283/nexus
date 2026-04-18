"""PBSP configuration using pydantic-settings."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class PBSPSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PBSP_",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # API
    api_key: str = "change-me-to-a-secure-random-string"
    host: str = "127.0.0.1"
    port: int = 8002
    debug: bool = False

    # Storage
    db_path: Path = Path("data/pbsp.db")
    log_dir: Path = Path("data/logs")

    # Nexus
    nexus_server_url: str = "http://localhost:3000"

    # Polling intervals (seconds)
    poll_interval_desktop: float = 1.0
    poll_interval_browser: float = 5.0
    poll_interval_connectors: int = 900

    # ML
    sentiment_model: str = "distilbert-base-uncased-finetuned-sst-2-english"
    use_local_inference: bool = True

    # Session detection
    session_idle_threshold: float = 300.0  # 5 minutes of inactivity = session boundary
    event_batch_size: int = 100
    event_flush_interval: float = 5.0  # seconds

    # Data retention (days)
    retention_events: int = 90
    retention_sessions: int = 365
    retention_sentiment: int = 180
    retention_debug_logs: int = 30

    def ensure_dirs(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)


settings = PBSPSettings()
