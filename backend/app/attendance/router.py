from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.attendance.service import (
    _faculty_owns_offering,
    close_session,
    create_session,
    create_dispute,
    decide_dispute,
    edit_attendance_record,
    list_roster,
    qr_token,
    start_session,
    transition_session,
)
from app.attendance.submission import SubmissionRejected, submit_attendance
from app.core.dependencies import require_roles
from app.db import get_db
from app.models.user import User
from app.models.attendance import AttendanceSession
from app.schemas.attendance import (
    AttendanceSessionCreate,
    AttendanceSessionResponse,
    AttendanceSubmissionCreate,
    AttendanceSubmissionResponse,
    AttendanceFlagResponse,
    AttendanceRecordResponse,
    AttendanceRecordUpdate,
    DisputeCreate,
    DisputeDecision,
    DisputeResponse,
    RosterStudentResponse,
    QrTokenResponse,
)


router = APIRouter(prefix="/attendance", tags=["attendance"])


def _response(session) -> AttendanceSessionResponse:
    return AttendanceSessionResponse(
        id=session.id,
        status=session.status,
        opened_at=session.opened_at,
        close_at=session.close_at,
        scheduled_start=session.scheduled_start,
        scheduled_end=session.scheduled_end,
    )


@router.post("/sessions", response_model=AttendanceSessionResponse)
def create_attendance_session(
    payload: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> AttendanceSessionResponse:
    try:
        session = create_session(
            db,
            faculty,
            slot_id=payload.slot_id,
            offering_id=payload.offering_id,
            session_date=payload.session_date,
            scheduled_start=payload.scheduled_start,
            scheduled_end=payload.scheduled_end,
            window_seconds=payload.window_seconds,
            rotation_seconds=payload.rotation_seconds,
            topic=payload.topic,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _response(session)


@router.post("/sessions/{session_id}/start", response_model=AttendanceSessionResponse)
def open_attendance_session(
    session_id: int,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> AttendanceSessionResponse:
    try:
        session = start_session(db, faculty, session_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _response(session)


@router.post("/sessions/{session_id}/{target}", response_model=AttendanceSessionResponse)
def change_session_state(
    session_id: int,
    target: str,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> AttendanceSessionResponse:
    try:
        normalized_target = target.upper()
        if normalized_target == "CLOSED":
            session = close_session(db, faculty, session_id)
        else:
            session = transition_session(db, faculty, session_id, normalized_target)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _response(session)


@router.get("/sessions/{session_id}/qr", response_model=QrTokenResponse)
def current_qr_token(
    session_id: int,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> QrTokenResponse:
    try:
        session = db.get(AttendanceSession, session_id)
        if session is None:
            raise LookupError("Attendance session does not exist")
        _faculty_owns_offering(db, faculty, session.offering_id)
        step, token, expires_at = qr_token(session)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return QrTokenResponse(
        session_id=session_id,
        step=step,
        token=token,
        expires_at=expires_at,
    )


@router.post(
    "/submissions",
    response_model=AttendanceSubmissionResponse,
)
def create_attendance_submission(
    payload: AttendanceSubmissionCreate,
    request: Request,
    db: Session = Depends(get_db),
    student: User = Depends(require_roles("STUDENT")),
) -> AttendanceSubmissionResponse:
    try:
        item = submit_attendance(
            db,
            student,
            session_id=payload.session_id,
            android_id=payload.android_id,
            qr_token=payload.qr_token,
            client_nonce=payload.client_nonce,
            signature=payload.signature,
            app_version=payload.app_version,
            latency_ms=payload.latency_ms,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except SubmissionRejected as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AttendanceSubmissionResponse(
        accepted=True,
        submission_id=item.id,
        token_step=item.token_step,
        used_grace_step=item.used_grace_step,
    )


@router.get(
    "/sessions/{session_id}/roster",
    response_model=list[RosterStudentResponse],
)
def attendance_roster(
    session_id: int,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> list[RosterStudentResponse]:
    try:
        rows = list_roster(db, faculty, session_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return [
        RosterStudentResponse(
            student_id=row["student_id"],
            roll_no=row["roll_no"],
            prn=row["prn"],
            name=row["name"],
            status=row["status"],
            source=row["source"],
            flags=[
                AttendanceFlagResponse(
                    id=flag.id,
                    kind=flag.kind,
                    score=flag.score,
                    level=flag.level,
                    status=flag.status,
                    reasons=flag.reasons,
                )
                for flag in row["flags"]
            ],
        )
        for row in rows
    ]


@router.patch(
    "/sessions/{session_id}/records/{student_id}",
    response_model=AttendanceRecordResponse,
)
def manual_attendance_edit(
    session_id: int,
    student_id: int,
    payload: AttendanceRecordUpdate,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> AttendanceRecordResponse:
    try:
        record = edit_attendance_record(
            db,
            faculty,
            session_id,
            student_id,
            payload.status,
            payload.reason,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return AttendanceRecordResponse(
        id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        status=record.status,
        source=record.source,
        reason=record.reason,
    )


@router.post(
    "/records/{record_id}/disputes",
    response_model=DisputeResponse,
)
def open_dispute(
    record_id: int,
    payload: DisputeCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_roles("STUDENT")),
) -> DisputeResponse:
    try:
        dispute = create_dispute(db, student, record_id, payload.message)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return DisputeResponse(
        id=dispute.id,
        record_id=dispute.record_id,
        student_id=dispute.student_id,
        status=dispute.status,
        message=dispute.message,
        response=dispute.response,
    )


@router.post(
    "/disputes/{dispute_id}/decision",
    response_model=DisputeResponse,
)
def resolve_dispute(
    dispute_id: int,
    payload: DisputeDecision,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> DisputeResponse:
    try:
        dispute = decide_dispute(
            db,
            faculty,
            dispute_id,
            payload.status,
            payload.response,
            payload.new_status,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return DisputeResponse(
        id=dispute.id,
        record_id=dispute.record_id,
        student_id=dispute.student_id,
        status=dispute.status,
        message=dispute.message,
        response=dispute.response,
    )
