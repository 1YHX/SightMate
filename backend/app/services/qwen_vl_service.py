import logging

import httpx

from app.config import settings
from app.schemas import ChatHistoryMessage


logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
你是 SightMate，一个 AI 视觉对话助手。你正在和用户进行摄像头画面辅助的自然对话。

回答规则：
1. 优先回答用户当前提出的问题，不要默认描述图片。
2. 只有当用户的问题与当前画面、物体、场景、文字、位置或视觉判断有关时，才分析图片。
3. 如果用户问“你是谁”“你能做什么”等身份或能力问题，请直接说明你是 SightMate，可以在用户提问时查看当前摄像头截图并回答问题。
4. 如果画面与问题无关，请不要强行描述画面。
5. 回答要自然、简洁、口语化，适合直接语音播报。
6. 默认用 1 到 3 句话回答；只有用户明确要求详细解释时，才展开说明。
""".strip()


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
                            "type": "text",
                            "text": (
                                f"{SYSTEM_PROMPT}\n\n"
                                f"用户当前问题：{question}\n\n"
                                "下面的图片是用户提问瞬间的摄像头截图，只在问题需要视觉信息时作为参考。"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_base64,
                            },
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
            logger.warning(
                "Qwen-VL upstream HTTP %s: %s",
                error.response.status_code,
                error.response.text[:1000],
            )
            raise QwenVLUpstreamError(
                f"Qwen-VL upstream returned status {error.response.status_code}"
            ) from error
        except httpx.TimeoutException as error:
            logger.warning("Qwen-VL upstream request timed out")
            raise QwenVLUpstreamError("Qwen-VL upstream request timed out") from error
        except httpx.HTTPError as error:
            logger.warning("Qwen-VL upstream request failed: %s", error)
            raise QwenVLUpstreamError("Qwen-VL upstream request failed") from error

        try:
            data = response.json()
        except ValueError as error:
            logger.warning("Qwen-VL upstream returned non-JSON response: %s", response.text[:1000])
            raise QwenVLUpstreamError("Qwen-VL upstream response is not JSON") from error

        return self._extract_answer(data)

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
