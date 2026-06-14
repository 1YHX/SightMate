import asyncio
from urllib.parse import urlencode

import websockets
from fastapi import WebSocket
from websockets.exceptions import ConnectionClosed

from app.config import settings


class RealtimeConfigurationError(Exception):
    pass


class RealtimeProxyService:
    def __init__(
        self,
        api_key: str = settings.aliyun_api_key,
        ws_url: str = settings.aliyun_realtime_ws_url,
        model: str = settings.aliyun_realtime_model,
    ) -> None:
        self.api_key = api_key
        self.ws_url = ws_url
        self.model = model

    async def proxy(self, client_websocket: WebSocket) -> None:
        if not self.api_key:
            raise RealtimeConfigurationError("ALIYUN_API_KEY is not configured")

        realtime_url = f"{self.ws_url}?{urlencode({'model': self.model})}"
        async with websockets.connect(
            realtime_url,
            additional_headers={"Authorization": f"Bearer {self.api_key}"},
            proxy=None,
            ping_interval=20,
            ping_timeout=20,
        ) as upstream_websocket:
            client_to_upstream = asyncio.create_task(
                self._forward_client_to_upstream(client_websocket, upstream_websocket)
            )
            upstream_to_client = asyncio.create_task(
                self._forward_upstream_to_client(client_websocket, upstream_websocket)
            )
            done, pending = await asyncio.wait(
                {client_to_upstream, upstream_to_client},
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()
            for task in done:
                task.result()

    async def _forward_client_to_upstream(self, client_websocket, upstream_websocket) -> None:
        while True:
            message = await client_websocket.receive_text()
            await upstream_websocket.send(message)

    async def _forward_upstream_to_client(self, client_websocket, upstream_websocket) -> None:
        try:
            async for message in upstream_websocket:
                await client_websocket.send_text(message)
        except ConnectionClosed:
            return
