from redis import Redis
from redis.exceptions import RedisError

from app.config import settings


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def revoke_token(jti: str, expires_at: int) -> None:
    redis = get_redis()
    try:
        ttl = max(expires_at - int(__import__("time").time()), 1)
        redis.setex(f"auth:revoked:{jti}", ttl, "1")
    except RedisError as exc:
        raise RuntimeError("Redis is unavailable for token revocation") from exc
    finally:
        redis.close()


def is_token_revoked(jti: str) -> bool:
    redis = get_redis()
    try:
        return bool(redis.exists(f"auth:revoked:{jti}"))
    except RedisError as exc:
        raise RuntimeError("Redis is unavailable for token validation") from exc
    finally:
        redis.close()
