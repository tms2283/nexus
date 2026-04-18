"""AI chat import connector — parses exported conversations from ChatGPT, Claude, and Gemini.

All three platforms let users export their data as JSON archives.
This connector extracts conversation topics, question patterns, and
engagement signals without storing raw conversation content.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from connectors.base import BaseConnector, AuthResult, ConnectorInfo
from core.schemas import BehavioralEvent, EventContext, MarkerType, DomainCategory, ConnectorStatus

logger = logging.getLogger(__name__)


def _extract_topics(text: str, max_length: int = 200) -> str:
    """Extract a topic summary from text, truncated for privacy."""
    # Take the first line or first sentence as the topic
    first_line = text.split("\n")[0].strip()
    if len(first_line) > max_length:
        return first_line[:max_length] + "..."
    return first_line


def _count_questions(messages: list[dict], role_key: str = "role", content_key: str = "content") -> int:
    """Count question marks in user messages as a proxy for inquiry behavior."""
    count = 0
    for msg in messages:
        if msg.get(role_key) in ("user", "human"):
            content = msg.get(content_key, "")
            if isinstance(content, str):
                count += content.count("?")
            elif isinstance(content, list):
                # Handle structured content (e.g., ChatGPT with parts)
                for part in content:
                    if isinstance(part, str):
                        count += part.count("?")
                    elif isinstance(part, dict) and part.get("type") == "text":
                        count += part.get("text", "").count("?")
    return count


class AIChatImportConnector(BaseConnector):
    connector_id = "ai_chat_import"
    display_name = "AI Chat History"
    auth_type = "data_import"

    def __init__(self) -> None:
        self._status = ConnectorStatus.DISCONNECTED
        self._last_sync: float | None = None
        self._imported_events: list[BehavioralEvent] = []

    async def authenticate(self, credentials: dict) -> AuthResult:
        """Validate that the import file/directory exists."""
        import_path = credentials.get("import_path")
        if not import_path:
            return AuthResult(
                success=False,
                error="Provide 'import_path' pointing to the exported data directory or JSON file",
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

    def import_chatgpt(self, export_path: str) -> list[BehavioralEvent]:
        """Import ChatGPT conversations from conversations.json.

        ChatGPT export format:
        [
          {
            "title": "...",
            "create_time": 1234567890.0,
            "update_time": 1234567890.0,
            "mapping": { node_id: { "message": { "author": {"role": "user"}, "content": {"parts": [...]} } } }
          }
        ]
        """
        events: list[BehavioralEvent] = []
        path = Path(export_path)

        # Look for conversations.json
        conv_file = path / "conversations.json" if path.is_dir() else path
        if not conv_file.exists():
            logger.error("ChatGPT conversations.json not found at %s", conv_file)
            return events

        try:
            data = json.loads(conv_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.error("Failed to parse ChatGPT export: %s", e)
            return events

        if not isinstance(data, list):
            logger.error("Expected list of conversations, got %s", type(data).__name__)
            return events

        for conversation in data[:1000]:
            title = conversation.get("title", "Untitled")
            create_time = conversation.get("create_time")
            update_time = conversation.get("update_time")

            # Count messages and questions from mapping
            mapping = conversation.get("mapping", {})
            user_msg_count = 0
            assistant_msg_count = 0
            question_count = 0
            topics: list[str] = []

            for node in mapping.values():
                msg = node.get("message")
                if not msg:
                    continue
                author = msg.get("author", {}).get("role", "")
                content = msg.get("content", {})
                parts = content.get("parts", []) if isinstance(content, dict) else []

                text = ""
                for part in parts:
                    if isinstance(part, str):
                        text += part

                if author == "user":
                    user_msg_count += 1
                    question_count += text.count("?")
                    if text and len(topics) < 3:
                        topics.append(_extract_topics(text, 100))
                elif author == "assistant":
                    assistant_msg_count += 1

            total_msgs = user_msg_count + assistant_msg_count

            events.append(BehavioralEvent(
                type=MarkerType.RESEARCH_SESSION,
                source="chatgpt",
                confidence=0.8,
                context=EventContext(
                    app="ChatGPT",
                    window_title=title[:200],
                    domain="chat.openai.com",
                    domain_category=DomainCategory.LEARNING,
                ),
                metadata={
                    "action": "conversation",
                    "platform": "chatgpt",
                    "title": title,
                    "user_messages": user_msg_count,
                    "assistant_messages": assistant_msg_count,
                    "total_messages": total_msgs,
                    "question_count": question_count,
                    "topics": topics,
                    "create_time": create_time,
                    "update_time": update_time,
                    "engagement_depth": "deep" if total_msgs > 20 else "moderate" if total_msgs > 6 else "shallow",
                },
            ))

        logger.info("Imported %d ChatGPT conversations", len(events))
        self._imported_events.extend(events)
        self._last_sync = (events[-1].timestamp if events else None)
        self._status = ConnectorStatus.CONNECTED
        return events

    def import_claude(self, export_path: str) -> list[BehavioralEvent]:
        """Import Claude conversations from exported JSON.

        Claude export format (from claude.ai settings):
        [
          {
            "uuid": "...",
            "name": "...",
            "created_at": "2024-...",
            "updated_at": "2024-...",
            "chat_messages": [
              { "sender": "human", "text": "..." },
              { "sender": "assistant", "text": "..." }
            ]
          }
        ]
        """
        events: list[BehavioralEvent] = []
        path = Path(export_path)

        # Find conversation files
        if path.is_dir():
            json_files = list(path.glob("*.json"))
        else:
            json_files = [path]

        for json_file in json_files:
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logger.warning("Failed to parse %s: %s", json_file, e)
                continue

            conversations = data if isinstance(data, list) else [data]

            for conversation in conversations[:1000]:
                name = conversation.get("name", "Untitled")
                created = conversation.get("created_at", "")
                updated = conversation.get("updated_at", "")
                messages = conversation.get("chat_messages", [])

                user_msgs = [m for m in messages if m.get("sender") == "human"]
                assistant_msgs = [m for m in messages if m.get("sender") == "assistant"]
                question_count = _count_questions(messages, "sender", "text")

                topics: list[str] = []
                for msg in user_msgs[:3]:
                    text = msg.get("text", "")
                    if text:
                        topics.append(_extract_topics(text, 100))

                total_msgs = len(user_msgs) + len(assistant_msgs)

                events.append(BehavioralEvent(
                    type=MarkerType.RESEARCH_SESSION,
                    source="claude",
                    confidence=0.8,
                    context=EventContext(
                        app="Claude",
                        window_title=name[:200],
                        domain="claude.ai",
                        domain_category=DomainCategory.LEARNING,
                    ),
                    metadata={
                        "action": "conversation",
                        "platform": "claude",
                        "title": name,
                        "user_messages": len(user_msgs),
                        "assistant_messages": len(assistant_msgs),
                        "total_messages": total_msgs,
                        "question_count": question_count,
                        "topics": topics,
                        "created_at": created,
                        "updated_at": updated,
                        "engagement_depth": "deep" if total_msgs > 20 else "moderate" if total_msgs > 6 else "shallow",
                    },
                ))

        logger.info("Imported %d Claude conversations", len(events))
        self._imported_events.extend(events)
        self._status = ConnectorStatus.CONNECTED
        return events

    def import_gemini(self, export_path: str) -> list[BehavioralEvent]:
        """Import Gemini/Bard conversations from Google Takeout.

        Found under: Takeout/Gemini Apps/Conversations/
        Each conversation is a separate JSON file.
        """
        events: list[BehavioralEvent] = []
        path = Path(export_path)

        if path.is_dir():
            json_files = list(path.glob("**/*.json"))
        else:
            json_files = [path]

        for json_file in json_files:
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logger.warning("Failed to parse %s: %s", json_file, e)
                continue

            # Gemini Takeout structure varies; handle common patterns
            conversations = data if isinstance(data, list) else [data]

            for conversation in conversations[:500]:
                # Try different field names Gemini uses
                title = (
                    conversation.get("title")
                    or conversation.get("name")
                    or conversation.get("topic", "Untitled")
                )
                created = conversation.get("createTime", conversation.get("create_time", ""))

                # Messages may be under different keys
                messages = (
                    conversation.get("messages")
                    or conversation.get("chat_messages")
                    or conversation.get("turns")
                    or []
                )

                user_msg_count = 0
                assistant_msg_count = 0
                question_count = 0
                topics: list[str] = []

                for msg in messages:
                    role = (
                        msg.get("role")
                        or msg.get("author")
                        or msg.get("sender", "")
                    ).lower()
                    content = msg.get("content") or msg.get("text") or msg.get("parts", "")

                    if isinstance(content, list):
                        content = " ".join(
                            p if isinstance(p, str) else p.get("text", "")
                            for p in content
                        )

                    if role in ("user", "human", "0"):
                        user_msg_count += 1
                        if isinstance(content, str):
                            question_count += content.count("?")
                            if len(topics) < 3:
                                topics.append(_extract_topics(content, 100))
                    elif role in ("assistant", "model", "1"):
                        assistant_msg_count += 1

                total_msgs = user_msg_count + assistant_msg_count
                if total_msgs == 0:
                    continue

                events.append(BehavioralEvent(
                    type=MarkerType.RESEARCH_SESSION,
                    source="gemini",
                    confidence=0.75,
                    context=EventContext(
                        app="Gemini",
                        window_title=str(title)[:200],
                        domain="gemini.google.com",
                        domain_category=DomainCategory.LEARNING,
                    ),
                    metadata={
                        "action": "conversation",
                        "platform": "gemini",
                        "title": str(title),
                        "user_messages": user_msg_count,
                        "assistant_messages": assistant_msg_count,
                        "total_messages": total_msgs,
                        "question_count": question_count,
                        "topics": topics,
                        "created_at": created,
                        "engagement_depth": "deep" if total_msgs > 20 else "moderate" if total_msgs > 6 else "shallow",
                    },
                ))

        logger.info("Imported %d Gemini conversations", len(events))
        self._imported_events.extend(events)
        self._status = ConnectorStatus.CONNECTED
        return events

    async def get_status(self) -> ConnectorInfo:
        return ConnectorInfo(
            connector_id=self.connector_id,
            display_name=self.display_name,
            auth_type=self.auth_type,
            status=self._status,
            last_sync=self._last_sync,
        )
