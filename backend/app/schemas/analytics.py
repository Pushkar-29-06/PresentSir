from datetime import date

from pydantic import BaseModel


class AttendancePercentage(BaseModel):
    student_id: int
    offering_id: int | None
    sessions_held: int
    present: int
    absent: int
    excused: int
    percentage: float
    shortage: float


class OfferingSummary(BaseModel):
    offering_id: int
    sessions_held: int
    enrolled_students: int
    total_records: int
    present_records: int
    absent_records: int
    attendance_percentage: float


class WeeklyTrendPoint(BaseModel):
    week_start: date
    sessions: int
    present: int
    absent: int
    percentage: float


class RiskQueueItem(BaseModel):
    id: int
    session_id: int | None
    student_id: int | None
    kind: str | None
    score: float | None
    level: str | None
    status: str | None
    reasons: dict | None


class RiskStatistics(BaseModel):
    total: int
    open: int
    resolved: int
    false_flags: int
    false_flag_rate: float


class StudentOverview(BaseModel):
    student_id: int
    attendance: list[AttendancePercentage]
    marks_available: bool
    marks: list[dict]


class EarlyWarning(BaseModel):
    student_id: int
    offering_id: int
    percentage: float
    shortage: float


class InstitutionAnalytics(BaseModel):
    sessions_held: int
    students: int
    offerings: int
    attendance_percentage: float
    shortage_students: int
    open_flags: int


class AttendanceReport(BaseModel):
    generated_for: str
    from_date: date | None
    to_date: date | None
    rows: list[dict]
