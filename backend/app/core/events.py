"""Lightweight in-memory SSE event bus for real-time margin alerts and leakage notifications."""

import asyncio
import json
from typing import AsyncGenerator, Dict, Any


class EventBus:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()

    async def subscribe(self) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        try:
            # Send initial keepalive
            yield "event: connected\ndata: {\"status\": \"connected\"}\n\n"
            while True:
                msg = await queue.get()
                yield msg
        except asyncio.CancelledError:
            pass
        finally:
            self._subscribers.discard(queue)

    async def publish(self, event_type: str, payload: Dict[str, Any]) -> None:
        if not self._subscribers:
            return
        formatted = f"event: {event_type}\ndata: {json.dumps(payload, default=str)}\n\n"
        dead_queues = set()
        for q in self._subscribers:
            try:
                q.put_nowait(formatted)
            except asyncio.QueueFull:
                dead_queues.add(q)
        for dead in dead_queues:
            self._subscribers.discard(dead)


event_bus = EventBus()
