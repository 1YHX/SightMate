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
