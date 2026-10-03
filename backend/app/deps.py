from fastapi import Request

from ..core.config import Settings
from ..providers.registry import ProviderRegistry


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_registry(request: Request) -> ProviderRegistry:
    return request.app.state.registry
