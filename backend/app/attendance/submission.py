import base64
import hashlib
import json
from datetime import datetime, timezone

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, padding, rsa
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.attendance.service import verify_qr_token
from app.core.redis import get_redis
from app.device.service import get_active_binding
from app.models.academic import Enrollment
from app.models.attendance import AttendanceSession, AttendanceSubmission
from app.models.device import DeviceBinding
from app.models.user import User


class SubmissionRejected(PermissionError):
    pass


def submission_proof(
    session_id: int,
    token_step: int,
    android_id: str,
    client_nonce: str,
    qr_token: str,
) -> bytes:
    payload = {
        "android_id": android_id,
        "client_nonce": client_nonce,
        "qr_token": qr_token,
        "session_id": session_id,
        "token_step": token_step,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()


def _verify_submission_signature(
    binding: DeviceBinding,
    signature: str,
    message: bytes,
) -> None:
    try:
        key = serialization.load_pem_public_key(binding.public_key.encode())
        signature_bytes = base64.b64decode(signature, validate=True)
        algorithm = (binding.key_algorithm or "").upper().replace("-", "")
        if algorithm in {"ED25519", "EDDSA"} and isinstance(key, ed25519.Ed25519PublicKey):
            key.verify(signature_bytes, message)
        elif algorithm == "RSA" and isinstance(key, rsa.RSAPublicKey):
            key.verify(signature_bytes, message, padding.PKCS1v15(), hashes.SHA256())
        elif algorithm in {"ECDSA", "EC"} and isinstance(key, ec.EllipticCurvePublicKey):
            key.verify(signature_bytes, message, ec.ECDSA(hashes.SHA256()))
        else:
            raise InvalidSignature
    except (ValueError, TypeError, AttributeError, InvalidSignature) as exc:
        raise SubmissionRejected("Invalid submission signature") from exc


def _reserve_nonce(session_id: int, student_id: int, nonce: str, ttl: int) -> tuple[object, str]:
    redis = get_redis()
    key = f"attendance:nonce:{session_id}:{student_id}:{hashlib.sha256(nonce.encode()).hexdigest()}"
    try:
        reserved = redis.set(key, "1", nx=True, ex=max(ttl, 1))
        if not reserved:
            raise SubmissionRejected("Replay detected: client_nonce was already used")
        return redis, key
    except Exception:
        redis.close()
        raise


def submit_attendance(
    db: Session,
    student: User,
    *,
    session_id: int,
    android_id: str,
    qr_token: str,
    client_nonce: str,
    signature: str,
    app_version: str | None,
    latency_ms: int | None,
    ip: str | None,
    user_agent: str | None,
    now: datetime | None = None,
) -> AttendanceSubmission:
    if student.status != "ACTIVE" or student.role != "STUDENT":
        raise SubmissionRejected("Student authentication required")

    current = now or datetime.now(timezone.utc)

    # 1-2. Authentication is supplied by the dependency; require an active binding.
    try:
        binding = get_active_binding(db, student.id, android_id)
    except PermissionError as exc:
        raise SubmissionRejected(str(exc)) from exc

    # 3-4. Resolve the session and require it to be open before accepting a scan.
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise SubmissionRejected("Attendance session does not exist")
    if session.status != "OPEN":
        raise SubmissionRejected("Attendance session is not open")

    # 5. A student may submit only for an enrolled offering.
    enrolled = db.scalar(
        select(Enrollment).where(
            Enrollment.offering_id == session.offering_id,
            Enrollment.student_id == student.id,
        )
    )
    if enrolled is None:
        raise SubmissionRejected("Student is not enrolled in this offering")

    # 6. QR verification returns the accepted step and grace-step marker.
    try:
        token_step, used_grace_step = verify_qr_token(session, qr_token, current)
    except PermissionError as exc:
        raise SubmissionRejected(str(exc)) from exc

    # 7. Verify proof of possession against the active binding's public key.
    _verify_submission_signature(
        binding,
        signature,
        submission_proof(
            session_id,
            token_step,
            android_id,
            client_nonce,
            qr_token,
        ),
    )

    # 8. Reserve nonce atomically before writing the immutable event.
    close_at = session.close_at
    ttl = int((close_at - current).total_seconds()) if close_at else 300
    redis, _ = _reserve_nonce(session_id, student.id, client_nonce, ttl)

    # 9. Persist only the raw submission; official attendance records are separate.
    submitted_at = current
    item = AttendanceSubmission(
        session_id=session_id,
        student_id=student.id,
        binding_id=binding.id,
        token_step=token_step,
        submitted_at=submitted_at,
        latency_ms=latency_ms,
        used_grace_step=used_grace_step,
        ip=ip,
        user_agent=user_agent,
        app_version=app_version,
        client_nonce=client_nonce,
        signature=signature,
        risk_score=0,
        risk_reasons={},
        created_at=submitted_at,
        updated_at=submitted_at,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise SubmissionRejected("Duplicate student submission") from exc
    finally:
        redis.close()
    db.refresh(item)
    return item
