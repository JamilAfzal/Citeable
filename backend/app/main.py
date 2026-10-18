from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import select

from app.core.config import Settings
from app.core.database import build_engine, build_session_factory
from app.core.errors import register_error_handlers
from app.core.middleware import SecurityHeadersMiddleware
from app.core.rate_limit import RateLimiter
from app.models import Base, User
from app.routers import admin, auth, domains, users
from app.services.password_service import PasswordService


async def seed_superadmin(session_factory, settings: Settings, passwords: PasswordService) -> None:
    async with session_factory() as session:
        result = await session.execute(
            select(User).where((User.is_superuser.is_(True)) | (User.email == settings.superadmin_email.lower()))
        )
        user = result.scalars().first()
        if user is None:
            admin_user = User(
                email=settings.superadmin_email.lower(),
                full_name=settings.superadmin_name,
                password_hash=await passwords.hash(settings.superadmin_password),
                role="superadmin",
                is_superuser=True,
                is_verified=True,
                is_active=True,
                plan="enterprise",
            )
            session.add(admin_user)
            await session.commit()
        else:
            updated = False
            if not user.is_superuser:
                user.is_superuser = True
                updated = True
            if user.role != "superadmin":
                user.role = "superadmin"
                updated = True
            if not user.is_verified:
                user.is_verified = True
                updated = True
            if updated:
                await session.commit()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = build_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.auto_create_tables:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        await seed_superadmin(app.state.session_factory, settings, app.state.password_service)
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

    for r in (auth.router, users.router, domains.router, admin.router):
        app.include_router(r, prefix="/api/v1")

    @app.get("/health", include_in_schema=False)
    async def health():
        return {"status": "ok"}

    return app
