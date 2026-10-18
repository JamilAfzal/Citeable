import asyncio

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError


class PasswordService:
    """Argon2id hashing, always off the event loop (it is CPU-heavy by design)."""

    def __init__(self) -> None:
        self._hasher = PasswordHasher()
        self._dummy = self._hasher.hash("timing-equaliser-not-a-real-password")

    async def hash(self, password: str) -> str:
        return await asyncio.to_thread(self._hasher.hash, password)

    async def verify(self, password_hash: str, password: str) -> bool:
        def _check() -> bool:
            try:
                return self._hasher.verify(password_hash, password)
            except (VerificationError, InvalidHashError):
                return False
        return await asyncio.to_thread(_check)

    def needs_rehash(self, password_hash: str) -> bool:
        return self._hasher.check_needs_rehash(password_hash)

    async def dummy_verify(self) -> None:
        """Spend the same time as a real check so unknown emails are not detectable by timing."""
        await self.verify(self._dummy, "wrong-password")
