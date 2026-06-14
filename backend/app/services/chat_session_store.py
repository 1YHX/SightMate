import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import settings
from app.schemas import ChatSession, ChatTurn


class ChatSessionStore:
    def __init__(self, database_path: str = settings.database_path) -> None:
        self.database_path = Path(database_path)
        if not self.database_path.is_absolute():
            self.database_path = Path.cwd() / self.database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()

    def list_sessions(self) -> list[ChatSession]:
        with self._connect() as connection:
            session_rows = connection.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM chat_sessions
                ORDER BY updated_at DESC
                """
            ).fetchall()

            sessions = []
            for session_row in session_rows:
                turn_rows = connection.execute(
                    """
                    SELECT id, question, answer, image_base64, model, created_at
                    FROM chat_turns
                    WHERE session_id = ?
                    ORDER BY turn_index ASC
                    """,
                    (session_row["id"],),
                ).fetchall()
                sessions.append(self._build_session(session_row, turn_rows))

            return sessions

    def create_session(self, title: str = "新视频对话", session_id: Optional[str] = None) -> ChatSession:
        now = self._now()
        next_session_id = session_id or str(uuid.uuid4())
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO chat_sessions (id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (next_session_id, title, now, now),
            )
            connection.commit()

        return ChatSession(
            id=next_session_id,
            title=title,
            turns=[],
            created_at=now,
            updated_at=now,
        )

    def add_turn(self, session_id: Optional[str], turn: ChatTurn) -> ChatSession:
        with self._connect() as connection:
            target_session_id = session_id
            session_row = None
            if target_session_id:
                session_row = connection.execute(
                    """
                    SELECT id, title, created_at, updated_at
                    FROM chat_sessions
                    WHERE id = ?
                    """,
                    (target_session_id,),
                ).fetchone()

            if not session_row:
                target_session_id = str(uuid.uuid4())
                connection.execute(
                    """
                    INSERT INTO chat_sessions (id, title, created_at, updated_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        target_session_id,
                        self._summarize_title(turn.question),
                        turn.created_at,
                        turn.created_at,
                    ),
                )
            else:
                existing_turn_count = connection.execute(
                    "SELECT COUNT(*) AS count FROM chat_turns WHERE session_id = ?",
                    (target_session_id,),
                ).fetchone()["count"]
                if existing_turn_count == 0:
                    connection.execute(
                        "UPDATE chat_sessions SET title = ? WHERE id = ?",
                        (self._summarize_title(turn.question), target_session_id),
                    )

            next_turn_index = connection.execute(
                "SELECT COALESCE(MAX(turn_index), -1) + 1 AS next_index FROM chat_turns WHERE session_id = ?",
                (target_session_id,),
            ).fetchone()["next_index"]
            connection.execute(
                """
                INSERT OR REPLACE INTO chat_turns (
                    id,
                    session_id,
                    question,
                    answer,
                    image_base64,
                    model,
                    created_at,
                    turn_index
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    turn.id,
                    target_session_id,
                    turn.question,
                    turn.answer,
                    turn.image_base64,
                    turn.model,
                    turn.created_at,
                    next_turn_index,
                ),
            )
            connection.execute(
                "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
                (turn.created_at, target_session_id),
            )
            connection.commit()

            session_row = connection.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM chat_sessions
                WHERE id = ?
                """,
                (target_session_id,),
            ).fetchone()
            turn_rows = connection.execute(
                """
                SELECT id, question, answer, image_base64, model, created_at
                FROM chat_turns
                WHERE session_id = ?
                ORDER BY turn_index ASC
                """,
                (target_session_id,),
            ).fetchall()

        return self._build_session(session_row, turn_rows)

    def delete_session(self, session_id: str) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
            connection.commit()

    def clear_sessions(self) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM chat_sessions")
            connection.commit()

    def _connect(self) -> sqlite3.Connection:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _init_database(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_turns (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    image_base64 TEXT NOT NULL,
                    model TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    turn_index INTEGER NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chat_turns_session_id
                ON chat_turns(session_id, turn_index)
                """
            )
            connection.commit()

    def _build_session(
        self,
        session_row: sqlite3.Row,
        turn_rows: list[sqlite3.Row],
    ) -> ChatSession:
        return ChatSession(
            id=session_row["id"],
            title=session_row["title"],
            created_at=session_row["created_at"],
            updated_at=session_row["updated_at"],
            turns=[
                ChatTurn(
                    id=turn_row["id"],
                    question=turn_row["question"],
                    answer=turn_row["answer"],
                    image_base64=turn_row["image_base64"],
                    model=turn_row["model"],
                    created_at=turn_row["created_at"],
                )
                for turn_row in turn_rows
            ],
        )

    def _summarize_title(self, text: str, max_length: int = 18) -> str:
        normalized_text = " ".join(text.split())
        if len(normalized_text) <= max_length:
            return normalized_text
        return f"{normalized_text[:max_length]}..."

    def _now(self) -> str:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
