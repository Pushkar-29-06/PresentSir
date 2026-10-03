from datetime import time

from pydantic import BaseModel, Field


class FacultySlotCreate(BaseModel):
    offering_id: int
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    room: str = Field(min_length=1)


class FacultyOfferingResponse(BaseModel):
    id: int
    course_code: str
    course_name: str


class FacultySlotUpdate(BaseModel):
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = Field(default=None, min_length=1)
    active: bool | None = None


class FacultySlotResponse(BaseModel):
    id: int
    offering_id: int
    course_code: str
    course_name: str
    day_of_week: int
    start_time: time
    end_time: time
    room: str
    active: bool
