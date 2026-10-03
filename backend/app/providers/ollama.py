import json
from collections.abc import AsyncIterator

import httpx

from ..schemas import ModelInfo
from .base import Provider, ProviderError


def _to_dict(msg) -> dict:
    """Accept pydantic objects or plain dicts."""
    if isinstance(msg, dict):
        return {"role": msg.get("role", "user"), "content": msg.get("content", "")}
    return {
        "role": getattr(msg, "role", "user"),
        "content": getattr(msg, "content", ""),
    }


class OllamaProvider(Provider):
    id = "ollama"
    label = "Ollama"
    default_model = "llama3.2:latest"

    def __init__(self, host: str | None = None):
        # Use 127.0.0.1 (not localhost) to avoid IPv6 resolution problems on Windows
        host = (host or "http://127.0.0.1:11434").rstrip("/")
        self.host = host.replace("://localhost", "://127.0.0.1")
        self.api_key = None
        # No read timeout: local models can take a while to load and to think
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=None, write=30.0, pool=5.0)
        )

    # Local Ollama needs no API key
    @property
    def configured(self) -> bool:
        return True

    async def list_models(self) -> list[ModelInfo]:
        try:
            resp = await self.client.get(f"{self.host}/api/tags", timeout=5.0)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise ProviderError(f"Cannot reach Ollama at {self.host}: {e}")

        models = []
        for m in data.get("models", []):
            name = m.get("name") or m.get("model")
            if not name:
                continue
            models.append(
                ModelInfo(id=name, label=name, provider=self.id, local=True)
            )
        return models

    async def stream_chat(
        self,
        model: str,
        messages: list,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        payload = {
            "model": model,
            "messages": [_to_dict(m) for m in messages],
            "stream": True,
            "options": {"temperature": temperature},
        }

        try:
            async with self.client.stream(
                "POST", f"{self.host}/api/chat", json=payload
            ) as resp:
                if resp.status_code != 200:
                    body = (await resp.aread()).decode(errors="replace")
                    raise ProviderError(f"Ollama HTTP {resp.status_code}: {body}")

                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    if data.get("error"):
                        raise ProviderError(f"Ollama: {data['error']}")

                    token = data.get("message", {}).get("content", "")
                    if token:
                        yield token

                    if data.get("done"):
                        break

        except ProviderError:
            raise
        except httpx.ConnectError:
            raise ProviderError(
                f"Cannot connect to Ollama at {self.host}. Is it running?"
            )
        except Exception as e:
            raise ProviderError(f"Ollama stream error: {e}")

    async def aclose(self):
        await self.client.aclose()