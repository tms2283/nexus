"""Strict data contracts for the PBSP pipeline.

Every event, session, marker result, and profile flowing through the system
uses these Pydantic models.  They enforce the schema at ingestion time so
downstream components can trust the data without re-validation.
"""

from __future__ import annotations

import uuid
import time
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class DomainCategory(str, Enum):
    WORK = "work"
    LEARNING = "learning"
    ENTERTAINMENT = "entertainment"
    SOCIAL = "social"
    COMMUNICATION = "communication"
    NEWS = "news"
    SHOPPING = "shopping"
    NEXUS = "nexus"
    UNKNOWN = "unknown"


class MarkerCategory(str, Enum):
    COGNITIVE_INTENT = "cognitive_intent"
    STRUGGLE_FRICTION = "struggle_friction"
    FOCUS_PRODUCTIVITY = "focus_productivity"
    EMOTIONAL_PROXIES = "emotional_proxies"
    DECISION_BEHAVIOR = "decision_behavior"
    AVOIDANCE_ESCAPE = "avoidance_escape"
    HABIT_ROUTINE = "habit_routine"
    META = "meta"
    NEXUS_LEARNING = "nexus_learning"


class MarkerType(str, Enum):
    # A. Cognitive Intent
    SEARCH_QUERY = "SEARCH_QUERY"
    QUESTION_TYPED = "QUESTION_TYPED"
    TOPIC_LOOP = "TOPIC_LOOP"
    RESEARCH_SESSION = "RESEARCH_SESSION"
    # B. Struggle / Friction
    RAPID_EDITING = "RAPID_EDITING"
    REWRITE_LOOP = "REWRITE_LOOP"
    APP_SWITCH_THRASH = "APP_SWITCH_THRASH"
    LONG_PAUSE = "LONG_PAUSE"
    ERROR_RETRY = "ERROR_RETRY"
    # C. Focus / Productivity
    DEEP_FOCUS = "DEEP_FOCUS"
    FLOW_STATE = "FLOW_STATE"
    TASK_COMPLETION = "TASK_COMPLETION"
    LOW_SWITCHING = "LOW_SWITCHING"
    # D. Emotional Proxies
    TYPING_VARIANCE = "TYPING_VARIANCE"
    BURST_TYPING = "BURST_TYPING"
    HESITATION = "HESITATION"
    INTENSITY_SPIKE = "INTENSITY_SPIKE"
    # E. Decision Behavior
    COMPARISON_LOOP = "COMPARISON_LOOP"
    TAB_REVISIT = "TAB_REVISIT"
    FILE_REOPEN = "FILE_REOPEN"
    DELAYED_DECISION = "DELAYED_DECISION"
    # F. Avoidance / Escape
    CONTEXT_ESCAPE = "CONTEXT_ESCAPE"
    SOCIAL_CHECK_LOOP = "SOCIAL_CHECK_LOOP"
    TAB_HOPPING = "TAB_HOPPING"
    SHORT_TASK_ABORT = "SHORT_TASK_ABORT"
    # G. Habit / Routine
    DAILY_PATTERN = "DAILY_PATTERN"
    APP_SEQUENCE = "APP_SEQUENCE"
    TIME_CLUSTER = "TIME_CLUSTER"
    WORK_START_PATTERN = "WORK_START_PATTERN"
    # H. Meta
    SESSION_START = "SESSION_START"
    SESSION_END = "SESSION_END"
    CONTEXT_SHIFT = "CONTEXT_SHIFT"
    ANOMALY = "ANOMALY"
    # I. Nexus Platform — site engagement signals
    NEXUS_SECTION_VIEWED = "NEXUS_SECTION_VIEWED"          # section entered viewport
    NEXUS_SECTION_TIME = "NEXUS_SECTION_TIME"              # time spent in section on leave
    NEXUS_CTA_CLICKED = "NEXUS_CTA_CLICKED"                # any call-to-action button
    NEXUS_NAV_CLICKED = "NEXUS_NAV_CLICKED"                # top-nav link used
    NEXUS_CARD_HOVERED = "NEXUS_CARD_HOVERED"              # feature/protocol card hover
    NEXUS_PRICING_VIEWED = "NEXUS_PRICING_VIEWED"          # pricing tier in viewport
    NEXUS_EMAIL_SIGNUP = "NEXUS_EMAIL_SIGNUP"              # email form submitted
    NEXUS_SCROLL_MILESTONE = "NEXUS_SCROLL_MILESTONE"      # 25/50/75/100% page scroll
    # I.b Nexus Learning (for when full learning features are added)
    NEXUS_LESSON_STARTED = "NEXUS_LESSON_STARTED"
    NEXUS_LESSON_COMPLETED = "NEXUS_LESSON_COMPLETED"
    NEXUS_LESSON_ABANDONED = "NEXUS_LESSON_ABANDONED"
    NEXUS_VIDEO_PAUSED = "NEXUS_VIDEO_PAUSED"
    NEXUS_VIDEO_REWOUND = "NEXUS_VIDEO_REWOUND"
    NEXUS_VIDEO_COMPLETED = "NEXUS_VIDEO_COMPLETED"
    NEXUS_QUIZ_ANSWERED = "NEXUS_QUIZ_ANSWERED"
    NEXUS_QUIZ_COMPLETED = "NEXUS_QUIZ_COMPLETED"
    NEXUS_SEARCH_PERFORMED = "NEXUS_SEARCH_PERFORMED"
    NEXUS_CONTENT_SCROLLED = "NEXUS_CONTENT_SCROLLED"
    NEXUS_RECOMMENDATION_CLICKED = "NEXUS_RECOMMENDATION_CLICKED"
    NEXUS_RECOMMENDATION_IGNORED = "NEXUS_RECOMMENDATION_IGNORED"
    NEXUS_FEEDBACK_GIVEN = "NEXUS_FEEDBACK_GIVEN"


