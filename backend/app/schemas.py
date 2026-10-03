
from pydantic import BaseModel


class ModelInfo(BaseModel):
    id: str
    label: str
    provider: str
    local: bool


class ProviderStatus(BaseModel):
    id: str
    available: bool
    error: str | None = None


class ModelsResponse(BaseModel):
    models: list[ModelInfo]
    providers: list[ProviderStatus]


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    model: str | None = None
    messages: list[ChatMessage]
    temperature: float = 0.7
