import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    full_name: str
    plan: str
    role: str = "customer"
    is_superuser: bool = False
    is_verified: bool
    has_password: bool
    google_linked: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
