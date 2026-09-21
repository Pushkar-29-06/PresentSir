import hashlib
import hmac
import logging
import secrets
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.academic import Enrollment, Offering, Slot
from app.models.analytics import Flag, PairCooccurrence
from app.models.analytics import AttendanceDispute
from app.models.attendance import (
    AttendanceAuditLog,
    AttendanceRecord,
    AttendanceSession,
    AttendanceSubmission,
)
from app.models.user import Faculty, User
from app.models.user import Student
from app.models.notification import Notification
from app.risk.service import headcount_mismatch, pair_affinity_flag


logger = logging.getLogger("attendance.notifications")


SESSION_STATES = {"SCHEDULED", "OPEN", "CLOSED", "SAVED", "SUBMITTED", "CANCELLED"}
TRANSITIONS = {
    "SCHEDULED": {"OPEN", "CANCELLED"},
    "OPEN": {"CLOSED", "CANCELLED"},
    "CLOSED": {"SAVED"},
    "SAVED": {"SUBMITTED"},
    "SUBMITTED": set(),
    "CANCELLED": set(),
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _faculty_owns_offering(db: Session, faculty: User, offering_id: int) -> Offering:
    if faculty.status != "ACTIVE" or faculty.role != "FACULTY":
        raise PermissionError("Faculty authorization required")
    faculty_identity = db.get(Faculty, faculty.id)
    offering = db.scalar(
        select(Offering).where(
            Offering.id == offering_id,
            Offering.faculty_id == faculty.id,
        )
    )
    if faculty_identity is None or offering is None:
        raise PermissionError("Faculty does not own this offering")
    return offering


def _validate_slot(db: Session, slot_id: int, offering_id: int) -> Slot:
    slot = db.scalar(
        select(Slot).where(
            Slot.id == slot_id,
            Slot.offering_id == offering_id,
            Slot.active.is_(True),
        )
    )
    if slot is None:
        raise ValueError("Active slot does not belong to this offering")
    return slot


def create_session(
    db: Session,
    faculty: User,
    *,
    slot_id: int,
    offering_id: int,
    session_date: date,
    scheduled_start: datetime,
    scheduled_end: datetime,
    window_seconds: int,
    rotation_seconds: int,
    topic: str | None,
) -> AttendanceSession:
    _faculty_owns_offering(db, faculty, offering_id)
    _validate_slot(db, slot_id, offering_id)
    start = _aware(scheduled_start)
    end = _aware(scheduled_end)
    if end <= start:
        raise ValueError("scheduled_end must be after scheduled_start")
    session = AttendanceSession(
        slot_id=slot_id,
        offering_id=offering_id,
        session_date=session_date,
        status="SCHEDULED",
        scheduled_start=start,
        scheduled_end=end,
        window_seconds=window_seconds,
        rotation_seconds=rotation_seconds,
        topic=topic,
        created_by=faculty.id,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _get_owned_session(db: Session, faculty: User, session_id: int) -> AttendanceSession:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise LookupError("Attendance session does not exist")
    _faculty_owns_offering(db, faculty, session.offering_id)
    return session


def start_session(
    db: Session,
    faculty: User,
    session_id: int,
    now: datetime | None = None,
) -> AttendanceSession:
    session = _get_owned_session(db, faculty, session_id)
    if session.status != "SCHEDULED":
        raise ValueError(f"Cannot open session from {session.status}")
    current = _aware(now or utc_now())
    start = _aware(session.scheduled_start)
    end = _aware(session.scheduled_end)
    validate_start_time(start, end, current)
    session.status = "OPEN"
    session.opened_at = current
    session.close_at = min(
        end,
        current + timedelta(seconds=session.window_seconds),
    )
    session.qr_secret = secrets.token_urlsafe(48)
    session.updated_at = current
    db.commit()
    db.refresh(session)
    return session


def validate_start_time(
    scheduled_start: datetime,
    scheduled_end: datetime,
    now: datetime,
) -> None:
    if not settings.enforce_lecture_time:
        return
    earliest = scheduled_start - timedelta(minutes=settings.start_early_minutes)
    if now < earliest or now > scheduled_end:
        raise ValueError("Session cannot be opened outside the lecture time window")


def transition_session(
    db: Session,
    faculty: User,
    session_id: int,
    target: str,
    now: datetime | None = None,
) -> AttendanceSession:
    if target not in SESSION_STATES:
        raise ValueError("Unknown session state")
    if target == "OPEN":
        raise ValueError("Use start_session to open a scheduled session")
    session = _get_owned_session(db, faculty, session_id)
    if target == "CLOSED":
        return close_session(db, faculty, session_id, now)
    if target not in TRANSITIONS[session.status]:
        raise ValueError(f"Cannot transition {session.status} to {target}")
    current = _aware(now or utc_now())
    if target == "CLOSED":
        session.close_at = session.close_at or current
    if target == "SAVED":
        session.saved_at = current
    if target == "SUBMITTED":
        session.submitted_at = current
        session.submitted_by = faculty.id
    session.status = target
    session.updated_at = current
    db.commit()
    db.refresh(session)
    return session


def list_roster(db: Session, faculty: User, session_id: int) -> list[dict]:
    session = _get_owned_session(db, faculty, session_id)
    rows = db.execute(
        select(Student, User, AttendanceRecord)
        .join(User, User.id == Student.user_id)
        .outerjoin(
            AttendanceRecord,
            (AttendanceRecord.student_id == Student.user_id)
            & (AttendanceRecord.session_id == session.id),
        )
        .where(
            Student.user_id.in_(
                select(Enrollment.student_id).where(
                    Enrollment.offering_id == session.offering_id,
                )
            )
        )
        .order_by(Student.roll_no)
    ).all()
    roster = []
    for student, user, record in rows:
        flags = db.scalars(
            select(Flag).where(
                Flag.session_id == session.id,
                Flag.student_id == student.user_id,
            )
        ).all()
        roster.append(
            {
                "student_id": student.user_id,
                "roll_no": student.roll_no,
                "prn": student.prn,
                "name": user.name,
                "status": record.status if record else None,
                "source": record.source if record else None,
                "flags": flags,
            }
        )
    return roster


def edit_attendance_record(
    db: Session,
    faculty: User,
    session_id: int,
    student_id: int,
    status: str,
    reason: str,
) -> AttendanceRecord:
    if len(reason.strip()) < 5:
        raise ValueError("Manual attendance reason must be at least 5 characters")
    if status not in {"PRESENT", "ABSENT", "EXCUSED"}:
        raise ValueError("Unsupported attendance status")
    session = db.scalar(
        select(AttendanceSession)
        .where(AttendanceSession.id == session_id)
        .with_for_update()
    )
    if session is None:
        raise LookupError("Attendance session does not exist")
    _faculty_owns_offering(db, faculty, session.offering_id)
    if session.status not in {"CLOSED", "SAVED", "SUBMITTED"}:
        raise ValueError("Manual edits are not allowed in the current session state")
    enrolled = db.scalar(
        select(Enrollment).where(
            Enrollment.offering_id == session.offering_id,
            Enrollment.student_id == student_id,
        )
    )
    if enrolled is None:
        raise LookupError("Student is not enrolled in this offering")
    record = db.scalar(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == student_id,
        )
        .with_for_update()
    )
    if record is None:
        raise LookupError("Attendance record does not exist")
    now = utc_now()
    old_status = record.status
    record.status = status
    record.source = "MANUAL"
    record.reason = reason.strip()
    record.updated_by = faculty.id
    record.updated_at = now
    db.add(
        AttendanceAuditLog(
            session_id=session_id,
            student_id=student_id,
            record_id=record.id,
            action="POST_SUBMIT_EDIT" if session.status == "SUBMITTED" else "EDIT",
            old_status=old_status,
            new_status=status,
            reason=record.reason,
            actor_id=faculty.id,
            actor_role=faculty.role,
            at=now,
            meta={"source": "MANUAL"},
            created_at=now,
            updated_at=now,
        )
    )
    db.commit()
    db.refresh(record)
    return record


def create_dispute(
    db: Session,
    student: User,
    record_id: int,
    message: str,
) -> AttendanceDispute:
    record = db.get(AttendanceRecord, record_id)
    if record is None or record.student_id != student.id:
        raise LookupError("Attendance record does not belong to the student")
    now = utc_now()
    dispute = AttendanceDispute(
        record_id=record.id,
        student_id=student.id,
        message=message,
        status="OPEN",
        created_at=now,
        updated_at=now,
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    return dispute


def decide_dispute(
    db: Session,
    faculty: User,
    dispute_id: int,
    decision: str,
    response: str,
    new_status: str | None,
) -> AttendanceDispute:
    if decision not in {"ACCEPTED", "REJECTED"}:
        raise ValueError("Dispute decision must be ACCEPTED or REJECTED")
    dispute = db.scalar(
        select(AttendanceDispute)
        .where(AttendanceDispute.id == dispute_id)
        .with_for_update()
    )
    if dispute is None:
        raise LookupError("Dispute does not exist")
    record = db.get(AttendanceRecord, dispute.record_id)
    session = db.get(AttendanceSession, record.session_id) if record else None
    if record is None or session is None:
        raise LookupError("Dispute record is unavailable")
    _faculty_owns_offering(db, faculty, session.offering_id)
    if dispute.status != "OPEN":
        raise ValueError("Dispute has already been resolved")
    now = utc_now()
    dispute.status = decision
    dispute.resolved_by = faculty.id
    dispute.resolved_at = now
    dispute.response = response
    dispute.updated_at = now
    if decision == "ACCEPTED":
        if new_status not in {"PRESENT", "ABSENT", "EXCUSED"}:
            raise ValueError("Accepted disputes require a valid new status")
        old_status = record.status
        record.status = new_status
        record.source = "MANUAL"
        record.reason = response
        record.updated_by = faculty.id
        record.updated_at = now
        db.add(
            AttendanceAuditLog(
                session_id=session.id,
                student_id=record.student_id,
                record_id=record.id,
                action="EDIT",
                old_status=old_status,
                new_status=new_status,
                reason=response,
                actor_id=faculty.id,
                actor_role=faculty.role,
                at=now,
                meta={"source": "DISPUTE", "dispute_id": dispute.id},
                created_at=now,
                updated_at=now,
            )
        )
    db.commit()
    db.refresh(dispute)
    return dispute


def _submission_pairs(
    submissions: list[AttendanceSubmission],
) -> list[tuple[int, int, bool]]:
    pairs: list[tuple[int, int, bool]] = []
    for index, left in enumerate(submissions):
        for right in submissions[index + 1 :]:
            if left.student_id is None or right.student_id is None:
                continue
            student_a, student_b = sorted((left.student_id, right.student_id))
            close = (
                left.submitted_at is not None
                and right.submitted_at is not None
                and abs(
                    (left.submitted_at - right.submitted_at).total_seconds()
                )
                <= 2
            )
            pairs.append((student_a, student_b, close))
    return pairs


def close_session(
    db: Session,
    faculty: User,
    session_id: int,
    now: datetime | None = None,
) -> AttendanceSession:
    session = db.scalar(
        select(AttendanceSession)
        .where(AttendanceSession.id == session_id)
        .with_for_update()
    )
    if session is None:
        raise LookupError("Attendance session does not exist")
    _faculty_owns_offering(db, faculty, session.offering_id)
    if session.status != "OPEN":
        raise ValueError(f"Cannot close session from {session.status}")

    current = _aware(now or utc_now())
    enrolled_ids = list(
        db.scalars(
            select(Enrollment.student_id).where(
                Enrollment.offering_id == session.offering_id,
            )
        )
    )
    submissions = list(
        db.scalars(
            select(AttendanceSubmission)
            .where(AttendanceSubmission.session_id == session.id)
            .with_for_update()
        )
    )
    submissions_by_student = {
        submission.student_id: submission for submission in submissions
    }
    present_count = 0
    reported_headcount = session.headcount

    for student_id in enrolled_ids:
        submission = submissions_by_student.get(student_id)
        present = submission is not None
        if present:
            present_count += 1
        record = AttendanceRecord(
            session_id=session.id,
            student_id=student_id,
            status="PRESENT" if present else "ABSENT",
            source="SCAN" if present else "SYSTEM",
            reason=None if present else "No attendance submission",
            updated_by=faculty.id,
            updated_at=current,
            created_at=current,
        )
        db.add(record)
        db.flush()
        if not present:
            db.add(
                Notification(
                    user_id=student_id,
                    type="ATTENDANCE_SHORTAGE",
                    title="Attendance shortage",
                    body="You were marked absent for this attendance session.",
                    created_at=current,
                    updated_at=current,
                )
            )
            logger.info(
                "shortage notification",
                extra={
                    "event": "ATTENDANCE_SHORTAGE",
                    "session_id": session.id,
                    "student_id": student_id,
                },
            )
        db.add(
            AttendanceAuditLog(
                session_id=session.id,
                student_id=student_id,
                record_id=record.id,
                action="CREATE",
                old_status=None,
                new_status=record.status,
                reason=record.reason,
                actor_id=faculty.id,
                actor_role=faculty.role,
                at=current,
                meta={"source": record.source},
                created_at=current,
                updated_at=current,
            )
        )

    session.status = "CLOSED"
    session.close_at = session.close_at or current
    session.updated_at = current

    if headcount_mismatch(reported_headcount, present_count):
        db.add(
            Flag(
                session_id=session.id,
                kind="SESSION",
                score=30,
                level="REVIEW",
                reasons={
                    "rule": "HEADCOUNT_MISMATCH",
                    "reported": reported_headcount,
                    "present": present_count,
                },
                status="OPEN",
                created_at=current,
                updated_at=current,
            )
        )

    offering = db.get(Offering, session.offering_id)
    if offering is not None:
        pairs = _submission_pairs(submissions)
        pair_counts: dict[tuple[int, int], tuple[int, int]] = {}
        for student_a, student_b, close in pairs:
            together, close_count = pair_counts.get((student_a, student_b), (0, 0))
            pair_counts[(student_a, student_b)] = (
                together + 1,
                close_count + int(close),
            )
        for (student_a, student_b), (together, close_count) in pair_counts.items():
            pair = db.get(
                PairCooccurrence,
                (offering.term_id, student_a, student_b),
            )
            if pair is None:
                pair = PairCooccurrence(
                    term_id=offering.term_id,
                    student_a=student_a,
                    student_b=student_b,
                    sessions_together=together,
                    sessions_close=close_count,
                    created_at=current,
                    updated_at=current,
                )
                db.add(pair)
            else:
                pair.sessions_together = (pair.sessions_together or 0) + together
                pair.sessions_close = (pair.sessions_close or 0) + close_count
                pair.updated_at = current
            db.flush()
            total = pair.sessions_together or 0
            close_total = pair.sessions_close or 0
            if pair_affinity_flag(total, close_total):
                db.add(
                    Flag(
                        session_id=session.id,
                        student_id=student_a,
                        kind="STUDENT",
                        score=35,
                        level="REVIEW",
                        reasons={
                            "rule": "PAIR_AFFINITY",
                            "paired_student_id": student_b,
                            "sessions_together": total,
                            "sessions_close": close_total,
                        },
                        status="OPEN",
                        created_at=current,
                        updated_at=current,
                    )
                )

    db.commit()
    db.refresh(session)
    return session


def qr_step(session: AttendanceSession, now: datetime | None = None) -> int:
    if session.status != "OPEN" or session.opened_at is None:
        raise PermissionError("Session is not open")
    current = _aware(now or utc_now())
    if session.close_at is not None and current >= _aware(session.close_at):
        raise PermissionError("Attendance session is closed")
    opened = _aware(session.opened_at)
    return max(0, int((current - opened).total_seconds() // session.rotation_seconds))


def qr_token(session: AttendanceSession, now: datetime | None = None) -> tuple[int, str, datetime]:
    step = qr_step(session, now)
    current = _aware(now or utc_now())
    expires_at = min(
        _aware(session.close_at),
        _aware(session.opened_at) + timedelta(seconds=(step + 1) * session.rotation_seconds),
    )
    message = f"A1|{session.id}|{step}".encode()
    token = hmac.new(
        session.qr_secret.encode(),
        message,
        hashlib.sha256,
    ).hexdigest()
    return step, token, expires_at


def verify_qr_token(
    session: AttendanceSession,
    token: str,
    now: datetime | None = None,
) -> tuple[int, bool]:
    current_step = qr_step(session, now)
    for step, used_grace in (
        (current_step, False),
        *(
            (current_step - offset, True)
            for offset in range(1, settings.qr_grace_steps + 1)
            if current_step - offset >= 0
        ),
    ):
        expected = hmac.new(
            session.qr_secret.encode(),
            f"A1|{session.id}|{step}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if hmac.compare_digest(expected, token):
            return step, used_grace
    raise PermissionError("Invalid or expired QR token")
