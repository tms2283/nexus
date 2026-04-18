"""Base class for all behavioral marker detectors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections import deque

from core.schemas import AgentState, BehavioralEvent, MarkerResult, MarkerType, MarkerCategory


class BaseMarkerDetector(ABC):
    """A detector that examines the current agent state and recent event
    history to decide whether a behavioral marker should fire."""

    marker_id: MarkerType
    category: MarkerCategory
    min_confidence: float = 0.5

    @abstractmethod
    def detect(
        self,
        state: AgentState,
        history: deque[BehavioralEvent],
    ) -> MarkerResult | None:
        """Return a MarkerResult if the marker fires, else None.

        Args:
            state: The current desktop agent observation snapshot.
            history: Ring buffer of the most recent BehavioralEvents
                     (typically the last 500).
        """
        ...
