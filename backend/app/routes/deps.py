from fastapi import Request
from ..core.config import Settings
from ..providers.registry import ProviderRegistry

def get_settings(request: Request) -> Settings:
    """Extract settings from app state."""
    return request.app.state.settings

def get_registry(request: Request) -> ProviderRegistry:
    """Extract provider registry from app state."""
    return request.app.state.registry
