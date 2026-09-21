from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db import get_db
from app.models.policy import Policy
from app.models.user import User
from app.schemas.phase_g import PolicyResponse, PolicyUpsert
from app.services.phase_g import EXCUSED_MODES, POLICY_SCOPES

router = APIRouter(prefix="/admin/policies", tags=["policies"])


def _response(item: Policy) -> PolicyResponse:
    return PolicyResponse.model_validate(item, from_attributes=True)


@router.get("", response_model=list[PolicyResponse])
def list_policies(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    return list(db.scalars(select(Policy).order_by(Policy.effective_from.desc())))


@router.put("", response_model=PolicyResponse)
def set_policy(
    payload: PolicyUpsert,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
):
    if payload.scope not in POLICY_SCOPES:
        raise HTTPException(status_code=422, detail="Invalid policy scope")
    if payload.scope == "GLOBAL" and payload.scope_id is not None:
        raise HTTPException(status_code=422, detail="Global policies cannot have scope_id")
    item = Policy(
        scope=payload.scope,
        scope_id=payload.scope_id,
        threshold_percent=payload.threshold_percent,
        warn_margin_percent=5,
        excused_mode="EXCLUDE",
        effective_from=payload.effective_from,
        set_by=admin.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/history", response_model=list[PolicyResponse])
def policy_history(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    return list(db.scalars(select(Policy).order_by(Policy.effective_from.desc())))