MARKER_CATEGORY_MAP: dict[MarkerType, MarkerCategory] = {
    # A
    MarkerType.SEARCH_QUERY: MarkerCategory.COGNITIVE_INTENT,
    MarkerType.QUESTION_TYPED: MarkerCategory.COGNITIVE_INTENT,
    MarkerType.TOPIC_LOOP: MarkerCategory.COGNITIVE_INTENT,
    MarkerType.RESEARCH_SESSION: MarkerCategory.COGNITIVE_INTENT,
    # B
    MarkerType.RAPID_EDITING: MarkerCategory.STRUGGLE_FRICTION,
    MarkerType.REWRITE_LOOP: MarkerCategory.STRUGGLE_FRICTION,
    MarkerType.APP_SWITCH_THRASH: MarkerCategory.STRUGGLE_FRICTION,
    MarkerType.LONG_PAUSE: MarkerCategory.STRUGGLE_FRICTION,
    MarkerType.ERROR_RETRY: MarkerCategory.STRUGGLE_FRICTION,
    # C
    MarkerType.DEEP_FOCUS: MarkerCategory.FOCUS_PRODUCTIVITY,
    MarkerType.FLOW_STATE: MarkerCategory.FOCUS_PRODUCTIVITY,
    MarkerType.TASK_COMPLETION: MarkerCategory.FOCUS_PRODUCTIVITY,
    MarkerType.LOW_SWITCHING: MarkerCategory.FOCUS_PRODUCTIVITY,
    # D
    MarkerType.TYPING_VARIANCE: MarkerCategory.EMOTIONAL_PROXIES,
    MarkerType.BURST_TYPING: MarkerCategory.EMOTIONAL_PROXIES,
    MarkerType.HESITATION: MarkerCategory.EMOTIONAL_PROXIES,
    MarkerType.INTENSITY_SPIKE: MarkerCategory.EMOTIONAL_PROXIES,
    # E
    MarkerType.COMPARISON_LOOP: MarkerCategory.DECISION_BEHAVIOR,
    MarkerType.TAB_REVISIT: MarkerCategory.DECISION_BEHAVIOR,
    MarkerType.FILE_REOPEN: MarkerCategory.DECISION_BEHAVIOR,
    MarkerType.DELAYED_DECISION: MarkerCategory.DECISION_BEHAVIOR,
    # F
    MarkerType.CONTEXT_ESCAPE: MarkerCategory.AVOIDANCE_ESCAPE,
    MarkerType.SOCIAL_CHECK_LOOP: MarkerCategory.AVOIDANCE_ESCAPE,
    MarkerType.TAB_HOPPING: MarkerCategory.AVOIDANCE_ESCAPE,
    MarkerType.SHORT_TASK_ABORT: MarkerCategory.AVOIDANCE_ESCAPE,
    # G
    MarkerType.DAILY_PATTERN: MarkerCategory.HABIT_ROUTINE,
    MarkerType.APP_SEQUENCE: MarkerCategory.HABIT_ROUTINE,
    MarkerType.TIME_CLUSTER: MarkerCategory.HABIT_ROUTINE,
    MarkerType.WORK_START_PATTERN: MarkerCategory.HABIT_ROUTINE,
    # H
    MarkerType.SESSION_START: MarkerCategory.META,
    MarkerType.SESSION_END: MarkerCategory.META,
    MarkerType.CONTEXT_SHIFT: MarkerCategory.META,
    MarkerType.ANOMALY: MarkerCategory.META,
    # I.a — site engagement
    MarkerType.NEXUS_SECTION_VIEWED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_SECTION_TIME: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_CTA_CLICKED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_NAV_CLICKED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_CARD_HOVERED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_PRICING_VIEWED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_EMAIL_SIGNUP: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_SCROLL_MILESTONE: MarkerCategory.NEXUS_LEARNING,
    # I.b — learning
    MarkerType.NEXUS_LESSON_STARTED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_LESSON_COMPLETED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_LESSON_ABANDONED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_VIDEO_PAUSED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_VIDEO_REWOUND: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_VIDEO_COMPLETED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_QUIZ_ANSWERED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_QUIZ_COMPLETED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_SEARCH_PERFORMED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_CONTENT_SCROLLED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_RECOMMENDATION_CLICKED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_RECOMMENDATION_IGNORED: MarkerCategory.NEXUS_LEARNING,
    MarkerType.NEXUS_FEEDBACK_GIVEN: MarkerCategory.NEXUS_LEARNING,
}


