from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from ..schemas import ModelInfo
from .base import Provider, ProviderError


class OpenAICompatibleProvider(Provider):
    def __init__(
        self,
        provider_id: str,
        label: str,
        api_key: str | None,
        base_url: str | None = None,
        default_model: str = "",
    ):
        self.id = provider_id
        self.label = label
        self.local = False
        self.configured = api_key is not None
        self.default_model = default_model
        self.api_key = api_key
        self.base_url = base_url
        if self.configured:
            self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def list_models(self) -> list[ModelInfo]:
        if not self.configured:
            return []
        try:
            response = await self.client.models.list()
            return [
                ModelInfo(id=m.id, label=m.id, provider=self.id, local=self.local)
                for m in response.data
            ]
        except Exception as e:
            # Some providers might fail model listing, return default if available
            if self.default_model:
                return [
                    ModelInfo(
                        id=self.default_model,
                        label=self.default_model,
                        provider=self.id,
                        local=self.local,
                    )
                ]
            raise ProviderError(f"{self.label} unreachable: {e}")

    def stream_chat(
        self, model: str, messages: list, temperature: float
    ) -> AsyncIterator[str]:
        try:
            stream = self.client.chat.completions.create(
                model=model, messages=messages, temperature=temperature, stream=True
            )

            async def generate():
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content

            return generate()
        except Exception as e:
            raise ProviderError(f"{self.label} error: {e}")

    async def aclose(self):
        pass
