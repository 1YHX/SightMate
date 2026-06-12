import httpx

from app.config import settings
from app.schemas import ChatHistoryMessage


class QwenVLServiceError(Exception):
    pass


class QwenVLConfigurationError(QwenVLServiceError):
    pass


class QwenVLUpstreamError(QwenVLServiceError):
    pass


class QwenVLService:
    def __init__(
        self,
        api_key: str = settings.aliyun_api_key,
        base_url: str = settings.aliyun_base_url,
        model: str = settings.aliyun_vision_model,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def chat(
        self,
        question: str,
        image_base64: str,
        history: list[ChatHistoryMessage],
    ) -> str:
        if not self.api_key:
            raise QwenVLConfigurationError("ALIYUN_API_KEY is not configured")

        payload = {
            "model": self.model,
            "messages": [
                *self._build_history_messages(history),
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": question,
                        },
                    ],
                },
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise QwenVLUpstreamError(
                f"Qwen-VL upstream returned status {error.response.status_code}"
            ) from error
        except httpx.HTTPError as error:
            raise QwenVLUpstreamError("Qwen-VL upstream request failed") from error

        return self._extract_answer(response.json())

    def _build_history_messages(self, history: list[ChatHistoryMessage]) -> list[dict[str, str]]:
        return [
            {
                "role": item.role,
                "content": item.content,
            }
            for item in history
            if item.role in {"user", "assistant"} and item.content.strip()
        ]

    def _extract_answer(self, data: dict) -> str:
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as error:
            raise QwenVLUpstreamError("Qwen-VL upstream response is invalid") from error

        if isinstance(content, str) and content.strip():
            return content.strip()

        if isinstance(content, list):
            text_parts = [
                item.get("text", "").strip()
                for item in content
                if isinstance(item, dict) and item.get("type") == "text"
            ]
            answer = "\n".join(part for part in text_parts if part)
            if answer:
                return answer

        raise QwenVLUpstreamError("Qwen-VL upstream response has no answer")
