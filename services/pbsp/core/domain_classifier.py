"""Classifies URLs and application names into behavioral categories.

Uses a curated domain/app mapping with pattern-based fallback.
Categories drive marker detection (e.g., work->entertainment context shifts).
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

from core.schemas import DomainCategory


# ---------------------------------------------------------------------------
# Domain classification rules (domain-suffix -> category)
# ---------------------------------------------------------------------------

_DOMAIN_RULES: dict[str, DomainCategory] = {
    # Learning
    "stackoverflow.com": DomainCategory.LEARNING,
    "stackexchange.com": DomainCategory.LEARNING,
    "github.com": DomainCategory.LEARNING,
    "gitlab.com": DomainCategory.LEARNING,
    "docs.python.org": DomainCategory.LEARNING,
    "developer.mozilla.org": DomainCategory.LEARNING,
    "w3schools.com": DomainCategory.LEARNING,
    "freecodecamp.org": DomainCategory.LEARNING,
    "coursera.org": DomainCategory.LEARNING,
    "udemy.com": DomainCategory.LEARNING,
    "edx.org": DomainCategory.LEARNING,
    "khanacademy.org": DomainCategory.LEARNING,
    "leetcode.com": DomainCategory.LEARNING,
    "hackerrank.com": DomainCategory.LEARNING,
    "medium.com": DomainCategory.LEARNING,
    "dev.to": DomainCategory.LEARNING,
    "wikipedia.org": DomainCategory.LEARNING,
    "arxiv.org": DomainCategory.LEARNING,
    "scholar.google.com": DomainCategory.LEARNING,
    "realpython.com": DomainCategory.LEARNING,
    "learn.microsoft.com": DomainCategory.LEARNING,
    "cloud.google.com": DomainCategory.LEARNING,
    "docs.aws.amazon.com": DomainCategory.LEARNING,
    "brilliant.org": DomainCategory.LEARNING,
    "skillshare.com": DomainCategory.LEARNING,
    "pluralsight.com": DomainCategory.LEARNING,
    "codecademy.com": DomainCategory.LEARNING,
    # Work
    "jira.atlassian.com": DomainCategory.WORK,
    "trello.com": DomainCategory.WORK,
    "notion.so": DomainCategory.WORK,
    "asana.com": DomainCategory.WORK,
    "linear.app": DomainCategory.WORK,
    "figma.com": DomainCategory.WORK,
    "vercel.com": DomainCategory.WORK,
    "netlify.com": DomainCategory.WORK,
    "heroku.com": DomainCategory.WORK,
    "console.cloud.google.com": DomainCategory.WORK,
    "portal.azure.com": DomainCategory.WORK,
    "aws.amazon.com": DomainCategory.WORK,
    "bitbucket.org": DomainCategory.WORK,
    "confluence.atlassian.com": DomainCategory.WORK,
    "clickup.com": DomainCategory.WORK,
    "monday.com": DomainCategory.WORK,
    "airtable.com": DomainCategory.WORK,
    "miro.com": DomainCategory.WORK,
    # Social Media
    "facebook.com": DomainCategory.SOCIAL,
    "instagram.com": DomainCategory.SOCIAL,
    "twitter.com": DomainCategory.SOCIAL,
    "x.com": DomainCategory.SOCIAL,
    "tiktok.com": DomainCategory.SOCIAL,
    "reddit.com": DomainCategory.SOCIAL,
    "linkedin.com": DomainCategory.SOCIAL,
    "snapchat.com": DomainCategory.SOCIAL,
    "pinterest.com": DomainCategory.SOCIAL,
    "tumblr.com": DomainCategory.SOCIAL,
    "threads.net": DomainCategory.SOCIAL,
    "bsky.app": DomainCategory.SOCIAL,
    "mastodon.social": DomainCategory.SOCIAL,
    "discord.com": DomainCategory.SOCIAL,
    # Entertainment
    "youtube.com": DomainCategory.ENTERTAINMENT,
    "netflix.com": DomainCategory.ENTERTAINMENT,
    "twitch.tv": DomainCategory.ENTERTAINMENT,
    "disneyplus.com": DomainCategory.ENTERTAINMENT,
    "hulu.com": DomainCategory.ENTERTAINMENT,
    "primevideo.com": DomainCategory.ENTERTAINMENT,
    "crunchyroll.com": DomainCategory.ENTERTAINMENT,
    "spotify.com": DomainCategory.ENTERTAINMENT,
    "soundcloud.com": DomainCategory.ENTERTAINMENT,
    "music.apple.com": DomainCategory.ENTERTAINMENT,
    "music.youtube.com": DomainCategory.ENTERTAINMENT,
    "store.steampowered.com": DomainCategory.ENTERTAINMENT,
    "epicgames.com": DomainCategory.ENTERTAINMENT,
    "9gag.com": DomainCategory.ENTERTAINMENT,
    "imgur.com": DomainCategory.ENTERTAINMENT,
    # Communication
    "mail.google.com": DomainCategory.COMMUNICATION,
    "outlook.live.com": DomainCategory.COMMUNICATION,
    "outlook.office.com": DomainCategory.COMMUNICATION,
    "teams.microsoft.com": DomainCategory.COMMUNICATION,
    "slack.com": DomainCategory.COMMUNICATION,
    "zoom.us": DomainCategory.COMMUNICATION,
    "meet.google.com": DomainCategory.COMMUNICATION,
    "web.whatsapp.com": DomainCategory.COMMUNICATION,
    "web.telegram.org": DomainCategory.COMMUNICATION,
    "messages.google.com": DomainCategory.COMMUNICATION,
    # News
    "news.ycombinator.com": DomainCategory.NEWS,
    "cnn.com": DomainCategory.NEWS,
    "bbc.com": DomainCategory.NEWS,
    "nytimes.com": DomainCategory.NEWS,
    "theguardian.com": DomainCategory.NEWS,
    "reuters.com": DomainCategory.NEWS,
    "techcrunch.com": DomainCategory.NEWS,
    "theverge.com": DomainCategory.NEWS,
    "arstechnica.com": DomainCategory.NEWS,
    "wired.com": DomainCategory.NEWS,
    # Shopping
    "amazon.com": DomainCategory.SHOPPING,
    "ebay.com": DomainCategory.SHOPPING,
    "etsy.com": DomainCategory.SHOPPING,
    "walmart.com": DomainCategory.SHOPPING,
    "target.com": DomainCategory.SHOPPING,
    "aliexpress.com": DomainCategory.SHOPPING,
    "bestbuy.com": DomainCategory.SHOPPING,
    "newegg.com": DomainCategory.SHOPPING,
}

# Pattern-based fallback for domains not in the explicit list
_DOMAIN_PATTERNS: list[tuple[re.Pattern, DomainCategory]] = [
    (re.compile(r"docs?\.", re.IGNORECASE), DomainCategory.LEARNING),
    (re.compile(r"learn\.", re.IGNORECASE), DomainCategory.LEARNING),
    (re.compile(r"wiki\.", re.IGNORECASE), DomainCategory.LEARNING),
    (re.compile(r"tutorial", re.IGNORECASE), DomainCategory.LEARNING),
    (re.compile(r"mail\.", re.IGNORECASE), DomainCategory.COMMUNICATION),
    (re.compile(r"chat\.", re.IGNORECASE), DomainCategory.COMMUNICATION),
    (re.compile(r"shop\.|store\.", re.IGNORECASE), DomainCategory.SHOPPING),
    (re.compile(r"news\.", re.IGNORECASE), DomainCategory.NEWS),
]


# ---------------------------------------------------------------------------
# Application name classification
# ---------------------------------------------------------------------------

_APP_RULES: dict[str, DomainCategory] = {
    # Work / Development
    "code": DomainCategory.WORK,
    "visual studio code": DomainCategory.WORK,
    "vscode": DomainCategory.WORK,
    "visual studio": DomainCategory.WORK,
    "pycharm": DomainCategory.WORK,
    "intellij": DomainCategory.WORK,
    "webstorm": DomainCategory.WORK,
    "sublime text": DomainCategory.WORK,
    "notepad++": DomainCategory.WORK,
    "vim": DomainCategory.WORK,
    "neovim": DomainCategory.WORK,
    "terminal": DomainCategory.WORK,
    "cmd": DomainCategory.WORK,
    "powershell": DomainCategory.WORK,
    "windows terminal": DomainCategory.WORK,
    "warp": DomainCategory.WORK,
    "iterm": DomainCategory.WORK,
    "git bash": DomainCategory.WORK,
    "postman": DomainCategory.WORK,
    "docker desktop": DomainCategory.WORK,
    "unity": DomainCategory.WORK,
    "blender": DomainCategory.WORK,
    "photoshop": DomainCategory.WORK,
    "illustrator": DomainCategory.WORK,
    "premiere": DomainCategory.WORK,
    "after effects": DomainCategory.WORK,
    "excel": DomainCategory.WORK,
    "word": DomainCategory.WORK,
    "powerpoint": DomainCategory.WORK,
    "google sheets": DomainCategory.WORK,
    "google docs": DomainCategory.WORK,
    # Communication
    "outlook": DomainCategory.COMMUNICATION,
    "thunderbird": DomainCategory.COMMUNICATION,
    "slack": DomainCategory.COMMUNICATION,
    "microsoft teams": DomainCategory.COMMUNICATION,
    "teams": DomainCategory.COMMUNICATION,
    "zoom": DomainCategory.COMMUNICATION,
    "discord": DomainCategory.COMMUNICATION,
    "telegram": DomainCategory.COMMUNICATION,
    "whatsapp": DomainCategory.COMMUNICATION,
    "signal": DomainCategory.COMMUNICATION,
    # Entertainment
    "spotify": DomainCategory.ENTERTAINMENT,
    "vlc": DomainCategory.ENTERTAINMENT,
    "steam": DomainCategory.ENTERTAINMENT,
    "epic games": DomainCategory.ENTERTAINMENT,
    "xbox": DomainCategory.ENTERTAINMENT,
    "itunes": DomainCategory.ENTERTAINMENT,
    "windows media player": DomainCategory.ENTERTAINMENT,
    "plex": DomainCategory.ENTERTAINMENT,
    # Learning
    "anki": DomainCategory.LEARNING,
    "obsidian": DomainCategory.LEARNING,
    "logseq": DomainCategory.LEARNING,
    "notion": DomainCategory.LEARNING,
    "onenote": DomainCategory.LEARNING,
    "evernote": DomainCategory.LEARNING,
    "kindle": DomainCategory.LEARNING,
    "adobe reader": DomainCategory.LEARNING,
    "acrobat": DomainCategory.LEARNING,
    "zotero": DomainCategory.LEARNING,
    "mendeley": DomainCategory.LEARNING,
}


def classify_domain(url: str | None) -> tuple[str | None, DomainCategory]:
    """Classify a URL into a domain and category.

    Returns (domain, category).  If url is None, returns (None, UNKNOWN).
    """
    if not url:
        return None, DomainCategory.UNKNOWN

    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower().lstrip("www.")
    except Exception:
        return None, DomainCategory.UNKNOWN

    if not hostname:
        return None, DomainCategory.UNKNOWN

    # Exact match first (check full hostname, then strip subdomains)
    parts = hostname.split(".")
    for i in range(len(parts)):
        candidate = ".".join(parts[i:])
        if candidate in _DOMAIN_RULES:
            return hostname, _DOMAIN_RULES[candidate]

    # Check path for Nexus-specific patterns (Learning context)
    path = parsed.path.lower()
    if "/course" in path or "/labs" in path or "/foundation" in path:
        return hostname, DomainCategory.LEARNING

    # Pattern fallback
    for pattern, category in _DOMAIN_PATTERNS:
        if pattern.search(hostname):
            return hostname, category

    return hostname, DomainCategory.UNKNOWN


def classify_app(app_name: str | None) -> DomainCategory:
    """Classify an application name into a category."""
    if not app_name:
        return DomainCategory.UNKNOWN

    normalized = app_name.lower().strip()

    # Exact match
    if normalized in _APP_RULES:
        return _APP_RULES[normalized]

    # Partial match (app name contains a known key)
    for key, category in _APP_RULES.items():
        if key in normalized:
            return category

    # Browser detection — browsers are categorized by the URL they show, not as apps
    browsers = {"chrome", "firefox", "edge", "safari", "brave", "opera", "vivaldi", "arc"}
    for browser in browsers:
        if browser in normalized:
            return DomainCategory.UNKNOWN  # Will be classified by URL instead

    return DomainCategory.UNKNOWN
