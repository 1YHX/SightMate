from datetime import datetime

from fastapi import APIRouter

from app.config import settings
from app.schemas import VisionChatRequest, VisionChatResponse


router = APIRouter(prefix="/api/vision", tags=["vision"])


@router.post("/chat", response_model=VisionChatResponse)
def chat_with_vision(request: VisionChatRequest) -> VisionChatResponse:
    answer = (
        "这是一个本地 mock 回答：后端已经收到你的问题和当前画面截图。"
        f"你的问题是“{request.question}”。"
        "下一步接入阿里云千问视觉模型后，这里会返回真实视觉理解结果。"
    )

    return VisionChatResponse(
        answer=answer,
        model=settings.aliyun_vision_model,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
