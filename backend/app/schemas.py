from typing import Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str


class ChatHistoryMessage(BaseModel):
    role: str = Field(..., examples=["user"])
    content: str = Field(..., examples=["画面里有什么？"])


class VisionChatRequest(BaseModel):
    question: str = Field(..., min_length=1, examples=["请描述一下当前画面"])
    image_base64: str = Field(..., min_length=1, examples=["data:image/jpeg;base64,..."])
    history: list[ChatHistoryMessage] = Field(default_factory=list)


class VisionChatResponse(BaseModel):
    answer: str
    model: str
    created_at: str


class SpeechSynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, examples=["你好，我是 SightMate。"])


class SpeechSynthesisResponse(BaseModel):
    audio_url: str
    format: str
    model: str


class ChatTurn(BaseModel):
    id: str
    question: str
    answer: str
    image_base64: str
    model: str
    created_at: str


class ChatSession(BaseModel):
    id: str
    title: str
    turns: list[ChatTurn]
    created_at: str
    updated_at: str


class CreateChatSessionRequest(BaseModel):
    id: Optional[str] = None
    title: str = "新视频对话"


class AddChatTurnRequest(BaseModel):
    turn: ChatTurn
