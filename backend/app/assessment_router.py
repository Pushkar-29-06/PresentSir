from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db import get_db
from app.models.user import User
from app.schemas.phase_g import AssessmentCreate, AssessmentResponse, ScoreEntry, ScoreResponse
from app.services.phase_g import create_assessment, enter_score

router = APIRouter(prefix="/academics", tags=["assessments"])


@router.post("/assessments", response_model=AssessmentResponse)
def create_assessment_endpoint(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
):
    try:
        return create_assessment(db, faculty.id, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/assessment-scores", response_model=ScoreResponse)
def enter_score_endpoint(
    payload: ScoreEntry,
    db: Session = Depends(get_db),
    faculty: User = Depends(require_roles("FACULTY")),
):
    try:
        return enter_score(db, faculty.id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
