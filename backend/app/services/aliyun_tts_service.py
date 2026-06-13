import logging

import httpx

from app.config import settings


logger = logging.getLogger(__name__)


class AliyunTTSServiceError(Exception):
    pass


class AliyunTTSConfigurationError(AliyunTTSServiceError):
    pass


class AliyunTTSUpstreamError(AliyunTTSServiceError):
    pass


class AliyunTTSService:
    def __init__(
        self,
        api_key: str = settings.aliyun_api_key,
        base_url: str = settings.aliyun_tts_base_url,
        model: str = settings.aliyun_tts_model,
        voice: str = settings.aliyun_tts_voice,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.voice = voice

    async def synthesize(self, text: str) -> tuple[str, str]:
        if not self.api_key:
            raise AliyunTTSConfigurationError("ALIYUN_API_KEY is not configured")

        payload = {
            "model": self.model,
            "input": {
                "text": text,
                "voice": self.voice,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    f"{self.base_url}/services/aigc/multimodal-generation/generation",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "X-DashScope-SSE": "disable",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as error:
            logger.warning(
                "Aliyun TTS upstream HTTP %s: %s",
                error.response.status_code,
                error.response.text[:1000],
            )
            raise AliyunTTSUpstreamError(
                f"Aliyun TTS upstream returned status {error.response.status_code}"
            ) from error
        except httpx.TimeoutException as error:
            logger.warning("Aliyun TTS upstream request timed out")
            raise AliyunTTSUpstreamError("Aliyun TTS upstream request timed out") from error
        except httpx.HTTPError as error:
            logger.warning("Aliyun TTS upstream request failed: %s", error)
            raise AliyunTTSUpstreamError("Aliyun TTS upstream request failed") from error

        try:
            data = response.json()
        except ValueError as error:
            logger.warning("Aliyun TTS upstream returned non-JSON response: %s", response.text[:1000])
            raise AliyunTTSUpstreamError("Aliyun TTS upstream response is not JSON") from error

        audio_url = self._extract_audio_url(data)
        return audio_url, "mp3"

    def _extract_audio_url(self, data: dict) -> str:
        try:
            audio = data["output"]["audio"]
        except (KeyError, TypeError) as error:
            logger.warning("Aliyun TTS upstream response is invalid: %s", data)
            raise AliyunTTSUpstreamError("Aliyun TTS upstream response is invalid") from error

        if isinstance(audio, dict):
            url = audio.get("url") or audio.get("audio_url")
            if isinstance(url, str) and url:
                return url

        logger.warning("Aliyun TTS upstream response has no audio URL: %s", data)
        raise AliyunTTSUpstreamError("Aliyun TTS upstream response has no audio URL")
