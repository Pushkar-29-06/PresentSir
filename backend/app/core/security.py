from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.config import settings


password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def _create_token(
    subject: int,
    token_type: str,
    expires_delta: timedelta,
    claims: dict | None = None,
) -> tuple[str, str]:
    token_id = str(uuid4())
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "type": token_type,
        "jti": token_id,
        "iat": now,
        "exp": now + expires_delta,
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm), token_id


def create_access_token(subject: int, claims: dict | None = None) -> tuple[str, str]:
    return _create_token(
        subject,
        "access",
        timedelta(minutes=settings.access_token_minutes),
        claims,
    )


def create_refresh_token(subject: int, claims: dict | None = None) -> tuple[str, str]:
    return _create_token(
        subject,
        "refresh",
        timedelta(days=settings.refresh_token_days),
        claims,
    )


def decode_token(token: str, expected_type: str | None = None) -> dict:
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    if expected_type is not None and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Unexpected token type")
    if not payload.get("sub") or not payload.get("jti"):
        raise jwt.InvalidTokenError("Token is missing required claims")
    return payload
