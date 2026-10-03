import asyncio
import time

from ..core.config import Settings
from ..schemas import ModelInfo
from .anthropic import AnthropicProvider
from .base import Provider, ProviderError
from .ollama import OllamaProvider
from .openai_compat import OpenAICompatibleProvider


class ProviderRegistry:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.providers: dict[str, Provider] = {}
        self.cache_ttl = 300  # seconds
        self.model_owner: dict[str, str] = {}  # model id -> provider id
        self._last_probe: float = 0.0

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------
    def build_providers(self):
        # Local
        self.providers["ollama"] = OllamaProvider(self.settings.ollama_host)

        # Cloud
        self.providers["anthropic"] = AnthropicProvider(
            self.settings.anthropic_api_key.get_secret_value()
            if self.settings.anthropic_api_key
            else None
        )

        # OpenAI compatible
        self.providers["openai"] = OpenAICompatibleProvider(
            "openai",
            "OpenAI",
            self.settings.openai_api_key.get_secret_value()
            if self.settings.openai_api_key
            else None,
        )
        self.providers["gemini"] = OpenAICompatibleProvider(
            "gemini",
            "Gemini",
            self.settings.google_api_key.get_secret_value()
            if self.settings.google_api_key
            else None,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )
        self.providers["grok"] = OpenAICompatibleProvider(
            "grok",
            "Grok",
            self.settings.grok_api_key.get_secret_value()
            if self.settings.grok_api_key
            else None,
            base_url="https://api.x.ai/v1",
        )
        self.providers["meta"] = OpenAICompatibleProvider(
            "meta",
            "Meta Llama",
            self.settings.meta_api_key.get_secret_value()
            if self.settings.meta_api_key
            else None,
        )

    # ------------------------------------------------------------------
    # Probing / model listing
    # ------------------------------------------------------------------
    async def probe_all(self) -> tuple[dict[str, list[ModelInfo]], dict[str, str | None]]:
        provider_ids = list(self.providers.keys())
        tasks = [self._probe_provider(pid) for pid in provider_ids]
        probe_results = await asyncio.gather(*tasks, return_exceptions=True)

        models: dict[str, list[ModelInfo]] = {}
        errors: dict[str, str | None] = {}

        for pid, res in zip(provider_ids, probe_results):
            if isinstance(res, Exception):
                models[pid] = []
                errors[pid] = str(res)
            else:
                models[pid], errors[pid] = res
        return models, errors

    async def _probe_provider(self, pid: str) -> tuple[list[ModelInfo], str | None]:
        provider = self.providers[pid]
        try:
            return await provider.list_models(), None
        except ProviderError as e:
            return [], getattr(e, "message", str(e))

    async def get_models_response(self):
        probe_data, errors = await self.probe_all()

        all_models: list[ModelInfo] = []
        providers_status = []

        for pid, models in probe_data.items():
            all_models.extend(models)
            providers_status.append(
                {
                    "id": pid,
                    "available": len(models) > 0,
                    "error": errors.get(pid),
                }
            )

        # Remember which provider owns which model (used by chat routing)
        self.model_owner = {m.id: m.provider for m in all_models}
        self._last_probe = time.time()

        return all_models, providers_status

    async def _ensure_models(self, selected_model: str | None):
        stale = (time.time() - self._last_probe) > self.cache_ttl
        unknown = (
            selected_model not in (None, "auto")
            and selected_model not in self.model_owner
        )
        if not self.model_owner or stale or unknown:
            await self.get_models_response()

    # ------------------------------------------------------------------
    # Chat routing
    # ------------------------------------------------------------------
    def _local_default(self) -> str | None:
        for mid, pid in self.model_owner.items():
            if pid == "ollama":
                return mid
        return None

    async def get_candidates(
        self,
        selected_model: str | None,
        allow_cloud_fallback: bool = True,
    ) -> list[tuple[Provider, str]]:
        await self._ensure_models(selected_model)

        candidates: list[tuple[Provider, str]] = []
        local_model = self._local_default()

        # 1. The model the user picked, or local first for "auto"
        if selected_model and selected_model != "auto":
            pid = self.model_owner.get(selected_model)
            if pid in self.providers:
                candidates.append((self.providers[pid], selected_model))
        elif local_model and "ollama" in self.providers:
            candidates.append((self.providers["ollama"], local_model))

        # 2. Fallbacks: Local -> Cloud
        if local_model and "ollama" in self.providers:
            candidates.append((self.providers["ollama"], local_model))

        if allow_cloud_fallback:
            for pid in self.settings.cloud_priority:
                provider = self.providers.get(pid)
                if provider and provider.configured:
                    candidates.append((provider, provider.default_model))

        # Remove duplicate providers, keep order
        seen: set[str] = set()
        unique: list[tuple[Provider, str]] = []
        for p, m in candidates:
            if p.id not in seen:
                unique.append((p, m))
                seen.add(p.id)
        return unique

    async def aclose(self):
        for p in self.providers.values():
            await p.aclose()