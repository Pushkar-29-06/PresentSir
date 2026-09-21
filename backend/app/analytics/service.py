from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.academic import Enrollment, Offering
from app.models.assessments import Assessment, assessment_scores
from app.models.analytics import Flag
from app.models.attendance import AttendanceAuditLog, AttendanceRecord, AttendanceSession
from app.models.user import Student, User
from app.services.phase_g import effective_policy


def _closed_sessions(db: Session, offering_id: int | None = None):
    query = select(AttendanceSession).where(
        AttendanceSession.status.in_(("CLOSED", "SAVED", "SUBMITTED")),
    )
    if offering_id is not None:
        query = query.where(AttendanceSession.offering_id == offering_id)
    return list(db.scalars(query))


def attendance_percentage(
    db: Session,
    student_id: int,
    offering_id: int | None = None,
) -> dict:
    sessions = _closed_sessions(db, offering_id)
    if offering_id is None:
        sessions = [
            session
            for session in sessions
            if db.scalar(
                select(Enrollment).where(
                    Enrollment.offering_id == session.offering_id,
                    Enrollment.student_id == student_id,
                )
            )
        ]
    session_ids = [session.id for session in sessions]
    records = (
        list(
            db.scalars(
                select(AttendanceRecord).where(
                    AttendanceRecord.student_id == student_id,
                    AttendanceRecord.session_id.in_(session_ids),
                )
            )
        )
        if session_ids
        else []
    )
    counts = {status: sum(record.status == status for record in records) for status in ("PRESENT", "ABSENT", "EXCUSED")}
    held = len(sessions)
    threshold = 75
    if offering_id is not None:
        offering = db.get(Offering, offering_id)
        policy = effective_policy(db, offering) if offering is not None else None
        if policy is not None:
            threshold = policy.threshold_percent
    percentage = ((counts["PRESENT"] + counts["EXCUSED"]) / held * 100) if held else 0
    return {
        "student_id": student_id,
        "offering_id": offering_id,
        "sessions_held": held,
        "present": counts["PRESENT"],
        "absent": counts["ABSENT"],
        "excused": counts["EXCUSED"],
        "percentage": round(percentage, 2),
        "shortage": round(max(0, threshold - percentage), 2),
    }


def offering_summary(db: Session, offering_id: int) -> dict:
    sessions = _closed_sessions(db, offering_id)
    session_ids = [session.id for session in sessions]
    enrolled = db.scalar(
        select(func.count()).select_from(Enrollment).where(
            Enrollment.offering_id == offering_id,
        )
    ) or 0
    records = (
        list(db.scalars(select(AttendanceRecord).where(AttendanceRecord.session_id.in_(session_ids))))
        if session_ids
        else []
    )
    present = sum(record.status in {"PRESENT", "EXCUSED"} for record in records)
    return {
        "offering_id": offering_id,
        "sessions_held": len(sessions),
        "enrolled_students": enrolled,
        "total_records": len(records),
        "present_records": present,
        "absent_records": sum(record.status == "ABSENT" for record in records),
        "attendance_percentage": round(present / len(records) * 100, 2) if records else 0,
    }


def weekly_trend(
    db: Session,
    student_id: int | None = None,
    offering_id: int | None = None,
) -> list[dict]:
    rows = defaultdict(lambda: {"sessions": set(), "present": 0, "absent": 0})
    sessions = _closed_sessions(db, offering_id)
    for session in sessions:
        records = db.scalars(
            select(AttendanceRecord).where(
                AttendanceRecord.session_id == session.id,
                *(
                    [AttendanceRecord.student_id == student_id]
                    if student_id is not None
                    else []
                ),
            )
        ).all()
        for record in records:
            if student_id is None:
                enrolled = db.scalar(
                    select(Enrollment).where(
                        Enrollment.offering_id == session.offering_id,
                        Enrollment.student_id == record.student_id,
                    )
                )
                if enrolled is None:
                    continue
            day = session.session_date
            week_start = day - timedelta(days=day.weekday())
            rows[week_start]["sessions"].add(session.id)
            rows[week_start]["present"] += record.status in {"PRESENT", "EXCUSED"}
            rows[week_start]["absent"] += record.status == "ABSENT"
    return [
        {
            "week_start": week,
            "sessions": len(value["sessions"]),
            "present": value["present"],
            "absent": value["absent"],
            "percentage": round(
                value["present"] / (value["present"] + value["absent"]) * 100,
                2,
            ) if value["present"] + value["absent"] else 0,
        }
        for week, value in sorted(rows.items())
    ]


