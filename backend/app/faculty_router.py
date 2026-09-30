from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db import get_db
from app.models.academic import Course, Offering, Slot
from app.models.user import Faculty, User
from app.schemas.faculty import (
    FacultySlotCreate,
    FacultySlotResponse,
    FacultySlotUpdate,
)

router = APIRouter(prefix="/faculty", tags=["faculty"])


def _row(slot: Slot, course: Course) -> FacultySlotResponse:
    return FacultySlotResponse(
        id=slot.id,
        offering_id=slot.offering_id,
        course_code=course.code,
        course_name=course.name,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
        room=slot.room,
        active=slot.active,
    )


def _owned_offering(db: Session, faculty: User, offering_id: int) -> Offering:
    identity = db.get(Faculty, faculty.id)
    offering = db.scalar(
        select(Offering).where(
            Offering.id == offering_id,
            Offering.faculty_id == faculty.id,
        )
    )
    if identity is None or offering is None:
        raise HTTPException(status_code=403, detail="Faculty does not own this offering")
    return offering


@router.get("/slots", response_model=list[FacultySlotResponse])
def list_slots(
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> list[FacultySlotResponse]:
    rows = db.execute(
        select(Slot, Course)
        .join(Offering, Offering.id == Slot.offering_id)
        .join(Course, Course.id == Offering.course_id)
        .where(Offering.faculty_id == faculty.id)
        .order_by(Slot.active.desc(), Slot.day_of_week, Slot.start_time)
    ).all()
    return [_row(slot, course) for slot, course in rows]


@router.post("/slots", response_model=FacultySlotResponse, status_code=201)
def create_slot(
    payload: FacultySlotCreate,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> FacultySlotResponse:
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")
    offering = _owned_offering(db, faculty, payload.offering_id)
    slot = Slot(
        offering_id=offering.id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
        active=True,
        created_by=faculty.id,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return _row(slot, db.get(Course, offering.course_id))


@router.patch("/slots/{slot_id}", response_model=FacultySlotResponse)
def update_slot(
    slot_id: int,
    payload: FacultySlotUpdate,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
) -> FacultySlotResponse:
    slot = db.get(Slot, slot_id)
    if slot is None:
        raise HTTPException(status_code=404, detail="Slot does not exist")
    offering = _owned_offering(db, faculty, slot.offering_id)
    values = payload.model_dump(exclude_unset=True)
    for key, value in values.items():
        setattr(slot, key, value)
    if slot.end_time <= slot.start_time:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")
    db.commit()
    db.refresh(slot)
    return _row(slot, db.get(Course, offering.course_id))
