from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..core.config import Settings
from ..providers.registry import ProviderRegistry
from ..schemas import ChatRequest, ModelsResponse
from ..services import chat
from .deps import get_registry, get_settings

router = APIRouter(prefix="/api")


@router.get("/models", response_model=ModelsResponse)
async def list_models(registry: ProviderRegistry = Depends(get_registry)):
    models, providers = await registry.get_models_response()
    return ModelsResponse(models=models, providers=providers)


@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    settings: Settings = Depends(get_settings),
    registry: ProviderRegistry = Depends(get_registry),
):
    return StreamingResponse(
        chat.stream_chat(
            registry,
            request.model,
            [m.model_dump() for m in request.messages],
            request.temperature,
            settings.allow_cloud_fallback,
        ),
        media_type="text/event-stream",
    )
