"""Dependency injection wiring. Routers depend on these; tests override them."""
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import get_session
from app.core.errors import Unauthorized
from app.models import User
from app.services.auth_service import AuthService, ClientContext
from app.services.domain_service import DomainService
from app.services.email_service import EmailService
from app.services.google_service import GoogleOAuthService
from app.services.password_service import PasswordService
from app.services.token_service import TokenService
from app.services.user_service import UserService

bearer = HTTPBearer(auto_error=False)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_password_service(request: Request) -> PasswordService:
    return request.app.state.password_service  # one instance, built once


def get_token_service(settings: Settings = Depends(get_settings)) -> TokenService:
    return TokenService(settings)


def get_email_service(settings: Settings = Depends(get_settings)) -> EmailService:
    return EmailService(settings)


def get_google_service(settings: Settings = Depends(get_settings)) -> GoogleOAuthService:
    return GoogleOAuthService(settings)


def get_user_service(db: AsyncSession = Depends(get_session)) -> UserService:
    return UserService(db)


def get_domain_service(db: AsyncSession = Depends(get_session)) -> DomainService:
    return DomainService(db)


def get_auth_service(
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    users: UserService = Depends(get_user_service),
    passwords: PasswordService = Depends(get_password_service),
    tokens: TokenService = Depends(get_token_service),
    email: EmailService = Depends(get_email_service),
    google: GoogleOAuthService = Depends(get_google_service),
) -> AuthService:
    return AuthService(db, settings, users, passwords, tokens, email, google)


def get_client_context(request: Request) -> ClientContext:
    return ClientContext(ip=request.client.host if request.client else None, user_agent=request.headers.get("user-agent"))


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    tokens: TokenService = Depends(get_token_service),
    users: UserService = Depends(get_user_service),
) -> User:
    if creds is None:
        raise Unauthorized()
    claims = tokens.decode_access_token(creds.credentials)
    user = await users.get(claims.user_id)
    if user is None or not user.is_active or user.session_version != claims.session_version:
        raise Unauthorized("Invalid or expired token", code="invalid_token")
    return user
