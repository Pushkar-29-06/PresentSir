import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from jwt import InvalidTokenError
from sqlalchemy import select
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
from app.core.security import decode_token
from app.db import SessionLocal, get_db
from app.models.user import User
from app.models.attendance import AttendanceSession
from app.models.academic import Course, Enrollment, Offering
from app.models.analytics import AttendanceDispute
from app.models.attendance import AttendanceRecord
from app.models.attendance import AttendanceSubmission
from app.realtime import session_events
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
    AttendanceCountResponse,
    StudentAttendanceHistoryItem,
    FacultyDisputeResponse,
)


router = APIRouter(prefix="/attendance", tags=["attendance"])
realtime_router = APIRouter(tags=["realtime"])
_last_qr_steps: dict[int, int] = {}


@realtime_router.websocket("/ws/sessions/{session_id}")
async def session_updates(websocket: WebSocket, session_id: int) -> None:
    token = websocket.query_params.get("access_token")
    db = SessionLocal()
    try:
        claims = decode_token(token or "", expected_type="access")
        faculty = db.get(User, int(claims["sub"]))
        session = db.get(AttendanceSession, session_id)
        if faculty is None or session is None or faculty.role != "FACULTY":
            raise InvalidTokenError("Unauthorized session socket")
        _faculty_owns_offering(db, faculty, session.offering_id)
    except (InvalidTokenError, PermissionError, ValueError):
        await websocket.close(code=1008)
        db.close()
        return
    db.close()
    await session_events.connect(session_id, websocket)
    rotation_task = asyncio.create_task(_broadcast_qr_rotation(session_id))
    try:
        while True:
            await websocket.receive()
    except WebSocketDisconnect:
        session_events.disconnect(session_id, websocket)
    finally:
        rotation_task.cancel()


async def _broadcast_qr_rotation(session_id: int) -> None:
    while True:
        db = SessionLocal()
        try:
            session = db.get(AttendanceSession, session_id)
            if session is None or session.status != "OPEN":
                await asyncio.sleep(2)
                continue
            step, token, expires_at = qr_token(session)
            if _last_qr_steps.get(session_id) != step:
                _last_qr_steps[session_id] = step
                session_events.publish(
                    session_id,
                    {
                        "type": "qr.rotated",
                        "session_id": session_id,
                        "step": step,
                        "token": token,
                        "expires_at": expires_at.isoformat(),
                    },
                )
            delay = max(1, int(session.rotation_seconds or 30))
        finally:
            db.close()
        await asyncio.sleep(delay)


def _count(db: Session, session_id: int, offering_id: int) -> AttendanceCountResponse:
    return AttendanceCountResponse(
        session_id=session_id,
        accepted=db.query(AttendanceSubmission).filter(
            AttendanceSubmission.session_id == session_id,
        ).count(),
        enrolled=db.query(Enrollment).filter(
            Enrollment.offering_id == offering_id,
        ).count(),
    )


def _response(session) -> AttendanceSessionResponse:
    return AttendanceSessionResponse(
        id=session.id,
        status=session.status,
        opened_at=session.opened_at,
        close_at=session.close_at,
        scheduled_start=session.scheduled_start,
        scheduled_end=session.scheduled_end,
    )


@router.get("/sessions", response_model=list[AttendanceSessionResponse])
def list_attendance_sessions(
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> list[AttendanceSessionResponse]:
    rows = db.scalars(
        select(AttendanceSession)
        .where(AttendanceSession.created_by == faculty.id)
        .order_by(AttendanceSession.scheduled_start.desc())
    ).all()
    return [_response(session) for session in rows]


@router.get("/sessions/{session_id}", response_model=AttendanceSessionResponse)
def get_attendance_session(
    session_id: int,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> AttendanceSessionResponse:
    try:
        session = db.get(AttendanceSession, session_id)
        if session is None:
            raise LookupError("Attendance session does not exist")
        _faculty_owns_offering(db, faculty, session.offering_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return _response(session)


@router.get("/sessions/{session_id}/count", response_model=AttendanceCountResponse)
def attendance_count(
    session_id: int,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> AttendanceCountResponse:
    try:
        session = db.get(AttendanceSession, session_id)
        if session is None:
            raise LookupError("Attendance session does not exist")
        _faculty_owns_offering(db, faculty, session.offering_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return _count(db, session.id, session.offering_id)


@router.get("/students/me/history", response_model=list[StudentAttendanceHistoryItem])
def student_attendance_history(
    db: Session = Depends(get_db),
    student: User = Depends(require_roles("STUDENT")),
) -> list[StudentAttendanceHistoryItem]:
    rows = db.execute(
        select(AttendanceRecord, AttendanceSession, Offering, Course)
        .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
        .join(Offering, Offering.id == AttendanceSession.offering_id)
        .join(Course, Course.id == Offering.course_id)
        .where(
            AttendanceRecord.student_id == student.id,
            AttendanceSession.status.in_(("CLOSED", "SAVED", "SUBMITTED")),
        )
        .order_by(AttendanceSession.session_date.desc(), AttendanceSession.scheduled_start.desc())
    ).all()
    return [
        StudentAttendanceHistoryItem(
            record_id=record.id,
            offering_id=offering.id,
            course_code=course.code,
            course_name=course.name,
            session_id=session.id,
            lecture_date=session.session_date,
            scheduled_start=session.scheduled_start,
            status=record.status,
            source=record.source,
        )
        for record, session, offering, course in rows
    ]


@router.get("/disputes", response_model=list[FacultyDisputeResponse])
def faculty_disputes(
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> list[FacultyDisputeResponse]:
    rows = db.execute(
        select(AttendanceDispute, User, Course, AttendanceSession)
        .join(AttendanceRecord, AttendanceRecord.id == AttendanceDispute.record_id)
        .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
        .join(Offering, Offering.id == AttendanceSession.offering_id)
        .join(Course, Course.id == Offering.course_id)
        .join(User, User.id == AttendanceDispute.student_id)
        .where(Offering.faculty_id == faculty.id)
        .order_by(AttendanceDispute.created_at.desc())
    ).all()
    return [
        FacultyDisputeResponse(
            id=dispute.id,
            record_id=dispute.record_id,
            student_id=dispute.student_id,
            status=dispute.status,
            message=dispute.message,
            response=dispute.response,
            student_name=user.name,
            course_code=course.code,
            lecture_date=session.session_date,
        )
        for dispute, user, course, session in rows
    ]


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
    session_events.publish(
        session_id,
        {"type": "session.state", "session_id": session_id, "status": session.status},
    )
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
    session_events.publish(
        session_id,
        {"type": "session.state", "session_id": session_id, "status": session.status},
    )
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
    if _last_qr_steps.get(session_id) != step:
        _last_qr_steps[session_id] = step
        session_events.publish(
            session_id,
            {
                "type": "qr.rotated",
                "session_id": session_id,
                "step": step,
                "token": token,
                "expires_at": expires_at.isoformat(),
            },
        )
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
    session = db.get(AttendanceSession, payload.session_id)
    if session is not None:
        count = _count(db, session.id, session.offering_id)
        session_events.publish(
            payload.session_id,
            {
                "type": "count.updated",
                "session_id": payload.session_id,
                "accepted": count.accepted,
                "enrolled": count.enrolled,
            },
        )
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
