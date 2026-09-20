import base64
import hashlib
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, padding, rsa
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.redis import get_redis
from app.models.analytics import Flag
from app.models.device import DeviceBinding, DeviceRequest, RegistrationWindow
from app.models.user import Student, User


logger = logging.getLogger("security.device")
VALID_REQUEST_TYPES = {"NEW_PHONE", "BIOMETRIC_RESET", "REINSTALL_REVIEW"}
VALID_REQUEST_STATUSES = {"PENDING", "APPROVED", "REJECTED"}
VALID_DEVICE_STATUSES = {"ACTIVE", "PENDING", "INVALIDATED", "REVOKED"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _challenge_key(user_id: int, challenge: str) -> str:
    return f"device:registration:{user_id}:{challenge}"


def _android_fingerprint(android_id: str) -> str:
    return hashlib.sha256(android_id.encode()).hexdigest()[:16]


def _write_ownership_flag(db: Session, user: User, android_id: str) -> None:
    logger.warning(
        "device security event",
        extra={
            "event": "DEVICE_OWNED_BY_OTHER",
            "actor_user_id": user.id,
            "android_id_fingerprint": _android_fingerprint(android_id),
        },
    )
    if db.get(Student, user.id) is not None:
        db.add(
            Flag(
                student_id=user.id,
                kind="STUDENT",
                score=60,
                level="HIGH",
                reasons={
                    "rule": "DEVICE_OWNED_BY_OTHER",
                    "android_id_fingerprint": _android_fingerprint(android_id),
                },
                status="OPEN",
            )
        )
        db.flush()


def open_registration_window(
    db: Session,
    opened_by: User,
    target_user_id: int,
    duration_minutes: int,
) -> RegistrationWindow:
    if opened_by.status != "ACTIVE" or opened_by.role != "ADMIN":
        raise PermissionError("Only an active administrator can open registration windows")
    if db.get(User, target_user_id) is None:
        raise LookupError("Registration target user does not exist")
    now = _now()
    window = RegistrationWindow(
        user_id=target_user_id,
        opened_by=opened_by.id,
        opened_at=now,
        expires_at=now + timedelta(minutes=duration_minutes),
    )
    db.add(window)
    db.commit()
    db.refresh(window)
    return window


def create_challenge(
    db: Session,
    user: User,
    android_id: str,
) -> tuple[str, datetime]:
    now = _now()
    window = db.scalar(
        select(RegistrationWindow)
        .where(
            RegistrationWindow.user_id == user.id,
            RegistrationWindow.used_at.is_(None),
            RegistrationWindow.expires_at > now,
        )
        .order_by(RegistrationWindow.expires_at.desc())
    )
    if window is None:
        raise PermissionError("Registration window is expired or unavailable")
    authorizer = db.get(User, window.opened_by)
    if authorizer is None or authorizer.status != "ACTIVE" or authorizer.role != "ADMIN":
        raise PermissionError("Registration window authorization is no longer valid")

    challenge = secrets.token_urlsafe(32)
    expires_at = min(window.expires_at, now + timedelta(minutes=settings.registration_window_minutes))
    redis_client = get_redis()
    try:
        redis_client.setex(
            _challenge_key(user.id, challenge),
            max(int((expires_at - now).total_seconds()), 1),
            json.dumps({"window_id": window.id, "android_id": android_id}),
        )
    finally:
        redis_client.close()
    return challenge, expires_at


def _verify_signature(
    public_key: str,
    signature: str,
    message: bytes,
    key_algorithm: str,
) -> None:
    try:
        key = serialization.load_pem_public_key(public_key.encode())
        signature_bytes = base64.b64decode(signature, validate=True)
        algorithm = key_algorithm.upper().replace("-", "")
        if algorithm in {"ED25519", "EDDSA"} and isinstance(key, ed25519.Ed25519PublicKey):
            key.verify(signature_bytes, message)
        elif algorithm == "RSA" and isinstance(key, rsa.RSAPublicKey):
            key.verify(signature_bytes, message, padding.PKCS1v15(), hashes.SHA256())
        elif algorithm in {"ECDSA", "EC"} and isinstance(key, ec.EllipticCurvePublicKey):
            key.verify(signature_bytes, message, ec.ECDSA(hashes.SHA256()))
        else:
            raise InvalidSignature
    except (ValueError, TypeError, InvalidSignature) as exc:
        raise PermissionError("Invalid registration signature") from exc


def register_device(
    db: Session,
    user: User,
    android_id: str,
    challenge: str,
    public_key: str,
    signature: str,
    key_algorithm: str,
    device_model: str | None,
    app_version: str | None,
) -> DeviceBinding:
    redis_client = get_redis()
    try:
        raw = redis_client.get(_challenge_key(user.id, challenge))
        if raw is None:
            raise PermissionError("Registration challenge is expired or already used")
        state = json.loads(raw)
        if state["android_id"] != android_id:
            raise PermissionError("Registration challenge does not match android_id")
    finally:
        redis_client.close()

    other_owner = db.scalar(
        select(DeviceBinding).where(
            DeviceBinding.android_id == android_id,
            DeviceBinding.status == "ACTIVE",
            DeviceBinding.user_id != user.id,
        )
    )
    if other_owner is not None:
        _write_ownership_flag(db, user, android_id)
        db.commit()
        raise PermissionError("DEVICE_OWNED_BY_OTHER")

    _verify_signature(
        public_key,
        signature,
        f"{android_id}:{challenge}".encode(),
        key_algorithm,
    )
    now = _now()
    window = db.scalar(
        select(RegistrationWindow)
        .where(RegistrationWindow.id == state["window_id"])
        .with_for_update()
    )
    if window is None or window.used_at is not None or window.expires_at <= now:
        raise PermissionError("Registration window is expired or already used")
    active_binding = db.scalar(
        select(DeviceBinding).where(
            DeviceBinding.user_id == user.id,
            DeviceBinding.status == "ACTIVE",
        )
    )
    if active_binding is not None:
        raise PermissionError("User already has an active device")
    if db.scalar(
        select(DeviceBinding).where(
            DeviceBinding.public_key == public_key,
            DeviceBinding.status == "ACTIVE",
        )
    ) is not None:
        raise PermissionError("Public key already has an active binding")

    previous_binding = db.scalar(
        select(DeviceBinding)
        .where(
            DeviceBinding.user_id == user.id,
            DeviceBinding.status.in_(("REVOKED", "INVALIDATED")),
        )
        .order_by(DeviceBinding.registered_at.desc().nullslast())
    )
    approved_request = db.scalar(
        select(DeviceRequest)
        .where(
            DeviceRequest.user_id == user.id,
            DeviceRequest.type.in_(("NEW_PHONE", "REINSTALL_REVIEW")),
            DeviceRequest.status == "APPROVED",
            DeviceRequest.new_android_id == android_id,
        )
        .order_by(DeviceRequest.decided_at.desc().nullslast())
    )
    replacement = previous_binding is not None
    if (
        approved_request is not None
        and previous_binding is not None
        and previous_binding.revoked_at is not None
        and approved_request.decided_at <= previous_binding.revoked_at
    ):
        approved_request = None
    if replacement and approved_request is None:
        binding_status = "PENDING"
        reinstall_count = previous_binding.reinstall_count or 0
    else:
        binding_status = "ACTIVE"
        reinstall_count = (previous_binding.reinstall_count or 0) + 1 if replacement else 0

    binding = DeviceBinding(
        user_id=user.id,
        android_id=android_id,
        public_key=public_key,
        key_algorithm=key_algorithm,
        key_fingerprint=hashlib.sha256(public_key.encode()).hexdigest(),
        device_model=device_model,
        app_version=app_version,
        status=binding_status,
        attestation_verified=False,
        reinstall_count=reinstall_count,
        registered_at=now,
        created_at=now,
        updated_at=now,
    )
    window.used_at = now
    if approved_request is not None:
        approved_request.updated_at = now
    db.add(binding)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise PermissionError("Active device uniqueness constraint rejected registration") from exc
    redis_client = get_redis()
    try:
        redis_client.delete(_challenge_key(user.id, challenge))
    finally:
        redis_client.close()
    db.refresh(binding)
    return binding


def get_active_binding(
    db: Session,
    user_id: int,
    android_id: str,
) -> DeviceBinding:
    binding = db.scalar(
        select(DeviceBinding).where(
            DeviceBinding.user_id == user_id,
            DeviceBinding.android_id == android_id,
            DeviceBinding.status == "ACTIVE",
        )
    )
    if binding is None:
        raise PermissionError("DEVICE_BINDING_REQUIRED")
    return binding


def update_device_status(
    db: Session,
    device_id: int,
    actor: User,
    status: str,
    reason: str,
) -> DeviceBinding:
    if actor.status != "ACTIVE" or actor.role != "ADMIN":
        raise PermissionError("Only an active administrator can change device state")
    if status not in {"REVOKED", "INVALIDATED"}:
        raise ValueError("Unsupported device state transition")
    binding = db.get(DeviceBinding, device_id)
    if binding is None:
        raise LookupError("Device binding does not exist")
    if binding.status not in {"ACTIVE", "PENDING"}:
        raise ValueError("Device binding is already terminal")
    now = _now()
    binding.status = status
    binding.revoke_reason = reason
    binding.revoked_at = now
    binding.updated_at = now
    db.commit()
    db.refresh(binding)
    return binding


def create_device_request(
    db: Session,
    user: User,
    request_type: str,
    reason: str | None,
    new_android_id: str | None,
) -> DeviceRequest:
    if request_type not in VALID_REQUEST_TYPES:
        raise ValueError("Unsupported device request type")
    now = _now()
    item = DeviceRequest(
        user_id=user.id,
        type=request_type,
        reason=reason,
        new_android_id=new_android_id,
        status="PENDING",
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def decide_device_request(
    db: Session,
    request_id: int,
    decided_by: User,
    decision: str,
    note: str | None,
) -> DeviceRequest:
    if decision not in VALID_REQUEST_STATUSES - {"PENDING"}:
        raise ValueError("Device request decision must be APPROVED or REJECTED")
    item = db.get(DeviceRequest, request_id)
    if item is None:
        raise LookupError("Device request does not exist")
    if item.status != "PENDING":
        raise ValueError("Device request has already been decided")
    item.status = decision
    item.decided_by = decided_by.id
    item.decided_at = _now()
    item.note = note
    item.updated_at = item.decided_at
    if decision == "APPROVED" and item.type in {"NEW_PHONE", "REINSTALL_REVIEW"}:
        pending = db.scalar(
            select(DeviceBinding).where(
                DeviceBinding.user_id == item.user_id,
                DeviceBinding.status == "PENDING",
                DeviceBinding.android_id == item.new_android_id,
            )
        )
        if pending is not None:
            previous = db.scalar(
                select(DeviceBinding)
                .where(
                    DeviceBinding.user_id == item.user_id,
                    DeviceBinding.id != pending.id,
                    DeviceBinding.status.in_(("REVOKED", "INVALIDATED")),
                )
                .order_by(DeviceBinding.registered_at.desc().nullslast())
            )
            now = item.decided_at
            pending.status = "ACTIVE"
            pending.reinstall_count = (previous.reinstall_count or 0) + 1 if previous else 0
            pending.registered_at = now
            pending.updated_at = now
    db.commit()
    db.refresh(item)
    return item
