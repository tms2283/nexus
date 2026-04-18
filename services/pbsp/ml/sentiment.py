"""Sentiment analysis — local inference with cloud fallback.

Primary: DistilBERT running locally on CPU (~100ms per inference).
Fallback: Cloud API (OpenAI or Anthropic) for complex multi-text analysis.

Sentiment is only run when triggered by the SentimentTriggerEngine,
never continuously.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from core.schemas import SentimentResult, SentimentLabel

logger = logging.getLogger(__name__)

# Lazy-loaded model to avoid import-time overhead
_pipeline = None
_model_loaded = False


def _get_pipeline():
    """Lazy-load the sentiment analysis pipeline."""
    global _pipeline, _model_loaded
    if _model_loaded:
        return _pipeline

    try:
        from transformers import pipeline as hf_pipeline
        _pipeline = hf_pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1,  # CPU
            truncation=True,
            max_length=512,
        )
        logger.info("Loaded local sentiment model (DistilBERT)")
    except Exception:
        logger.warning("Failed to load local sentiment model — will use VADER fallback")
        _pipeline = None

    _model_loaded = True
    return _pipeline


def _vader_sentiment(text: str) -> tuple[float, float, SentimentLabel]:
    """Lightweight VADER fallback when transformer model isn't available."""
    try:
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
        sid = SentimentIntensityAnalyzer()
        scores = sid.polarity_scores(text)
        compound = scores["compound"]

        if compound >= 0.05:
            label = SentimentLabel.POSITIVE
        elif compound <= -0.05:
            label = SentimentLabel.NEGATIVE
        else:
            label = SentimentLabel.NEUTRAL

        magnitude = abs(compound)
        return compound, magnitude, label
    except ImportError:
        # No NLTK either — return neutral
        return 0.0, 0.0, SentimentLabel.NEUTRAL


def _rule_based_sentiment(text: str) -> tuple[float, float, SentimentLabel]:
    """Ultra-lightweight keyword-based fallback requiring no dependencies."""
    text_lower = text.lower()

    positive_words = {
        "great", "good", "excellent", "amazing", "perfect", "love", "best",
        "awesome", "fantastic", "wonderful", "success", "solved", "fixed",
        "completed", "achieved", "progress", "flow", "productive", "focus",
        "learned", "understand", "breakthrough", "eureka",
    }
    negative_words = {
        "error", "bug", "crash", "fail", "broken", "stuck", "confused",
        "frustrated", "struggling", "difficult", "impossible", "hate",
        "terrible", "awful", "worst", "lost", "problem", "issue",
        "can't", "doesn't work", "burnout", "exhausted", "overwhelmed",
    }

    words = set(text_lower.split())
    pos_count = len(words & positive_words)
    neg_count = len(words & negative_words)
    total = pos_count + neg_count

    if total == 0:
        return 0.0, 0.0, SentimentLabel.NEUTRAL

    polarity = (pos_count - neg_count) / total
    magnitude = total / max(len(words), 1)

    if polarity > 0.1:
        label = SentimentLabel.POSITIVE
    elif polarity < -0.1:
        label = SentimentLabel.NEGATIVE
    elif pos_count > 0 and neg_count > 0:
        label = SentimentLabel.MIXED
    else:
        label = SentimentLabel.NEUTRAL

    return round(polarity, 3), round(min(magnitude, 1.0), 3), label


def analyze_sentiment(text: str) -> tuple[float, float, SentimentLabel]:
    """Analyze sentiment of text using the best available method.

    Returns (polarity: -1 to 1, magnitude: 0 to 1, label).

    Priority:
    1. Local DistilBERT transformer
    2. VADER (NLTK)
    3. Rule-based keyword matching
    """
    if not text or not text.strip():
        return 0.0, 0.0, SentimentLabel.NEUTRAL

    # Try transformer model
    pipe = _get_pipeline()
    if pipe is not None:
        try:
            result = pipe(text[:512])[0]
            label_str = result["label"].upper()
            score = result["score"]

            if label_str == "POSITIVE":
                polarity = score
                label = SentimentLabel.POSITIVE
            elif label_str == "NEGATIVE":
                polarity = -score
                label = SentimentLabel.NEGATIVE
            else:
                polarity = 0.0
                label = SentimentLabel.NEUTRAL

            magnitude = abs(polarity)
            return round(polarity, 3), round(magnitude, 3), label
        except Exception:
            logger.debug("Transformer inference failed, falling back", exc_info=True)

    # Try VADER
    polarity, magnitude, label = _vader_sentiment(text)
    if label != SentimentLabel.NEUTRAL or magnitude > 0:
        return polarity, magnitude, label

    # Rule-based fallback
    return _rule_based_sentiment(text)


def create_sentiment_result(
    trigger_name: str,
    context_text: str,
    event_id: str | None = None,
    session_id: str | None = None,
) -> SentimentResult:
    """Run sentiment analysis and wrap in a SentimentResult."""
    polarity, magnitude, label = analyze_sentiment(context_text)

    return SentimentResult(
        event_id=event_id,
        session_id=session_id,
        trigger_rule=trigger_name,
        polarity=polarity,
        magnitude=magnitude,
        label=label,
        input_text=context_text[:500],  # Truncate for storage
    )
