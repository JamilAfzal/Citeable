from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings
from app.core.database import build_engine, build_session_factory
from app.core.errors import register_error_handlers
from app.core.middleware import SecurityHeadersMiddleware
from app.core.rate_limit import RateLimiter
from app.models import Base
from app.routers import auth, domains, users
from app.services.password_service import PasswordService


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = build_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.auto_create_tables:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        yield
        await engine.dispose()

    app = FastAPI(title=settings.app_name, lifespan=lifespan,
                  docs_url=None if settings.is_production else "/docs",
                  redoc_url=None, openapi_url=None if settings.is_production else "/openapi.json")
    app.state.settings = settings
    app.state.session_factory = build_session_factory(engine)
    app.state.rate_limiter = RateLimiter()
    app.state.password_service = PasswordService()

    app.add_middleware(SecurityHeadersMiddleware, hsts=settings.is_production)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])
    register_error_handlers(app)

    for r in (auth.router, users.router, domains.router):
        app.include_router(r, prefix="/api/v1")

    @app.get("/health", include_in_schema=False)
    async def health():
        return {"status": "ok"}

    return app
