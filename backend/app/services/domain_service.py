import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict, Forbidden, NotFound
from app.models import Competitor, Domain, User
from app.schemas.domain import CompetitorCreate, DomainCreate, DomainUpdate

PLAN_DOMAIN_LIMIT = {"trial": 1, "starter": 1, "pro": 3, "agency": 10}
MAX_COMPETITORS = 5


class DomainService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self, user: User) -> list[Domain]:
        return list((await self.db.scalars(select(Domain).where(Domain.user_id == user.id).order_by(Domain.created_at))).all())

    async def get(self, user: User, domain_id: uuid.UUID) -> Domain:
        d = await self.db.scalar(select(Domain).where(Domain.id == domain_id, Domain.user_id == user.id))
        if d is None:
            raise NotFound("Domain not found")  # same answer for "not yours" and "does not exist"
        return d

    async def create(self, user: User, data: DomainCreate) -> Domain:
        limit = PLAN_DOMAIN_LIMIT.get(user.plan, 1)
        if len(await self.list(user)) >= limit:
            raise Forbidden(f"Your {user.plan} plan allows {limit} domain(s). Upgrade to add more.", code="plan_limit")
        d = Domain(user_id=user.id, domain=data.domain, brand_name=data.brand_name, niche=data.niche, competitors=[])
        self.db.add(d)
        try:
            await self.db.flush()
        except IntegrityError:
            await self.db.rollback()
            raise Conflict("You already track this domain", code="domain_exists")
        return d

    async def update(self, user: User, domain_id: uuid.UUID, data: DomainUpdate) -> Domain:
        d = await self.get(user, domain_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(d, k, v)
        await self.db.flush()
        return d

    async def delete(self, user: User, domain_id: uuid.UUID) -> None:
        await self.db.delete(await self.get(user, domain_id))

    async def add_competitor(self, user: User, domain_id: uuid.UUID, data: CompetitorCreate) -> Competitor:
        d = await self.get(user, domain_id)
        if len(d.competitors) >= MAX_COMPETITORS:
            raise Forbidden(f"You can track up to {MAX_COMPETITORS} competitors per domain", code="plan_limit")
        c = Competitor(domain_id=d.id, name=data.name.strip(), website=data.website)
        d.competitors.append(c)
        await self.db.flush()
        return c

    async def remove_competitor(self, user: User, domain_id: uuid.UUID, competitor_id: uuid.UUID) -> None:
        d = await self.get(user, domain_id)
        c = next((c for c in d.competitors if c.id == competitor_id), None)
        if c is None:
            raise NotFound("Competitor not found")
        d.competitors.remove(c)
