import hashlib
import secrets
import uuid
from datetime import timedelta

import jwt

from app.core.config import Settings
from app.core.errors import Unauthorized
from app.core.utils import utcnow


class AccessClaims:
    def __init__(self, user_id: uuid.UUID, session_version: int):
        self.user_id = user_id
        self.session_version = session_version


class TokenService:
    def __init__(self, settings: Settings):
        self.s = settings

    def create_access_token(self, user_id: uuid.UUID, session_version: int) -> tuple[str, int]:
        now = utcnow()
        ttl = timedelta(minutes=self.s.access_token_minutes)
        payload = {
            "sub": str(user_id), "sv": session_version, "typ": "access", "jti": secrets.token_hex(8),
            "iss": self.s.jwt_issuer, "aud": self.s.jwt_audience, "iat": now, "exp": now + ttl,
        }
        return jwt.encode(payload, self.s.secret_key, algorithm=self.s.jwt_algorithm), int(ttl.total_seconds())

    def decode_access_token(self, token: str) -> AccessClaims:
        try:
            data = jwt.decode(
                token, self.s.secret_key, algorithms=[self.s.jwt_algorithm],
                audience=self.s.jwt_audience, issuer=self.s.jwt_issuer,
                options={"require": ["exp", "iat", "sub", "jti"]},
            )
            if data.get("typ") != "access":
                raise jwt.InvalidTokenError("wrong type")
            return AccessClaims(uuid.UUID(data["sub"]), int(data.get("sv", 0)))
        except (jwt.PyJWTError, ValueError):
            raise Unauthorized("Invalid or expired token", code="invalid_token")

    @staticmethod
    def new_opaque() -> tuple[str, str]:
        raw = secrets.token_urlsafe(48)
        return raw, TokenService.hash(raw)

    @staticmethod
    def hash(raw: str) -> str:
        return hashlib.sha256(raw.encode()).hexdigest()
