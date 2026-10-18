import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        return await self.db.scalar(select(User).where(User.email == email.lower()))

    async def get_by_google_sub(self, sub: str) -> User | None:
        return await self.db.scalar(select(User).where(User.google_sub == sub))

    async def create(self, *, email: str, full_name: str, password_hash: str | None = None,
                     google_sub: str | None = None, is_verified: bool = False) -> User:
        user = User(email=email.lower(), full_name=full_name.strip(), password_hash=password_hash,
                    google_sub=google_sub, is_verified=is_verified)
        self.db.add(user)
        await self.db.flush()
        return user

    async def update_profile(self, user: User, full_name: str) -> User:
        user.full_name = full_name.strip()
        await self.db.flush()
        return user
