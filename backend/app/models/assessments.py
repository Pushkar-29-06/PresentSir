"""Assessment and score persistence models."""

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String, Table, Column, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    offering_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("offerings.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    max_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


# The specification does not declare a key or uniqueness constraint here.
assessment_scores = Table(
    "assessment_scores",
    Base.metadata,
    Column("assessment_id", BigInteger, ForeignKey("assessments.id"), nullable=False),
    Column("student_id", BigInteger, ForeignKey("students.user_id"), nullable=False),
    Column("marks", Integer, nullable=True),
    Column("submitted_at", DateTime(timezone=True), nullable=True),
    Column("status", String, nullable=False),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
)