class DominantMode(str, Enum):
    FOCUS = "FOCUS"
    EXPLORE = "EXPLORE"
    STRUGGLE = "STRUGGLE"
    ROUTINE = "ROUTINE"
    ESCAPE = "ESCAPE"


class SentimentLabel(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"


class ConnectorStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    SYNCING = "syncing"


# ---------------------------------------------------------------------------
# Core Models
# ---------------------------------------------------------------------------

def _new_uuid() -> str:
    return str(uuid.uuid4())


def _now() -> float:
    return time.time()


class EventContext(BaseModel):
    app: str | None = None
    window_title: str | None = None
    url: str | None = None
    domain: str | None = None
    domain_category: DomainCategory = DomainCategory.UNKNOWN
    duration: float | None = None  # seconds
    # Nexus content metadata — populated for NEXUS_* events
    lesson_id: str | None = None
    course_id: str | None = None
    topic_tags: list[str] = Field(default_factory=list)
    difficulty: int | None = None  # 1 (easiest) – 5 (hardest)
    content_type: str | None = None  # "video" | "article" | "quiz" | "exercise" | "lesson"


class BehavioralEvent(BaseModel):
    event_id: str = Field(default_factory=_new_uuid)
    type: MarkerType
    source: str  # "desktop" | "browser" | connector id
    timestamp: float = Field(default_factory=_now)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    context: EventContext = Field(default_factory=EventContext)
    metadata: dict[str, Any] = Field(default_factory=dict)
    session_id: str | None = None


class MarkerResult(BaseModel):
    marker: MarkerType
    confidence: float = Field(ge=0.0, le=1.0)
    context: EventContext = Field(default_factory=EventContext)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SessionSummary(BaseModel):
    focus_score: float = Field(ge=0.0, le=1.0, default=0.0)
    struggle_score: float = Field(ge=0.0, le=1.0, default=0.0)
    productivity_score: float = Field(ge=0.0, le=1.0, default=0.0)
    dominant_mode: DominantMode = DominantMode.EXPLORE
    top_apps: list[str] = Field(default_factory=list)
    top_domains: list[str] = Field(default_factory=list)
    topic_clusters: list[str] = Field(default_factory=list)


class Session(BaseModel):
    session_id: str = Field(default_factory=_new_uuid)
    start: float
    end: float | None = None
    duration_minutes: float = 0.0
    markers: list[BehavioralEvent] = Field(default_factory=list)
    marker_counts: dict[str, int] = Field(default_factory=dict)
    summary: SessionSummary = Field(default_factory=SessionSummary)


class SentimentResult(BaseModel):
    event_id: str | None = None
    session_id: str | None = None
    trigger_rule: str
    polarity: float = Field(ge=-1.0, le=1.0)
    magnitude: float = Field(ge=0.0, le=1.0)
    label: SentimentLabel
    input_text: str | None = None
    created_at: float = Field(default_factory=_now)


class BehavioralProfile(BaseModel):
    user_nexus_id: str | None = None
    # Behavioral trait scores (0-1, 0.5 = neutral / insufficient data).
    # Named for what they measure, not a personality theory.
    trait_exploration_breadth: float = 0.5    # topic/domain diversity and curiosity
    trait_focus_consistency: float = 0.5       # routine regularity and sustained attention
    trait_social_orientation: float = 0.5      # communication/social platform preference
    trait_friction_tolerance: float = 0.5      # persistence under difficulty
    trait_emotional_volatility: float = 0.5    # variance in engagement patterns
    trait_confidence: float = 0.0              # 0–1, grows with more data
    # Learning behavior descriptors
    learning_style_primary: str | None = None
    learning_style_secondary: str | None = None
    learning_approach: str | None = None  # sequential | global
    learning_mode: str | None = None  # active | reflective
    # Aggregate scores
    avg_focus_score: float = 0.0
    avg_struggle_score: float = 0.0
    peak_focus_hours: list[int] = Field(default_factory=list)
    low_energy_hours: list[int] = Field(default_factory=list)
    top_interests: list[dict[str, Any]] = Field(default_factory=list)
    burnout_risk_score: float = 0.0
    total_sessions: int = 0
    total_events: int = 0
    last_updated: float = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# Agent State — snapshot of the desktop agent's current observation
# ---------------------------------------------------------------------------

class AgentState(BaseModel):
    """Live snapshot captured by the desktop agent each polling cycle."""
    timestamp: float = Field(default_factory=_now)
    # Active window
    active_app: str = ""
    window_title: str = ""
    # Keyboard metrics (rolling window)
    keystroke_rate: float = 0.0  # keys per second
    backspace_rate: float = 0.0  # fraction of keystrokes that are backspace
    typing_variance: float = 0.0  # std-dev of inter-key intervals
    inter_key_interval: float = 0.0  # current avg inter-key interval (seconds)
    # Mouse metrics
    click_rate: float = 0.0  # clicks per second
    scroll_velocity: float = 0.0
    mouse_idle_seconds: float = 0.0
    # App switching
    app_switches: int = 0  # count in current window
    app_switch_history: list[str] = Field(default_factory=list)  # last N apps
    # Focus tracking
    focus_app: str = ""  # app with longest continuous focus
    focus_duration: float = 0.0  # seconds in current focused app
    # Timing
    idle_seconds: float = 0.0  # total idle time (no input)
    active_seconds: float = 0.0  # total active time this session
