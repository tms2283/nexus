"""GitHub connector — repositories, commits, issues, and activity via API v3."""

from __future__ import annotations

import os
import time
import logging
from datetime import datetime, timedelta

import httpx

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from connectors.oauth_handler import OAuthHandler, OAuthConfig
from core.schemas import BehavioralEvent, EventContext, MarkerType, DomainCategory, ConnectorStatus

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"


class GitHubConnector(BaseConnector):
    connector_id = "github"
    display_name = "GitHub"
    auth_type = "oauth2"

    def __init__(self) -> None:
        self._oauth = OAuthHandler(OAuthConfig(
            client_id=os.getenv("GITHUB_CLIENT_ID", ""),
            client_secret=os.getenv("GITHUB_CLIENT_SECRET", ""),
            auth_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            scopes=[
                "user:email",
                "read:user",
                "public_repo",
                "repo",
            ],
        ))
        self._access_token: str | None = None
        self._token_expires: float = 0
        self._last_sync: float | None = None
        self._status = ConnectorStatus.DISCONNECTED
        self._username: str | None = None

    async def authenticate(self, credentials: dict) -> AuthResult:
        auth_code = credentials.get("auth_code")
        if auth_code:
            result = await self._oauth.exchange_code(auth_code)
            if result.success:
                self._access_token = result.access_token
                self._token_expires = result.expires_at or 0
                self._status = ConnectorStatus.CONNECTED
                # Fetch username
                await self._fetch_username()
            return result

        url = self._oauth.get_authorization_url(state="github")
        return AuthResult(success=False, error=f"Visit to authorize: {url}")

    async def _fetch_username(self) -> None:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GITHUB_API}/user",
                    headers={"Authorization": f"token {self._access_token}"},
                    timeout=30,
                )
                if response.status_code == 200:
                    self._username = response.json().get("login")
        except Exception:
            logger.debug("Failed to fetch GitHub username", exc_info=True)

    async def _ensure_token(self) -> bool:
        if self._access_token:
            # GitHub standard OAuth tokens don't expire (_token_expires == 0 means no expiry).
            # Only treat as expired when an explicit expiry was set and has passed.
            if self._token_expires == 0 or time.time() < self._token_expires - 300:
                return True
        self._status = ConnectorStatus.ERROR
        return False

    async def fetch_data(self, since: datetime | None = None) -> list[BehavioralEvent]:
        if not await self._ensure_token():
            return []
        if not self._username:
            await self._fetch_username()
        if not self._username:
            logger.error("Cannot fetch GitHub data without username")
            return []

        self._status = ConnectorStatus.SYNCING
        events: list[BehavioralEvent] = []

        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"token {self._access_token}"}

                # User's repositories — reveals interests and projects
                response = await client.get(
                    f"{GITHUB_API}/user/repos",
                    params={"sort": "updated", "per_page": 50},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    for repo in response.json():
                        name = repo.get("name", "")
                        description = repo.get("description", "")[:100]

                        events.append(BehavioralEvent(
                            type=MarkerType.RESEARCH_SESSION,
                            source="github",
                            confidence=0.8,
                            context=EventContext(
                                app="GitHub",
                                window_title=name,
                                domain="github.com",
                                domain_category=DomainCategory.DEVELOPMENT,
                            ),
                            metadata={
                                "action": "repository",
                                "repo_name": name,
                                "description": description,
                                "language": repo.get("language"),
                                "stars": repo.get("stargazers_count", 0),
                                "forks": repo.get("forks_count", 0),
                                "is_fork": repo.get("fork", False),
                                "updated_at": repo.get("updated_at", ""),
                            },
                        ))

                # User's recent commits — reveals coding patterns
                response = await client.get(
                    f"{GITHUB_API}/user/events/public",
                    params={"per_page": 50},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    for event in response.json():
                        event_type = event.get("type", "")
                        if event_type == "PushEvent":
                            repo_name = event.get("repo", {}).get("name", "")
                            payload = event.get("payload", {})
                            commits = payload.get("commits", [])
                            commit_messages = [c.get("message", "")[:50] for c in commits]

                            events.append(BehavioralEvent(
                                type=MarkerType.DEEP_FOCUS,
                                source="github",
                                confidence=0.8,
                                context=EventContext(
                                    app="GitHub",
                                    window_title=repo_name,
                                    domain="github.com",
                                    domain_category=DomainCategory.DEVELOPMENT,
                                ),
                                metadata={
                                    "action": "push",
                                    "repo": repo_name,
                                    "commit_count": len(commits),
                                    "commit_messages": commit_messages[:5],
                                    "created_at": event.get("created_at", ""),
                                },
                            ))

                        elif event_type == "PullRequestEvent":
                            repo_name = event.get("repo", {}).get("name", "")
                            payload = event.get("payload", {})
                            pr_action = payload.get("action", "")
                            pr_title = payload.get("pull_request", {}).get("title", "")[:100]

                            events.append(BehavioralEvent(
                                type=MarkerType.RESEARCH_SESSION,
                                source="github",
                                confidence=0.75,
                                context=EventContext(
                                    app="GitHub",
                                    window_title=pr_title,
                                    domain="github.com",
                                    domain_category=DomainCategory.DEVELOPMENT,
                                ),
                                metadata={
                                    "action": f"pull_request_{pr_action}",
                                    "repo": repo_name,
                                    "pr_title": pr_title,
                                    "created_at": event.get("created_at", ""),
                                },
                            ))

                        elif event_type == "IssuesEvent":
                            repo_name = event.get("repo", {}).get("name", "")
                            payload = event.get("payload", {})
                            issue_action = payload.get("action", "")
                            issue_title = payload.get("issue", {}).get("title", "")[:100]

                            events.append(BehavioralEvent(
                                type=MarkerType.TOPIC_LOOP,
                                source="github",
                                confidence=0.7,
                                context=EventContext(
                                    app="GitHub",
                                    window_title=issue_title,
                                    domain="github.com",
                                    domain_category=DomainCategory.DEVELOPMENT,
                                ),
                                metadata={
                                    "action": f"issue_{issue_action}",
                                    "repo": repo_name,
                                    "issue_title": issue_title,
                                    "created_at": event.get("created_at", ""),
                                },
                            ))

                # Starred repositories — reveals interests
                response = await client.get(
                    f"{GITHUB_API}/user/starred",
                    params={"per_page": 50, "sort": "updated"},
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    starred_repos = [repo.get("name", "") for repo in response.json()]

                    if starred_repos:
                        events.append(BehavioralEvent(
                            type=MarkerType.TOPIC_LOOP,
                            source="github",
                            confidence=0.75,
                            context=EventContext(
                                app="GitHub",
                                domain="github.com",
                                domain_category=DomainCategory.DEVELOPMENT,
                            ),
                            metadata={
                                "action": "starred_repos",
                                "repos": starred_repos[:30],
                                "count": len(starred_repos),
                            },
                        ))

            self._last_sync = time.time()
            self._status = ConnectorStatus.CONNECTED
            logger.info("GitHub sync complete: %d events", len(events))

        except Exception as e:
            self._status = ConnectorStatus.ERROR
            logger.error("GitHub sync failed: %s", e)

        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
