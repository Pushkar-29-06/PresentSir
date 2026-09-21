from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import MeResponse, MeUser


router = APIRouter(tags=["auth"])


@router.get("/me", response_model=MeResponse)
def current_user_profile(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        user=MeUser(
            id=user.id,
            login_id=user.login_id,
            name=user.name,
            email=user.email,
            phone=user.phone,
            department_id=user.department_id,
            status=user.status,
        ),
        role=user.role,
    )
