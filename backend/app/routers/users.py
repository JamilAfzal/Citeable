from fastapi import APIRouter, Depends

from app.deps import get_current_user, get_user_service
from app.models import User
from app.schemas.user import UserOut, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(body: UserUpdate, user: User = Depends(get_current_user), users: UserService = Depends(get_user_service)):
    return await users.update_profile(user, body.full_name)
