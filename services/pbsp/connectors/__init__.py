"""Platform connectors for behavioral data collection."""

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from connectors.manager import ConnectorManager

__all__ = [
    "BaseConnector",
    "AuthResult",
    "ConnectorInfo",
    "ConnectorManager",
]
