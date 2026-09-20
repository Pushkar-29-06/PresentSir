from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.db import get_db
from app.models.user import User
from app.schemas.device import (
    DeviceRegistrationRequest,
    DeviceRegistrationResponse,
    DeviceStatusUpdate,
    DeviceRequestCreate,
    DeviceRequestDecision,
    DeviceRequestResponse,
    RegistrationChallengeRequest,
    RegistrationChallengeResponse,
    RegistrationWindowCreate,
    RegistrationWindowResponse,
)
from app.device.service import (
    create_challenge,
    create_device_request,
    open_registration_window,
    register_device,
    decide_device_request,
    update_device_status,
)


router = APIRouter(prefix="/device", tags=["device"])


@router.post("/registration-window", response_model=RegistrationWindowResponse)
def open_window(
    payload: RegistrationWindowCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
) -> RegistrationWindowResponse:
    try:
        window = open_registration_window(db, admin, payload.user_id, payload.duration_minutes)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return RegistrationWindowResponse(id=window.id, expires_at=window.expires_at)


@router.post("/register/challenge", response_model=RegistrationChallengeResponse)
def registration_challenge(
    payload: RegistrationChallengeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RegistrationChallengeResponse:
    try:
        challenge, expires_at = create_challenge(db, user, payload.android_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return RegistrationChallengeResponse(challenge=challenge, expires_at=expires_at)


@router.post("/register", response_model=DeviceRegistrationResponse)
def register(
    payload: DeviceRegistrationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DeviceRegistrationResponse:
    try:
        binding = register_device(
            db,
            user,
            payload.android_id,
            payload.challenge,
            payload.public_key,
            payload.signature,
            payload.key_algorithm,
            payload.device_model,
            payload.app_version,
        )
    except PermissionError as exc:
        if str(exc) == "DEVICE_OWNED_BY_OTHER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="DEVICE_OWNED_BY_OTHER",
            ) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DeviceRegistrationResponse(device_id=binding.id, status=binding.status)


@router.post(
    "/bindings/{device_id}/revoke",
    response_model=DeviceRegistrationResponse,
)
def revoke_binding(
    device_id: int,
    payload: DeviceStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
) -> DeviceRegistrationResponse:
    try:
        binding = update_device_status(db, device_id, admin, "REVOKED", payload.reason)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return DeviceRegistrationResponse(device_id=binding.id, status=binding.status)


@router.post(
    "/bindings/{device_id}/invalidate",
    response_model=DeviceRegistrationResponse,
)
def invalidate_binding(
    device_id: int,
    payload: DeviceStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
) -> DeviceRegistrationResponse:
    try:
        binding = update_device_status(db, device_id, admin, "INVALIDATED", payload.reason)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return DeviceRegistrationResponse(device_id=binding.id, status=binding.status)


@router.post("/requests", response_model=DeviceRequestResponse)
def request_device_action(
    payload: DeviceRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DeviceRequestResponse:
    try:
        item = create_device_request(
            db,
            user,
            payload.type,
            payload.reason,
            payload.new_android_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return DeviceRequestResponse(id=item.id, status=item.status)


@router.post(
    "/requests/{request_id}/decision",
    response_model=DeviceRequestResponse,
)
def decide_request(
    request_id: int,
    payload: DeviceRequestDecision,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
) -> DeviceRequestResponse:
    try:
        item = decide_device_request(
            db,
            request_id,
            admin,
            payload.status,
            payload.note,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return DeviceRequestResponse(id=item.id, status=item.status)
