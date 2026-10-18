import uuid
from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import get_session
from app.core.errors import NotFound
from app.deps import get_auth_service, get_client_context, get_current_superadmin, get_settings
from app.models import Domain, User
from app.schemas.admin import AdminStatsOut, AdminUserListItem
from app.schemas.auth import TokenResponse
from app.schemas.domain import DomainOut
from app.services.auth_service import AuthService, ClientContext

router = APIRouter(prefix="/admin", tags=["admin"])
COOKIE = "refresh_token"
COOKIE_PATH = "/api/v1/auth"


@router.get("/stats", response_model=AdminStatsOut)
async def get_admin_stats(
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_session),
):
    total_customers = await db.scalar(select(func.count(User.id)).where(User.is_superuser.is_(False))) or 0
    total_domains = await db.scalar(select(func.count(Domain.id))) or 0
    verified_customers = await db.scalar(
        select(func.count(User.id)).where(User.is_superuser.is_(False), User.is_verified.is_(True))
    ) or 0
    active_customers = await db.scalar(
        select(func.count(User.id)).where(User.is_superuser.is_(False), User.is_active.is_(True))
    ) or 0

    return AdminStatsOut(
        total_customers=total_customers,
        total_domains=total_domains,
        verified_customers=verified_customers,
        active_customers=active_customers,
    )


@router.get("/users", response_model=list[AdminUserListItem])
async def list_admin_users(
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_session),
):
    # Query all users with domain counts
    users_stmt = select(User).order_by(User.created_at.desc())
    users_result = await db.scalars(users_stmt)
    users = users_result.all()

    # Get domain counts per user
    counts_stmt = select(Domain.user_id, func.count(Domain.id)).group_by(Domain.user_id)
    counts_result = await db.execute(counts_stmt)
    domain_counts = dict(counts_result.all())

    items = []
    for u in users:
        items.append(
            AdminUserListItem(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                plan=u.plan,
                role=u.role,
                is_superuser=u.is_superuser,
                is_verified=u.is_verified,
                is_active=u.is_active,
                domain_count=domain_counts.get(u.id, 0),
                created_at=u.created_at,
                last_login_at=u.last_login_at,
            )
        )
    return items


@router.get("/users/{user_id}/domains", response_model=list[DomainOut])
async def get_customer_domains(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_session),
):
    target = await db.get(User, user_id)
    if not target:
        raise NotFound("Customer not found")
    domains_stmt = select(Domain).where(Domain.user_id == user_id).order_by(Domain.created_at.desc())
    domains = (await db.scalars(domains_stmt)).all()
    return domains


@router.post("/impersonate/{user_id}", response_model=TokenResponse)
async def impersonate_customer(
    user_id: uuid.UUID,
    response: Response,
    admin: User = Depends(get_current_superadmin),
    auth: AuthService = Depends(get_auth_service),
    ctx: ClientContext = Depends(get_client_context),
    settings: Settings = Depends(get_settings),
):
    session = await auth.impersonate(admin, user_id, ctx)
    response.set_cookie(
        COOKIE,
        session.refresh_token,
        max_age=settings.refresh_token_days * 86400,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path=COOKIE_PATH,
    )
    return TokenResponse(
        access_token=session.access_token,
        expires_in=session.expires_in,
        user=session.user,
    )
