from datetime import datetime, timezone

from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from app.models.academic import Course, Enrollment, Offering
from app.models.assessments import Assessment, assessment_scores
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.notification import Notification
from app.models.policy import Policy

ASSESSMENT_TYPES = {"ASSIGNMENT", "INTERNAL", "ASSESSMENT"}
SCORE_STATUSES = {"SUBMITTED", "MISSED", "GRADED"}
POLICY_SCOPES = {"GLOBAL", "DEPARTMENT", "COURSE"}
EXCUSED_MODES = {"EXCLUDE", "COUNT_PRESENT"}


def create_assessment(db: Session, faculty_id: int, payload) -> Assessment:
    offering = db.scalar(select(Offering).where(
        Offering.id == payload.offering_id,
        Offering.faculty_id == faculty_id,
    ))
    if offering is None:
        raise PermissionError("Faculty does not own this offering")
    if payload.type not in ASSESSMENT_TYPES:
        raise ValueError("Invalid assessment type")
    item = Assessment(**payload.model_dump(), created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def enter_score(db: Session, faculty_id: int, payload) -> dict:
    assessment = db.get(Assessment, payload.assessment_id)
    if assessment is None:
        raise LookupError("Assessment does not exist")
    offering = db.scalar(select(Offering).where(
        Offering.id == assessment.offering_id,
        Offering.faculty_id == faculty_id,
    ))
    if offering is None:
        raise PermissionError("Faculty does not own this offering")
    if payload.status not in SCORE_STATUSES:
        raise ValueError("Invalid score status")
    if payload.marks is not None and payload.marks > assessment.max_marks:
        raise ValueError("Marks exceed assessment maximum")
    if db.scalar(select(Enrollment).where(
        Enrollment.offering_id == assessment.offering_id,
        Enrollment.student_id == payload.student_id,
    )) is None:
        raise LookupError("Student is not enrolled in this offering")
    values = payload.model_dump()
    values.pop("assessment_id")
    values.pop("student_id")
    values["updated_at"] = datetime.now(timezone.utc)
    existing = db.execute(select(assessment_scores).where(
        assessment_scores.c.assessment_id == payload.assessment_id,
        assessment_scores.c.student_id == payload.student_id,
    )).mappings().first()
    if existing:
        db.execute(update(assessment_scores).where(
            assessment_scores.c.assessment_id == payload.assessment_id,
            assessment_scores.c.student_id == payload.student_id,
        ).values(**values))
    else:
        db.execute(insert(assessment_scores).values(
            assessment_id=payload.assessment_id,
            student_id=payload.student_id,
            created_at=datetime.now(timezone.utc),
            **values,
        ))
    db.commit()
    return dict(db.execute(select(assessment_scores).where(
        assessment_scores.c.assessment_id == payload.assessment_id,
        assessment_scores.c.student_id == payload.student_id,
    )).mappings().one())


def effective_policy(db: Session, offering: Offering, at: datetime | None = None) -> Policy | None:
    now = at or datetime.now(timezone.utc)
    rows = list(db.scalars(select(Policy).where(
        Policy.effective_from <= now,
        Policy.scope.in_(("GLOBAL", "DEPARTMENT", "COURSE")),
    )))
    course = db.get(Course, offering.course_id)
    applicable = [
        row for row in rows
        if row.scope == "GLOBAL"
        or (row.scope == "COURSE" and row.scope_id == offering.course_id)
        or (
            row.scope == "DEPARTMENT"
            and course is not None
            and row.scope_id == course.department_id
        )
    ]
    precedence = {"GLOBAL": 0, "DEPARTMENT": 1, "COURSE": 2}
    return max(
        applicable,
        key=lambda row: (precedence[row.scope], row.effective_from),
        default=None,
    )


def create_notifications_for_shortage(db: Session, offering_id: int) -> int:
    students = db.scalars(select(Enrollment.student_id).where(Enrollment.offering_id == offering_id))
    created = 0
    for student_id in students:
        db.add(Notification(
            user_id=student_id,
            type="ATTENDANCE_SHORTAGE",
            title="Attendance shortage",
            body="Your attendance is below the configured threshold.",
        ))
        created += 1
    db.commit()
    return created
