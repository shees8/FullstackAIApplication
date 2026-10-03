from collections.abc import AsyncIterator

import anthropic

from ..schemas import ModelInfo
from .base import Provider, ProviderError


class AnthropicProvider(Provider):
    id = "anthropic"
    label = "Anthropic"
    local = False
    configured = False
    default_model = "claude-3-5-sonnet-20240620"

    def __init__(self, api_key: str | None):
        self.api_key = api_key
        if api_key:
            self.configured = True
            self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def list_models(self) -> list[ModelInfo]:
        if not self.configured:
            return []
        # Anthropic doesn't have a simple 'list models' API for users, return known defaults
        return [
            ModelInfo(
                id=self.default_model,
                label="Claude 3.5 Sonnet",
                provider=self.id,
                local=self.local,
            ),
            ModelInfo(
                id="claude-3-opus-20240229",
                label="Claude 3 Opus",
                provider=self.id,
                local=self.local,
            ),
            ModelInfo(
                id="claude-3-haiku-20240307",
                label="Claude 3 Haiku",
                provider=self.id,
                local=self.local,
            ),
        ]

    def stream_chat(
        self, model: str, messages: list, temperature: float
    ) -> AsyncIterator[str]:
        try:
            # Transform messages to Anthropic format
            anthropic_msgs = [
                {"role": m["role"], "content": m["content"]} for m in messages
            ]

            async def generate():
                async with self.client.messages.stream(
                    max_tokens=4096,
                    messages=anthropic_msgs,
                    model=model,
                    temperature=temperature,
                ) as stream:
                    async for text in stream.text_stream:
                        yield text

            return generate()
        except Exception as e:
            raise ProviderError(f"Anthropic error: {e}")

    async def aclose(self):
        pass
