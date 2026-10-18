import asyncio
from dataclasses import dataclass

from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as g_requests
from google.oauth2 import id_token

from app.core.config import Settings
from app.core.errors import AppError, Unauthorized


@dataclass
class GoogleIdentity:
    sub: str
    email: str
    email_verified: bool
    name: str


class GoogleOAuthService:
    """Verifies a Google ID token (signature, expiry, audience, issuer) from Google Identity Services."""

    def __init__(self, settings: Settings):
        self.client_id = settings.google_client_id

    async def verify(self, token: str) -> GoogleIdentity:
        if not self.client_id:
            raise AppError("Google sign-in is not configured", code="google_not_configured", status_code=503)
        try:
            info = await asyncio.to_thread(id_token.verify_oauth2_token, token, g_requests.Request(), self.client_id, 10)
        except (ValueError, GoogleAuthError):
            raise Unauthorized("Invalid Google token", code="invalid_google_token")
        email = (info.get("email") or "").lower()
        return GoogleIdentity(info["sub"], email, bool(info.get("email_verified")), info.get("name") or email.split("@")[0])
