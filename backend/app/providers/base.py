from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from ..schemas import ModelInfo


class ProviderError(Exception):
    """Custom exception for AI provider failures with user-safe messages."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class Provider(ABC):
    id: str
    label: str
    local: bool
    configured: bool  # True if host/key is present
    default_model: str  # Preferred model for fallback

    @abstractmethod
    async def list_models(self) -> list[ModelInfo]:
        """Fetch available models. Raise ProviderError if unreachable."""

    @abstractmethod
    def stream_chat(
        self, model: str, messages: list, temperature: float
    ) -> AsyncIterator[str]:
        """Stream tokens. Raise ProviderError if it fails."""

    @abstractmethod
    async def aclose(self):
        """Cleanup resources."""
