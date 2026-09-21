from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.phase_g import NotificationResponse, ShortageNotifyRequest
from app.services.phase_g import create_notifications_for_shortage

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("STUDENT", "FACULTY", "ADMIN")),
):
    return list(db.scalars(select(Notification).where(
        Notification.user_id == user.id
    ).order_by(Notification.created_at.desc())))


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("STUDENT", "FACULTY", "ADMIN")),
):
    item = db.scalar(select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user.id,
    ))
    if item is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    item.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item


@router.post("/shortage/notify")
def notify_shortage(
    payload: ShortageNotifyRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("FACULTY", "ADMIN")),
):
    return {"created": create_notifications_for_shortage(db, payload.offering_id)}
