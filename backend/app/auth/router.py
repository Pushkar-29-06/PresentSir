import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_token, get_current_user
from app.core.rate_limit import enforce_rate_limit
from app.core.redis import is_token_revoked, revoke_token
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.db import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from app.device.service import get_active_binding


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    enforce_rate_limit(request, "login")
    user = db.scalar(select(User).where(User.login_id == payload.login_id))
    if user is None or user.status != "ACTIVE" or not verify_password(
        payload.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login credentials",
        )
    if payload.android_id is not None:
        try:
            get_active_binding(db, user.id, payload.android_id)
        except PermissionError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            ) from exc

    access_token, _ = create_access_token(user.id)
    refresh_token, _ = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    payload: RefreshRequest,
    request: Request,
) -> TokenResponse:
    enforce_rate_limit(request, "refresh")
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
        if is_token_revoked(claims["jti"]):
            raise jwt.InvalidTokenError("Refresh token revoked")
        user_id = int(claims["sub"])
    except (ValueError, TypeError, jwt.InvalidTokenError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    revoke_token(claims["jti"], int(claims["exp"]))
    access_token, _ = create_access_token(user_id)
    refresh_token, _ = create_refresh_token(user_id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequest,
    access_claims: dict = Depends(get_current_token),
    current_user: User = Depends(get_current_user),
) -> None:
    del current_user
    try:
        revoke_token(access_claims["jti"], int(access_claims["exp"]))
        if payload.refresh_token is not None:
            claims = decode_token(payload.refresh_token, expected_type="refresh")
            revoke_token(claims["jti"], int(claims["exp"]))
    except (ValueError, TypeError, jwt.InvalidTokenError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refresh token",
        ) from exc
