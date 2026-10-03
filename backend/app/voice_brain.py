import json
from collections.abc import AsyncIterator
from fastapi import Request
from app.voice import BrainEvent, BrainRequest
from app.services.chat import stream_chat

async def chat_brain(request: Request, req: BrainRequest) -> AsyncIterator[BrainEvent]:
    # Use the state established in main.py
    settings = request.app.state.settings
    registry = request.app.state.registry

    # Prepare stream_chat arguments
    # The BrainRequest.messages list starts with the voice system prompt
    # and ends with the user's spoken turn.

    async for sse_line in stream_chat(
        registry=registry,
        model=req.model,
        messages=req.messages,
        temperature=req.temperature,
        allow_cloud_fallback=settings.allow_cloud_fallback,
    ):
        # sse_line is "data: {...}\n\n"
        if not sse_line.startswith("data: "):
            continue

        try:
            data = json.loads(sse_line[6:].strip())
        except json.JSONDecodeError:
            continue

        ev_type = data.get("type")

        if ev_type == "text":
            yield ("delta", {"delta": data.get("content", "")})
        elif ev_type == "meta":
            yield ("meta", {
                "provider": data.get("provider"),
                "provider_label": data.get("provider", "").upper(),
                "model": data.get("model"),
                "local": False, # Simplified
                "fallback": data.get("fallback", False),
                "notice": data.get("notice"),
            })
        elif ev_type == "error":
            yield ("error", {"message": data.get("content", "An error occurred")})
        elif ev_type == "done":
            yield ("done", {})
