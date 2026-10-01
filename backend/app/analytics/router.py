from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.analytics.service import (
    attendance_percentage,
    attendance_report,
    early_warnings,
    institution_analytics,
    offering_summary,
    risk_queue,
    risk_statistics,
    student_overview,
    weekly_trend,
)
from app.core.dependencies import require_roles
from app.db import get_db
from app.attendance.service import edit_attendance_record, _faculty_owns_offering
from app.models.analytics import Flag
from app.models.attendance import AttendanceSession
from app.models.user import User
from app.schemas.analytics import (
    AttendancePercentage,
    AttendanceReport,
    EarlyWarning,
    InstitutionAnalytics,
    OfferingSummary,
    RiskQueueItem,
    RiskStatistics,
    RiskDecision,
    StudentOverview,
    WeeklyTrendPoint,
)


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/students/{student_id}/attendance", response_model=list[AttendancePercentage])
def student_attendance(
    student_id: int,
    offering_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("STUDENT", "FACULTY", "ADMIN")),
) -> list[AttendancePercentage]:
    if user.role == "STUDENT" and user.id != student_id:
        raise HTTPException(status_code=403, detail="Student analytics access denied")
    return [attendance_percentage(db, student_id, offering_id)]


@router.get("/offerings/{offering_id}/summary", response_model=OfferingSummary)
def faculty_offering_summary(
    offering_id: int,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY", "ADMIN")),
) -> OfferingSummary:
    if faculty.role == "FACULTY":
        from app.models.academic import Offering

        offering = db.get(Offering, offering_id)
        if offering is None or offering.faculty_id != faculty.id:
            raise HTTPException(status_code=403, detail="Offering access denied")
    return offering_summary(db, offering_id)


@router.get("/offerings/{offering_id}/trend", response_model=list[WeeklyTrendPoint])
def faculty_offering_trend(
    offering_id: int,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY", "ADMIN")),
) -> list[WeeklyTrendPoint]:
    if faculty.role == "FACULTY":
        from app.models.academic import Offering

        offering = db.get(Offering, offering_id)
        if offering is None or offering.faculty_id != faculty.id:
            raise HTTPException(status_code=403, detail="Offering access denied")
    return weekly_trend(db, offering_id=offering_id)


@router.get("/students/{student_id}/trend", response_model=list[WeeklyTrendPoint])
def student_trend(
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("STUDENT", "FACULTY", "ADMIN")),
) -> list[WeeklyTrendPoint]:
    if user.role == "STUDENT" and user.id != student_id:
        raise HTTPException(status_code=403, detail="Student analytics access denied")
    return weekly_trend(db, student_id=student_id)


@router.get("/students/{student_id}/overview", response_model=StudentOverview)
def student_attendance_overview(
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("STUDENT", "FACULTY", "ADMIN")),
) -> StudentOverview:
    if user.role == "STUDENT" and user.id != student_id:
        raise HTTPException(status_code=403, detail="Student analytics access denied")
    return student_overview(db, student_id)


@router.get("/risk/queue", response_model=list[RiskQueueItem])
def get_risk_queue(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("FACULTY", "ADMIN")),
) -> list[RiskQueueItem]:
    return risk_queue(db, status)


@router.post("/risk/{flag_id}/decision", response_model=RiskQueueItem)
def decide_risk_flag(
    flag_id: int,
    payload: RiskDecision,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> RiskQueueItem:
    if payload.action not in {"OK", "DISMISS", "CONFIRM_ABSENT"}:
        raise HTTPException(status_code=422, detail="Unsupported flag decision")
    if len(payload.note.strip()) < 5:
        raise HTTPException(status_code=422, detail="A note of at least 5 characters is required")
    flag = db.get(Flag, flag_id)
    if flag is None:
        raise HTTPException(status_code=404, detail="Flag does not exist")
    session = db.get(AttendanceSession, flag.session_id) if flag.session_id else None
    if session is None or flag.student_id is None:
        raise HTTPException(status_code=409, detail="Flag is not attached to an attendance record")
    try:
        _faculty_owns_offering(db, faculty, session.offering_id)
        if payload.action == "CONFIRM_ABSENT":
            edit_attendance_record(
                db,
                faculty,
                session.id,
                flag.student_id,
                "ABSENT",
                payload.note.strip(),
            )
        flag.status = "RESOLVED" if payload.action == "OK" else "FALSE_POSITIVE" if payload.action == "DISMISS" else "CONFIRMED"
        flag.note = payload.note.strip()
        flag.resolved_by = faculty.id
        from datetime import datetime, timezone
        flag.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(flag)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return RiskQueueItem(
        id=flag.id,
        session_id=flag.session_id,
        student_id=flag.student_id,
        kind=flag.kind,
        score=flag.score,
        level=flag.level,
        status=flag.status,
        reasons=flag.reasons,
    )


@router.get("/risk/statistics", response_model=RiskStatistics)
def get_risk_statistics(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("FACULTY", "ADMIN")),
) -> RiskStatistics:
    return risk_statistics(db)


@router.get("/early-warnings", response_model=list[EarlyWarning])
def get_early_warnings(
    threshold: float = Query(default=75, ge=0, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("FACULTY", "ADMIN")),
) -> list[EarlyWarning]:
    return early_warnings(db, threshold)


@router.get("/institution", response_model=InstitutionAnalytics)
def get_institution_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
) -> InstitutionAnalytics:
    return institution_analytics(db)


@router.get("/reports/attendance", response_model=AttendanceReport)
def get_attendance_report(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("FACULTY", "ADMIN")),
) -> AttendanceReport:
    if from_date and to_date and from_date > to_date:
        raise HTTPException(status_code=422, detail="from_date must not exceed to_date")
    return AttendanceReport(
        generated_for="attendance",
        from_date=from_date,
        to_date=to_date,
        rows=attendance_report(db, from_date, to_date),
    )
