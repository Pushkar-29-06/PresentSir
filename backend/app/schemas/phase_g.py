from datetime import date, datetime

from pydantic import BaseModel, Field


class AssessmentCreate(BaseModel):
    offering_id: int
    title: str = Field(min_length=1)
    type: str
    max_marks: int = Field(gt=0)
    due_date: date


class AssessmentResponse(AssessmentCreate):
    id: int


class ScoreEntry(BaseModel):
    assessment_id: int
    student_id: int
    marks: int | None = None
    submitted_at: datetime | None = None
    status: str


class ScoreResponse(ScoreEntry):
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PolicyUpsert(BaseModel):
    scope: str
    scope_id: int | None = None
    threshold_percent: int = Field(ge=0, le=100)
    effective_from: datetime
    note: str | None = None


class PolicyResponse(BaseModel):
    id: int
    scope: str
    scope_id: int | None
    threshold_percent: int
    warn_margin_percent: int
    excused_mode: str
    effective_from: datetime
    set_by: int


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    body: str
    read_at: datetime | None


class ShortageNotifyRequest(BaseModel):
    offering_id: int


class RefreshTokenRecordResponse(BaseModel):
    id: int
    expires_at: datetime
    revoked_at: datetime | None
