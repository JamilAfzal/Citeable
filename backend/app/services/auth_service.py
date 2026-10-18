import uuid
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError, Forbidden, TooManyRequests, Unauthorized
from app.core.utils import as_utc, utcnow
from app.models import OneTimeToken, RefreshToken, User
from app.services.email_service import EmailService
from app.services.google_service import GoogleOAuthService
from app.services.password_service import PasswordService
from app.services.token_service import TokenService
from app.services.user_service import UserService


@dataclass
class ClientContext:
    ip: str | None = None
    user_agent: str | None = None


@dataclass
class AuthSession:
    user: User
    access_token: str
    expires_in: int
    refresh_token: str


INVALID_CREDS = dict(message="Incorrect email or password", code="invalid_credentials")


class AuthService:
    def __init__(self, db: AsyncSession, settings: Settings, users: UserService, passwords: PasswordService,
                 tokens: TokenService, email: EmailService, google: GoogleOAuthService):
        self.db, self.s, self.users = db, settings, users
        self.passwords, self.tokens, self.email, self.google = passwords, tokens, email, google

    # ---------- registration & verification ----------
    async def register(self, full_name: str, email: str, password: str) -> None:
        """Always looks identical to the caller, so emails cannot be enumerated."""
        existing = await self.users.get_by_email(email)
        if existing:
            await self.email.send_account_exists(existing.email)
            return
        try:
            user = await self.users.create(email=email, full_name=full_name, password_hash=await self.passwords.hash(password))
        except IntegrityError:
            await self.db.rollback()
            return
        await self.email.send_verification(user.email, await self._issue_one_time(user, "verify", timedelta(hours=self.s.verify_token_hours)))

    async def verify_email(self, raw: str) -> None:
        user = await self._consume_one_time(raw, "verify")
        user.is_verified = True

    async def resend_verification(self, email: str) -> None:
        user = await self.users.get_by_email(email)
        if user and user.is_active and not user.is_verified:
            await self.email.send_verification(user.email, await self._issue_one_time(user, "verify", timedelta(hours=self.s.verify_token_hours)))

    # ---------- login ----------
    async def login(self, email: str, password: str, ctx: ClientContext) -> AuthSession:
        user = await self.users.get_by_email(email)
        if user is None or user.password_hash is None:
            await self.passwords.dummy_verify()
            raise Unauthorized(**INVALID_CREDS)

        locked_until = as_utc(user.locked_until)
        if locked_until and locked_until > utcnow():
            minutes = int((locked_until - utcnow()).total_seconds() // 60) + 1
            raise TooManyRequests(f"Too many failed attempts. Try again in {minutes} minute(s).", code="account_locked")

        if not await self.passwords.verify(user.password_hash, password):
            user.failed_login_count += 1
            if user.failed_login_count >= self.s.max_failed_logins:
                user.locked_until = utcnow() + timedelta(minutes=self.s.lockout_minutes)
                user.failed_login_count = 0
            await self.db.commit()  # persist the counter even though we raise
            raise Unauthorized(**INVALID_CREDS)

        if not user.is_active:
            raise Forbidden("This account is disabled", code="account_disabled")
        if self.s.require_verified_email and not user.is_verified:
            raise Forbidden("Verify your email before logging in", code="email_not_verified")

        user.failed_login_count, user.locked_until = 0, None
        if self.passwords.needs_rehash(user.password_hash):
            user.password_hash = await self.passwords.hash(password)
        return await self._start_session(user, ctx)

    async def google_login(self, token: str, ctx: ClientContext) -> AuthSession:
        ident = await self.google.verify(token)
        if not ident.email or not ident.email_verified:
            raise Unauthorized("Google account email is not verified", code="google_email_unverified")
        user = await self.users.get_by_google_sub(ident.sub)
        if user is None:
            user = await self.users.get_by_email(ident.email)
            if user is None:
                user = await self.users.create(email=ident.email, full_name=ident.name, google_sub=ident.sub, is_verified=True)
            else:
                if user.google_sub and user.google_sub != ident.sub:
                    raise Unauthorized("This email is linked to a different Google account", code="google_mismatch")
                if not user.is_verified:
                    user.password_hash = None  # drop any password set by a squatter before the real owner linked Google
                user.google_sub, user.is_verified = ident.sub, True
        if not user.is_active:
            raise Forbidden("This account is disabled", code="account_disabled")
        return await self._start_session(user, ctx)

    # ---------- sessions ----------
    async def refresh(self, raw: str | None, ctx: ClientContext) -> AuthSession:
        if not raw:
            raise Unauthorized("Session expired", code="session_expired")
        rec = await self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == self.tokens.hash(raw)))
        if rec is None:
            raise Unauthorized("Session expired", code="session_expired")
        now = utcnow()
        if rec.revoked_at is not None:
            if (now - as_utc(rec.revoked_at)).total_seconds() > self.s.refresh_reuse_grace_seconds:
                await self._revoke_family(rec.family_id)  # stolen-token replay: kill the whole chain
                await self.db.commit()
            raise Unauthorized("Session expired", code="session_expired")
        user = await self.users.get(rec.user_id)
        if as_utc(rec.expires_at) <= now or user is None or not user.is_active:
            raise Unauthorized("Session expired", code="session_expired")
        rec.revoked_at = now
        return await self._start_session(user, ctx, family_id=rec.family_id)

    async def logout(self, raw: str | None) -> None:
        if raw:
            rec = await self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == self.tokens.hash(raw)))
            if rec:
                await self._revoke_family(rec.family_id)

    async def logout_all(self, user: User) -> None:
        await self._kill_all_sessions(user)

    # ---------- password flows ----------
    async def forgot_password(self, email: str) -> None:
        user = await self.users.get_by_email(email)
        if user and user.is_active:
            await self.email.send_password_reset(user.email, await self._issue_one_time(user, "reset", timedelta(minutes=self.s.reset_token_minutes)))

    async def reset_password(self, raw: str, new_password: str) -> None:
        user = await self._consume_one_time(raw, "reset")
        user.password_hash = await self.passwords.hash(new_password)
        user.is_verified = True  # they proved control of the inbox
        user.failed_login_count, user.locked_until = 0, None
        await self._kill_all_sessions(user)

    async def change_password(self, user: User, current: str, new: str, ctx: ClientContext) -> AuthSession:
        if user.password_hash is None:
            raise AppError("This account has no password yet. Use 'Forgot password' to set one.", code="no_password")
        if not await self.passwords.verify(user.password_hash, current):
            raise Unauthorized("Current password is incorrect", code="invalid_credentials")
        user.password_hash = await self.passwords.hash(new)
        await self._kill_all_sessions(user)
        return await self._start_session(user, ctx)

    # ---------- internals ----------
    async def _start_session(self, user: User, ctx: ClientContext, family_id: uuid.UUID | None = None) -> AuthSession:
        user.last_login_at = utcnow()
        access, expires_in = self.tokens.create_access_token(user.id, user.session_version)
        raw, hashed = self.tokens.new_opaque()
        self.db.add(RefreshToken(
            user_id=user.id, family_id=family_id or uuid.uuid4(), token_hash=hashed,
            expires_at=utcnow() + timedelta(days=self.s.refresh_token_days),
            user_agent=(ctx.user_agent or "")[:255] or None, ip=ctx.ip,
        ))
        await self.db.flush()
        return AuthSession(user, access, expires_in, raw)

    async def _revoke_family(self, family_id: uuid.UUID) -> None:
        await self.db.execute(update(RefreshToken).where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None)).values(revoked_at=utcnow()))

    async def _kill_all_sessions(self, user: User) -> None:
        user.session_version += 1
        await self.db.execute(update(RefreshToken).where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)).values(revoked_at=utcnow()))

    async def _issue_one_time(self, user: User, purpose: str, ttl: timedelta) -> str:
        await self.db.execute(update(OneTimeToken).where(OneTimeToken.user_id == user.id, OneTimeToken.purpose == purpose, OneTimeToken.used_at.is_(None)).values(used_at=utcnow()))
        raw, hashed = self.tokens.new_opaque()
        self.db.add(OneTimeToken(user_id=user.id, purpose=purpose, token_hash=hashed, expires_at=utcnow() + ttl))
        await self.db.flush()
        return raw

    async def _consume_one_time(self, raw: str, purpose: str) -> User:
        rec = await self.db.scalar(select(OneTimeToken).where(OneTimeToken.token_hash == self.tokens.hash(raw), OneTimeToken.purpose == purpose))
        if rec is None or rec.used_at is not None or as_utc(rec.expires_at) <= utcnow():
            raise AppError("This link is invalid or has expired", code="invalid_token")
        user = await self.users.get(rec.user_id)
        if user is None or not user.is_active:
            raise AppError("This link is invalid or has expired", code="invalid_token")
        rec.used_at = utcnow()
        return user
