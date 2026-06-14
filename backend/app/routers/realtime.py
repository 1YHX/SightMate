from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.realtime_proxy_service import (
    RealtimeConfigurationError,
    RealtimeProxyService,
)


router = APIRouter(prefix="/api/realtime", tags=["realtime"])
realtime_proxy_service = RealtimeProxyService()


@router.websocket("/ws")
async def realtime_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await realtime_proxy_service.proxy(websocket)
    except RealtimeConfigurationError:
        await websocket.send_json(
            {
                "type": "error",
                "message": "后端未配置阿里云 API Key，请检查 ALIYUN_API_KEY。",
            }
        )
        await websocket.close(code=1011)
    except WebSocketDisconnect:
        return
    except Exception as error:
        await websocket.send_json(
            {
                "type": "error",
                "message": f"实时模型连接失败：{error}",
            }
        )
        await websocket.close(code=1011)
