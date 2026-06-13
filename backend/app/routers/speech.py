from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.schemas import SpeechSynthesisRequest, SpeechSynthesisResponse
from app.services.aliyun_tts_service import (
    AliyunTTSConfigurationError,
    AliyunTTSService,
    AliyunTTSUpstreamError,
)


router = APIRouter(prefix="/api/speech", tags=["speech"])
tts_service = AliyunTTSService()


@router.post("/synthesize", response_model=SpeechSynthesisResponse)
async def synthesize_speech(request: SpeechSynthesisRequest) -> SpeechSynthesisResponse:
    try:
        audio_url, audio_format = await tts_service.synthesize(request.text)
    except AliyunTTSConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="后端未配置阿里云 API Key，请检查 ALIYUN_API_KEY。",
        ) from error
    except AliyunTTSUpstreamError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="阿里云语音合成调用失败，已回退到浏览器播报。",
        ) from error

    return SpeechSynthesisResponse(
        audio_url=audio_url,
        format=audio_format,
        model=settings.aliyun_tts_model,
    )
