from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.schemas import VisionChatRequest, VisionChatResponse
from app.services.qwen_vl_service import (
    QwenVLConfigurationError,
    QwenVLService,
    QwenVLUpstreamError,
)


router = APIRouter(prefix="/api/vision", tags=["vision"])
qwen_vl_service = QwenVLService()


@router.post("/chat", response_model=VisionChatResponse)
async def chat_with_vision(request: VisionChatRequest) -> VisionChatResponse:
    try:
        answer = await qwen_vl_service.chat(
            question=request.question,
            image_base64=request.image_base64,
            history=request.history,
        )
    except QwenVLConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="后端未配置阿里云 API Key，请检查 ALIYUN_API_KEY。",
        ) from error
    except QwenVLUpstreamError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="千问视觉模型调用失败，请稍后重试。",
        ) from error

    return VisionChatResponse(
        answer=answer,
        model=settings.aliyun_vision_model,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
