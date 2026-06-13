from fastapi import APIRouter, status

from app.schemas import AddChatTurnRequest, ChatSession, CreateChatSessionRequest
from app.services.chat_session_store import ChatSessionStore


router = APIRouter(prefix="/api/sessions", tags=["sessions"])
session_store = ChatSessionStore()


@router.get("", response_model=list[ChatSession])
def list_sessions() -> list[ChatSession]:
    return session_store.list_sessions()


@router.post("", response_model=ChatSession, status_code=status.HTTP_201_CREATED)
def create_session(request: CreateChatSessionRequest) -> ChatSession:
    return session_store.create_session(title=request.title, session_id=request.id)


@router.post("/{session_id}/turns", response_model=ChatSession)
def add_turn(session_id: str, request: AddChatTurnRequest) -> ChatSession:
    return session_store.add_turn(session_id=session_id, turn=request.turn)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: str) -> None:
    session_store.delete_session(session_id)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_sessions() -> None:
    session_store.clear_sessions()
