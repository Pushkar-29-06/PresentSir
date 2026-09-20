"""Academic structure models."""

from datetime import date, datetime, time

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Department(TimestampMixin, Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)


class Term(TimestampMixin, Base):
    __tablename__ = "terms"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False)


class Course(TimestampMixin, Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    department_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("departments.id"),
        nullable=False,
    )
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)


class Offering(TimestampMixin, Base):
    __tablename__ = "offerings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("courses.id"),
        nullable=False,
    )
    faculty_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("faculty.user_id"),
        nullable=False,
    )
    term_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("terms.id"),
        nullable=False,
    )
    division: Mapped[str] = mapped_column(String, nullable=False)
    batch: Mapped[str | None] = mapped_column(String, nullable=True)


class Enrollment(TimestampMixin, Base):
    __tablename__ = "enrollments"

    offering_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("offerings.id"),
        primary_key=True,
    )
    student_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("students.user_id"),
        primary_key=True,
    )


class Slot(TimestampMixin, Base):
    __tablename__ = "slots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    offering_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("offerings.id"),
        nullable=False,
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    room: Mapped[str] = mapped_column(String, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
    )
