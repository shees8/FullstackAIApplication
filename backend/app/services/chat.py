import json
from collections.abc import AsyncIterator

from ..providers.base import ProviderError
from ..providers.registry import ProviderRegistry


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def stream_chat(
    registry: ProviderRegistry,
    model: str | None,
    messages: list,
    temperature: float,
    allow_cloud_fallback: bool,
) -> AsyncIterator[str]:
    candidates = await registry.get_candidates(model, allow_cloud_fallback)
    errors: list[str] = []

    for provider, p_model in candidates:
        first_token_received = False
        try:
            gen = provider.stream_chat(p_model, messages, temperature)

            async for token in gen:
                if not first_token_received:
                    first_token_received = True
                    yield _sse(
                        {
                            "type": "meta",
                            "fallback": len(errors) > 0,
                            "notice": "; ".join(errors),
                            "model": p_model,
                            "provider": provider.id,
                        }
                    )
                yield _sse({"type": "text", "content": token})

            if first_token_received:
                yield _sse({"type": "done"})
                return  # Success

            # Provider finished without sending anything: treat as failure
            errors.append(f"{provider.label}: empty response from {p_model}")

        except ProviderError as e:
            msg = getattr(e, "message", str(e))
            if first_token_received:
                # Mid-stream failure: can't fall back cleanly
                yield _sse({"type": "error", "content": msg})
                return
            errors.append(f"{provider.label}: {msg}")

        except Exception as e:  # noqa: BLE001
            if first_token_received:
                yield _sse({"type": "error", "content": f"Unexpected error: {e}"})
                return
            errors.append(f"{provider.label}: unexpected error {e}")

    # Nothing worked: show the real reasons
    detail = "; ".join(errors) or "no providers or models found (is Ollama running with a model pulled?)"
    print("CHAT FAILED:", detail)  # visible in the backend terminal
    yield _sse({"type": "error", "content": f"All providers failed. {detail}"})