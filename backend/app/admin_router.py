from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db import get_db
from app.models.attendance import AttendanceAuditLog
from app.models.device import DeviceBinding, DeviceRequest, RegistrationWindow
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: str
    login_id: str
    name: str
    department_id: int | None
    status: str
    registration_status: str
    device_id: int | None = None
    registration_window_id: int | None = None


class AdminRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None
    type: str | None
    reason: str | None
    new_android_id: str | None
    status: str | None
    created_at: datetime | None


class AuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int | None
    student_id: int | None
    record_id: int | None
    action: str | None
    old_status: str | None
    new_status: str | None
    reason: str | None
    actor_id: int | None
    actor_role: str | None
    at: datetime | None


class AdminDecision(BaseModel):
    status: str
    note: str | None = Field(default=None, max_length=500)


def _registration_status(db: Session, user_id: int) -> tuple[str, int | None, int | None]:
    binding = db.scalar(select(DeviceBinding).where(
        DeviceBinding.user_id == user_id,
        DeviceBinding.status == "ACTIVE",
    ))
    if binding is not None:
        return "Registered", binding.id, None
    now = datetime.now(timezone.utc)
    window = db.scalar(select(RegistrationWindow).where(
        RegistrationWindow.user_id == user_id,
        RegistrationWindow.used_at.is_(None),
        RegistrationWindow.expires_at > now,
    ))
    if window is not None:
        return "Window open", None, window.id
    reset = db.scalar(select(DeviceRequest).where(
        DeviceRequest.user_id == user_id,
        DeviceRequest.type == "BIOMETRIC_RESET",
        DeviceRequest.status == "PENDING",
    ))
    return ("Reset requested" if reset is not None else "Not registered"), None, None


@router.get("/users", response_model=list[AdminUserResponse])
def admin_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
) -> list[AdminUserResponse]:
    return [
        AdminUserResponse(
            id=user.id, role=user.role, login_id=user.login_id, name=user.name,
            department_id=user.department_id, status=user.status,
            registration_status=_registration_status(db, user.id)[0],
            device_id=_registration_status(db, user.id)[1],
            registration_window_id=_registration_status(db, user.id)[2],
        )
        for user in db.scalars(select(User).order_by(User.name))
    ]


@router.get("/requests", response_model=list[AdminRequestResponse])
def admin_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
) -> list[AdminRequestResponse]:
    return list(db.scalars(select(DeviceRequest).order_by(DeviceRequest.created_at.desc())))


@router.post("/requests/{request_id}/decision", response_model=AdminRequestResponse)
def admin_request_decision(
    request_id: int,
    payload: AdminDecision,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
) -> AdminRequestResponse:
    from app.device.service import decide_device_request
    try:
        item = decide_device_request(db, request_id, admin, payload.status, payload.note)
    except (LookupError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return item


@router.get("/audit", response_model=list[AuditResponse])
def admin_audit(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
) -> list[AuditResponse]:
    return list(db.scalars(select(AttendanceAuditLog).order_by(AttendanceAuditLog.at.desc()).limit(500)))
