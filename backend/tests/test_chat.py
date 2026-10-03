import pytest
from unittest.mock import AsyncMock, MagicMock
from app.providers.base import Provider, ProviderError
from app.providers.registry import ProviderRegistry
from app.core.config import Settings
import json

class FakeProvider(Provider):
    def __init__(self, id, label, local=False, configured=True, default_model="gpt-4"):
        self.id = id
        self.label = label
        self.local = local
        self.configured = configured
        self.default_model = default_model
        self.models = []
        self.should_fail = False
        self.fail_before_first_token = True

    async def list_models(self):
        return self.models

    def stream_chat(self, model, messages, temperature):
        # The service expects an AsyncIterator[str].
        # We must return an async generator.
        async def async_generator():
            if self.should_fail:
                if self.fail_before_first_token:
                    raise ProviderError("Failure before first token")
                else:
                    yield "Hello "
                    raise ProviderError("Failure after first token")

            yield "Hello"
            yield " world"
            yield "!"

        return async_generator()

    async def aclose(self):
        pass

@pytest.fixture
def settings():
    return Settings(cloud_priority=["anthropic", "openai"])

@pytest.fixture
def registry(settings):
    reg = ProviderRegistry(settings)
    reg.providers = {
        "ollama": FakeProvider("ollama", "Ollama", local=True),
        "anthropic": FakeProvider("anthropic", "Anthropic"),
        "openai": FakeProvider("openai", "OpenAI"),
    }
    return reg

def test_candidate_selection_order(registry):
    candidates = registry.get_candidates(None)
    assert candidates[0][0].id == "ollama"
    assert candidates[1][0].id == "anthropic"
    assert candidates[2][0].id == "openai"

def test_candidate_selection_selected_model(registry):
    candidates = registry.get_candidates("anthropic-sonnet")
    assert candidates[0][0].id == "anthropic"

@pytest.mark.asyncio
async def test_fallback_before_first_token(registry):
    from app.services.chat import stream_chat

    registry.providers["ollama"].should_fail = True
    registry.providers["ollama"].fail_before_first_token = True
    registry.providers["anthropic"].should_fail = False

    tokens = []
    async for event in stream_chat(registry, None, [], 0.7, True):
        tokens.append(event)

    meta = json.loads(tokens[0].replace("data: ", ""))
    assert meta["fallback"] is True
    assert "Ollama" in meta["notice"]
    assert any("Hello" in t for t in tokens)

@pytest.mark.asyncio
async def test_fallback_after_first_token(registry):
    from app.services.chat import stream_chat

    registry.providers["ollama"].should_fail = True
    registry.providers["ollama"].fail_before_first_token = False

    tokens = []
    async for event in stream_chat(registry, None, [], 0.7, True):
        tokens.append(event)

    # It should NOT fallback because it already sent a token
    # The stream should end with an error or just stop
    assert any("Hello" in t for t in tokens)
    meta_events = [t for t in tokens if "meta" in t]
    assert len(meta_events) <= 1
