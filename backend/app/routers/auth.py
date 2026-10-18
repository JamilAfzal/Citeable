from fastapi import APIRouter, Cookie, Depends, Response, status

from app.core.config import Settings
from app.core.rate_limit import rate_limit
from app.deps import get_auth_service, get_client_context, get_current_user, get_settings
from app.models import User
from app.schemas.auth import (ChangePasswordRequest, EmailRequest, GoogleLoginRequest, LoginRequest, RegisterRequest,
                              ResetPasswordRequest, TokenRequest, TokenResponse)
from app.schemas.common import Message
from app.services.auth_service import AuthService, AuthSession, ClientContext

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "refresh_token"
COOKIE_PATH = "/api/v1/auth"  # the browser only sends it to auth endpoints


def _respond(response: Response, session: AuthSession, settings: Settings) -> TokenResponse:
    response.set_cookie(COOKIE, session.refresh_token, max_age=settings.refresh_token_days * 86400, httponly=True,
                        secure=settings.is_production, samesite="lax", path=COOKIE_PATH)
    return TokenResponse(access_token=session.access_token, expires_in=session.expires_in, user=session.user)


@router.post("/register", status_code=status.HTTP_202_ACCEPTED, response_model=Message, dependencies=[Depends(rate_limit("register", 5))])
async def register(body: RegisterRequest, auth: AuthService = Depends(get_auth_service)):
    await auth.register(body.full_name, str(body.email), body.password)
    return Message(message="If this email can be registered, a verification link is on its way.")


@router.post("/verify-email", response_model=Message, dependencies=[Depends(rate_limit("verify", 10))])
async def verify_email(body: TokenRequest, auth: AuthService = Depends(get_auth_service)):
    await auth.verify_email(body.token)
    return Message(message="Email verified. You can log in now.")


@router.post("/resend-verification", response_model=Message, dependencies=[Depends(rate_limit("resend", 3))])
async def resend_verification(body: EmailRequest, auth: AuthService = Depends(get_auth_service)):
    await auth.resend_verification(str(body.email))
    return Message(message="If the account needs verification, a new link is on its way.")


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(rate_limit("login", 10))])
async def login(body: LoginRequest, response: Response, auth: AuthService = Depends(get_auth_service),
                ctx: ClientContext = Depends(get_client_context), settings: Settings = Depends(get_settings)):
    return _respond(response, await auth.login(str(body.email), body.password, ctx), settings)


@router.post("/google", response_model=TokenResponse, dependencies=[Depends(rate_limit("google", 20))])
async def google(body: GoogleLoginRequest, response: Response, auth: AuthService = Depends(get_auth_service),
                 ctx: ClientContext = Depends(get_client_context), settings: Settings = Depends(get_settings)):
    return _respond(response, await auth.google_login(body.id_token, ctx), settings)


@router.post("/refresh", response_model=TokenResponse, dependencies=[Depends(rate_limit("refresh", 30))])
async def refresh(response: Response, refresh_token: str | None = Cookie(default=None, alias=COOKIE),
                  auth: AuthService = Depends(get_auth_service), ctx: ClientContext = Depends(get_client_context),
                  settings: Settings = Depends(get_settings)):
    return _respond(response, await auth.refresh(refresh_token, ctx), settings)


@router.post("/logout", response_model=Message)
async def logout(response: Response, refresh_token: str | None = Cookie(default=None, alias=COOKIE),
                 auth: AuthService = Depends(get_auth_service)):
    await auth.logout(refresh_token)
    response.delete_cookie(COOKIE, path=COOKIE_PATH)
    return Message(message="Logged out")


@router.post("/logout-all", response_model=Message)
async def logout_all(response: Response, user: User = Depends(get_current_user), auth: AuthService = Depends(get_auth_service)):
    await auth.logout_all(user)
    response.delete_cookie(COOKIE, path=COOKIE_PATH)
    return Message(message="Logged out of all devices")


@router.post("/forgot-password", response_model=Message, dependencies=[Depends(rate_limit("forgot", 5))])
async def forgot_password(body: EmailRequest, auth: AuthService = Depends(get_auth_service)):
    await auth.forgot_password(str(body.email))
    return Message(message="If an account exists, a reset link is on its way.")


@router.post("/reset-password", response_model=Message, dependencies=[Depends(rate_limit("reset", 10))])
async def reset_password(body: ResetPasswordRequest, auth: AuthService = Depends(get_auth_service)):
    await auth.reset_password(body.token, body.password)
    return Message(message="Password updated. Log in with your new password.")


@router.post("/change-password", response_model=TokenResponse, dependencies=[Depends(rate_limit("change", 10))])
async def change_password(body: ChangePasswordRequest, response: Response, user: User = Depends(get_current_user),
                          auth: AuthService = Depends(get_auth_service), ctx: ClientContext = Depends(get_client_context),
                          settings: Settings = Depends(get_settings)):
    return _respond(response, await auth.change_password(user, body.current_password, body.new_password, ctx), settings)
