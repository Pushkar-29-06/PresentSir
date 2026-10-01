import asyncio
import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class SessionEventHub:
    def __init__(self) -> None:
        self._clients: dict[int, set[WebSocket]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, session_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._loop = asyncio.get_running_loop()
        self._clients[session_id].add(websocket)

    def disconnect(self, session_id: int, websocket: WebSocket) -> None:
        clients = self._clients.get(session_id)
        if clients is None:
            return
        clients.discard(websocket)
        if not clients:
            self._clients.pop(session_id, None)

    async def send(self, session_id: int, event: dict[str, Any]) -> None:
        clients = tuple(self._clients.get(session_id, ()))
        if not clients:
            return
        message = json.dumps(event, default=str)
        results = await asyncio.gather(
            *(client.send_text(message) for client in clients),
            return_exceptions=True,
        )
        for client, result in zip(clients, results):
            if isinstance(result, Exception):
                self.disconnect(session_id, client)

    def publish(self, session_id: int, event: dict[str, Any]) -> None:
        if self._loop is None or not self._loop.is_running():
            return
        self._loop.call_soon_threadsafe(
            self._loop.create_task,
            self.send(session_id, event),
        )


session_events = SessionEventHub()
