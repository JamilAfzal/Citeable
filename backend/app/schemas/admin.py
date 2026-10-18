import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserOut


class AdminStatsOut(BaseModel):
    total_customers: int
    total_domains: int
    verified_customers: int
    active_customers: int


class AdminUserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    full_name: str
    plan: str
    role: str
    is_superuser: bool
    is_verified: bool
    is_active: bool
    domain_count: int = 0
    created_at: datetime
    last_login_at: datetime | None = None


class ImpersonateResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut
