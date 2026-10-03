from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings
from app.providers.registry import ProviderRegistry
from app.routes import chat
from app.voice import VoiceSettings, mount_voice
from app.voice_brain import chat_brain


def create_app() -> FastAPI:
    settings = Settings()
    registry = ProviderRegistry(settings)
    registry.build_providers()

    app = FastAPI(title=settings.app_name)

    # Store on app state for DI
    app.state.settings = settings
    app.state.registry = registry

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chat.router)
    mount_voice(app, brain=chat_brain)

    @app.on_event("shutdown")
    async def shutdown():
        await registry.aclose()

    return app


app = create_app()
