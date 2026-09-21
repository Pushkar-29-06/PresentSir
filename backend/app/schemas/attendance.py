from datetime import date, datetime

from pydantic import BaseModel, Field


class AttendanceSessionCreate(BaseModel):
    slot_id: int
    offering_id: int
    session_date: date
    scheduled_start: datetime
    scheduled_end: datetime
    window_seconds: int = Field(default=300, gt=0)
    rotation_seconds: int = Field(default=30, gt=0)
    topic: str | None = None


class AttendanceSessionResponse(BaseModel):
    id: int
    status: str
    opened_at: datetime | None = None
    close_at: datetime | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None


class QrTokenResponse(BaseModel):
    session_id: int
    step: int
    token: str
    expires_at: datetime


class AttendanceSubmissionCreate(BaseModel):
    session_id: int
    android_id: str = Field(min_length=1, max_length=255)
    qr_token: str = Field(min_length=1)
    client_nonce: str = Field(min_length=16, max_length=255)
    signature: str = Field(min_length=1)
    app_version: str | None = None
    latency_ms: int | None = Field(default=None, ge=0)


class AttendanceSubmissionResponse(BaseModel):
    accepted: bool
    submission_id: int
    token_step: int
    used_grace_step: bool


class AttendanceFlagResponse(BaseModel):
    id: int
    kind: str | None
    score: float | None
    level: str | None
    status: str | None
    reasons: dict | None


class RosterStudentResponse(BaseModel):
    student_id: int
    roll_no: str
    prn: str
    name: str
    status: str | None
    source: str | None
    flags: list[AttendanceFlagResponse]


class AttendanceRecordUpdate(BaseModel):
    status: str
    reason: str = Field(min_length=5)


class AttendanceRecordResponse(BaseModel):
    id: int
    session_id: int
    student_id: int
    status: str | None
    source: str | None
    reason: str | None


class DisputeCreate(BaseModel):
    message: str = Field(min_length=1)


class DisputeDecision(BaseModel):
    status: str
    response: str = Field(min_length=1)
    new_status: str | None = None


class DisputeResponse(BaseModel):
    id: int
    record_id: int | None
    student_id: int | None
    status: str | None
    message: str | None
    response: str | None
