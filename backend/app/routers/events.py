from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from backend.app.core.events import event_bus

router = APIRouter(prefix="/events", tags=["Real-Time Events (SSE)"])


@router.get("/stream")
async def stream_events():
    return StreamingResponse(
        event_bus.subscribe(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
