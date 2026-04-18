"""Tests for domain and app classification."""

from core.domain_classifier import classify_domain, classify_app
from core.schemas import DomainCategory


def test_classify_domain_youtube():
    """YouTube is entertainment."""
    assert classify_domain("youtube.com") == DomainCategory.ENTERTAINMENT


def test_classify_domain_github():
    """GitHub is learning."""
    assert classify_domain("github.com") == DomainCategory.LEARNING


def test_classify_domain_google():
    """Google is typically learning (generic search)."""
    result = classify_domain("google.com")
    assert result in [DomainCategory.LEARNING, DomainCategory.UNKNOWN]


def test_classify_domain_unknown():
    """Unknown domains return UNKNOWN."""
    assert classify_domain("completely-unknown-xyz123.io") == DomainCategory.UNKNOWN


def test_classify_app_code():
    """Code.exe is work."""
    assert classify_app("Code.exe") == DomainCategory.WORK


def test_classify_app_spotify():
    """Spotify.exe is entertainment."""
    assert classify_app("Spotify.exe") == DomainCategory.ENTERTAINMENT


def test_classify_app_unknown():
    """Unknown apps return UNKNOWN."""
    assert classify_app("RandomUnknownApp.exe") == DomainCategory.UNKNOWN
