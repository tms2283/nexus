"""A. Cognitive Intent markers — signals of active information seeking."""

from __future__ import annotations

import re
import time
from collections import Counter, deque

from core.schemas import AgentState, BehavioralEvent, MarkerResult, MarkerType, MarkerCategory, EventContext
from core.markers.base import BaseMarkerDetector

_QUESTION_PATTERNS = re.compile(
    r"\b(what|why|how|where|when|which|who|can i|should i|is there|does|do i|"
    r"could|would|will|shall|difference between|vs\.?|versus|compare)\b",
    re.IGNORECASE,
)

_SEARCH_DOMAINS = {"google.com", "bing.com", "duckduckgo.com", "search.yahoo.com", "perplexity.ai"}


class SearchQueryDetector(BaseMarkerDetector):
    marker_id = MarkerType.SEARCH_QUERY
    category = MarkerCategory.COGNITIVE_INTENT

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        title = state.window_title.lower()
        # Browser title often contains " - Google Search", " - Bing", etc.
        search_indicators = ["- google search", "- bing", "- duckduckgo", "search results", "- perplexity"]
        if any(ind in title for ind in search_indicators):
            query = title.split(" - ")[0].strip() if " - " in title else title
            return MarkerResult(
                marker=self.marker_id,
                confidence=0.9,
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"query": query},
            )
        return None


class QuestionTypedDetector(BaseMarkerDetector):
    marker_id = MarkerType.QUESTION_TYPED
    category = MarkerCategory.COGNITIVE_INTENT

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        title = state.window_title
        if _QUESTION_PATTERNS.search(title) and "?" in title:
            return MarkerResult(
                marker=self.marker_id,
                confidence=0.75,
                context=EventContext(app=state.active_app, window_title=title),
                metadata={"question_fragment": title[:200]},
            )
        return None


class TopicLoopDetector(BaseMarkerDetector):
    """Fires when the same keyword cluster appears 3+ times in search/navigation
    within the last 15 minutes."""
    marker_id = MarkerType.TOPIC_LOOP
    category = MarkerCategory.COGNITIVE_INTENT
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = time.time()
        window = 15 * 60  # 15 minutes
        recent_queries: list[str] = []

        for event in history:
            if now - event.timestamp > window:
                continue
            if event.type == MarkerType.SEARCH_QUERY:
                query = event.metadata.get("query", "")
                if query:
                    recent_queries.append(query.lower())

        if len(recent_queries) < 3:
            return None

        # Extract words and find repeated terms
        all_words: list[str] = []
        for q in recent_queries:
            all_words.extend(w for w in q.split() if len(w) > 3)

        counts = Counter(all_words)
        repeated = {word: count for word, count in counts.items() if count >= 3}

        if repeated:
            top_topic = max(repeated, key=repeated.get)
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.5 + 0.1 * repeated[top_topic], 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"repeated_terms": repeated, "query_count": len(recent_queries)},
            )
        return None


class ResearchSessionDetector(BaseMarkerDetector):
    """Fires when 3+ related queries occur within a session, with
    at least 2 minutes of reading between them."""
    marker_id = MarkerType.RESEARCH_SESSION
    category = MarkerCategory.COGNITIVE_INTENT
    min_confidence = 0.6

    def detect(self, state: AgentState, history: deque[BehavioralEvent]) -> MarkerResult | None:
        now = time.time()
        window = 30 * 60  # 30 minutes
        search_events: list[BehavioralEvent] = []

        for event in history:
            if now - event.timestamp > window:
                continue
            if event.type == MarkerType.SEARCH_QUERY:
                search_events.append(event)

        if len(search_events) < 3:
            return None

        # Check for reading gaps (at least 2 min between searches)
        search_events.sort(key=lambda e: e.timestamp)
        gaps_with_reading = 0
        for i in range(1, len(search_events)):
            gap = search_events[i].timestamp - search_events[i - 1].timestamp
            if gap >= 120:  # 2 minutes
                gaps_with_reading += 1

        if gaps_with_reading >= 2:
            return MarkerResult(
                marker=self.marker_id,
                confidence=min(0.6 + 0.05 * gaps_with_reading, 0.95),
                context=EventContext(app=state.active_app, window_title=state.window_title),
                metadata={"search_count": len(search_events), "reading_gaps": gaps_with_reading},
            )
        return None