def student_overview(db: Session, student_id: int) -> dict:
    offering_ids = list(
        db.scalars(
            select(Enrollment.offering_id).where(Enrollment.student_id == student_id)
        )
    )
    marks = list(db.execute(
        select(
            Assessment.id.label("assessment_id"),
            Assessment.title,
            Assessment.type,
            Assessment.max_marks,
            assessment_scores.c.marks,
            assessment_scores.c.status,
        )
        .join(assessment_scores, assessment_scores.c.assessment_id == Assessment.id)
        .where(assessment_scores.c.student_id == student_id)
    ).mappings())
    return {
        "student_id": student_id,
        "attendance": [attendance_percentage(db, student_id, offering_id) for offering_id in offering_ids],
        "marks_available": bool(marks),
        "marks": [dict(row) for row in marks],
    }


def early_warnings(db: Session, threshold: float = 75) -> list[dict]:
    warnings = []
    for student_id in db.scalars(select(Student.user_id)):
        offering_ids = db.scalars(
            select(Enrollment.offering_id).where(Enrollment.student_id == student_id)
        )
        for offering_id in offering_ids:
            summary = attendance_percentage(db, student_id, offering_id)
            if summary["percentage"] < threshold:
                warnings.append(
                    {
                        "student_id": student_id,
                        "offering_id": offering_id,
                        "percentage": summary["percentage"],
                        "shortage": summary["shortage"],
                    }
                )
    return warnings


def risk_queue(db: Session, status: str | None = None) -> list[Flag]:
    query = select(Flag).order_by(Flag.score.desc().nullslast(), Flag.created_at.desc())
    if status:
        query = query.where(Flag.status == status)
    return list(db.scalars(query))


def risk_statistics(db: Session) -> dict:
    flags = list(db.scalars(select(Flag)))
    false_flags = sum(flag.status in {"FALSE", "FALSE_POSITIVE", "REJECTED"} for flag in flags)
    return {
        "total": len(flags),
        "open": sum(flag.status == "OPEN" for flag in flags),
        "resolved": sum(flag.status not in {"OPEN", None} for flag in flags),
        "false_flags": false_flags,
        "false_flag_rate": round(false_flags / len(flags) * 100, 2) if flags else 0,
    }


def institution_analytics(db: Session) -> dict:
    sessions = _closed_sessions(db)
    records = list(db.scalars(select(AttendanceRecord)))
    students = db.scalar(select(func.count()).select_from(Student)) or 0
    offerings = db.scalar(select(func.count()).select_from(Offering)) or 0
    present = sum(record.status in {"PRESENT", "EXCUSED"} for record in records)
    student_ids = {
        record.student_id
        for record in records
        if record.status == "ABSENT"
    }
    open_flags = db.scalar(
        select(func.count()).select_from(Flag).where(Flag.status == "OPEN")
    ) or 0
    return {
        "sessions_held": len(sessions),
        "students": students,
        "offerings": offerings,
        "attendance_percentage": round(present / len(records) * 100, 2) if records else 0,
        "shortage_students": len(student_ids),
        "open_flags": open_flags,
    }


def attendance_report(
    db: Session,
    from_date: date | None,
    to_date: date | None,
) -> list[dict]:
    query = select(AttendanceSession).where(
        AttendanceSession.status.in_(("CLOSED", "SAVED", "SUBMITTED"))
    )
    if from_date:
        query = query.where(AttendanceSession.session_date >= from_date)
    if to_date:
        query = query.where(AttendanceSession.session_date <= to_date)
    sessions = list(db.scalars(query))
    rows = []
    for session in sessions:
        records = list(
            db.scalars(
                select(AttendanceRecord).where(AttendanceRecord.session_id == session.id)
            )
        )
        rows.append(
            {
                "session_id": session.id,
                "offering_id": session.offering_id,
                "session_date": session.session_date,
                "present": sum(record.status in {"PRESENT", "EXCUSED"} for record in records),
                "absent": sum(record.status == "ABSENT" for record in records),
                "audit_entries": db.scalar(
                    select(func.count()).select_from(AttendanceAuditLog).where(
                        AttendanceAuditLog.session_id == session.id
                    )
                ) or 0,
            }
        )
    return rows
