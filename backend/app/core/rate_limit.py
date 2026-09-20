import time

from fastapi import HTTPException, Request, status
from redis.exceptions import RedisError

from app.config import settings
from app.core.redis import get_redis


def enforce_rate_limit(request: Request, bucket: str) -> None:
    client = request.client.host if request.client else "unknown"
    key = f"rate:{bucket}:{client}"
    redis = get_redis()
    try:
        current = redis.incr(key)
        if current == 1:
            redis.expire(key, settings.rate_limit_window_seconds)
        if current > settings.rate_limit_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
            )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Rate limiting service is unavailable",
        ) from exc
    finally:
        redis.close()
