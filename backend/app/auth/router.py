import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from datetime import datetime, timezone
import hashlib

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
from app.models.refresh_token import RefreshToken
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from app.device.service import get_active_binding


router = APIRouter(prefix="/auth", tags=["auth"])


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _persist_refresh_token(db: Session, user: User, token: str, device_binding_id: int | None) -> None:
    claims = decode_token(token, expected_type="refresh")
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=_token_hash(token),
        device_binding_id=device_binding_id,
        expires_at=datetime.fromtimestamp(claims["exp"], timezone.utc),
    ))
    db.commit()


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
    binding = None
    if payload.android_id is not None:
        try:
            binding = get_active_binding(db, user.id, payload.android_id)
        except PermissionError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            ) from exc

    token_claims = {"role": user.role, "client": "api", "mode": "standard", "did": binding.id if binding else None}
    access_token, _ = create_access_token(user.id, token_claims)
    refresh_token, _ = create_refresh_token(user.id, token_claims)
    _persist_refresh_token(db, user, refresh_token, binding.id if binding else None)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    payload: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    enforce_rate_limit(request, "refresh")
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
        record = db.scalar(select(RefreshToken).where(
            RefreshToken.token_hash == _token_hash(payload.refresh_token),
            RefreshToken.revoked_at.is_(None),
        ))
        if record is None or record.expires_at <= datetime.now(timezone.utc):
            raise jwt.InvalidTokenError("Refresh token is not active")
        if is_token_revoked(claims["jti"]):
            raise jwt.InvalidTokenError("Refresh token revoked")
        user_id = int(claims["sub"])
    except (ValueError, TypeError, jwt.InvalidTokenError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    revoke_token(claims["jti"], int(claims["exp"]))
    record.revoked_at = datetime.now(timezone.utc)
    user = db.get(User, user_id)
    if user is None or user.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    token_claims = {
        "role": user.role,
        "client": claims.get("client", "api"),
        "mode": claims.get("mode", "standard"),
        "did": claims.get("did"),
    }
    access_token, _ = create_access_token(user_id, token_claims)
    refresh_token, _ = create_refresh_token(user_id, token_claims)
    _persist_refresh_token(db, user, refresh_token, record.device_binding_id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequest,
    access_claims: dict = Depends(get_current_token),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        revoke_token(access_claims["jti"], int(access_claims["exp"]))
        if payload.refresh_token is not None:
            claims = decode_token(payload.refresh_token, expected_type="refresh")
            revoke_token(claims["jti"], int(claims["exp"]))
            stored = db.scalar(select(RefreshToken).where(
                RefreshToken.token_hash == _token_hash(payload.refresh_token),
                RefreshToken.user_id == current_user.id,
            ))
            if stored is not None:
                stored.revoked_at = datetime.now(timezone.utc)
                db.commit()
    except (ValueError, TypeError, jwt.InvalidTokenError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refresh token",
        ) from exc
