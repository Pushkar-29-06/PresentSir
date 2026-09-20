"""Analytics, risk, and attendance dispute models."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Flag(Base):
    __tablename__ = "flags"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    session_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("attendance_sessions.id"),
        nullable=True,
    )
    student_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("students.user_id"),
        nullable=True,
    )
    submission_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("attendance_submissions.id"),
        nullable=True,
    )
    kind: Mapped[str | None] = mapped_column(String, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    level: Mapped[str | None] = mapped_column(String, nullable=True)
    reasons: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class PairCooccurrence(Base):
    __tablename__ = "pair_cooccurrence"
    __table_args__ = (
        CheckConstraint(
            "student_a < student_b",
            name="ck_pair_cooccurrence_student_order",
        ),
    )

    term_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("terms.id"),
        primary_key=True,
    )
    student_a: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("students.user_id"),
        primary_key=True,
    )
    student_b: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("students.user_id"),
        primary_key=True,
    )
    sessions_together: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    sessions_close: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class AttendanceDispute(Base):
    __tablename__ = "attendance_disputes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    record_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("attendance_records.id"),
        nullable=True,
    )
    student_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("students.user_id"),
        nullable=True,
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
