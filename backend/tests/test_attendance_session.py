from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app.attendance.service import (
    TRANSITIONS,
    _submission_pairs,
    qr_step,
    qr_token,
    transition_session,
    validate_start_time,
    verify_qr_token,
)


UTC = timezone.utc


def open_session(**overrides):
    now = datetime(2026, 9, 21, 10, 0, tzinfo=UTC)
    values = {
        "id": 7,
        "status": "OPEN",
        "opened_at": now,
        "close_at": now + timedelta(minutes=5),
        "rotation_seconds": 30,
        "qr_secret": "secret",
        "offering_id": 12,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_state_machine_allows_only_specified_transitions():
    assert TRANSITIONS["SCHEDULED"] == {"OPEN", "CANCELLED"}
    assert TRANSITIONS["OPEN"] == {"CLOSED", "CANCELLED"}
    assert TRANSITIONS["CLOSED"] == {"SAVED"}
    assert TRANSITIONS["SAVED"] == {"SUBMITTED"}
    assert TRANSITIONS["SUBMITTED"] == set()


def test_invalid_state_transition_is_rejected():
    db = Mock()
    db.get.return_value = open_session(status="CLOSED")
    db.scalar.return_value = object()
    faculty = SimpleNamespace(status="ACTIVE", role="FACULTY", id=3)

    with pytest.raises(ValueError, match="Use start_session"):
        transition_session(db, faculty, 7, "OPEN")


def test_start_time_accepts_early_boundary_and_scheduled_end():
    start = datetime(2026, 9, 21, 10, 0, tzinfo=UTC)
    end = datetime(2026, 9, 21, 11, 0, tzinfo=UTC)

    validate_start_time(start, end, start - timedelta(minutes=10))
    validate_start_time(start, end, end)


def test_start_time_rejects_before_and_after_boundaries():
    start = datetime(2026, 9, 21, 10, 0, tzinfo=UTC)
    end = datetime(2026, 9, 21, 11, 0, tzinfo=UTC)

    with pytest.raises(ValueError):
        validate_start_time(start, end, start - timedelta(minutes=10, seconds=1))
    with pytest.raises(ValueError):
        validate_start_time(start, end, end + timedelta(seconds=1))


def test_qr_token_uses_current_rotation_step_and_verifies():
    session = open_session()
    now = session.opened_at + timedelta(seconds=61)

    step, token, expires_at = qr_token(session, now)

    assert step == 2
    assert expires_at == session.opened_at + timedelta(seconds=90)
    assert verify_qr_token(session, token, now) == (2, False)


def test_previous_step_is_accepted_only_as_configured_grace():
    session = open_session()
    now = session.opened_at + timedelta(seconds=61)
    _, previous_token, _ = qr_token(session, now - timedelta(seconds=30))

    assert verify_qr_token(session, previous_token, now) == (1, True)


def test_qr_is_rejected_after_close():
    session = open_session()

    with pytest.raises(PermissionError, match="closed"):
        qr_step(session, session.close_at)


def test_qr_grace_is_not_unbounded():
    session = open_session()
    now = session.opened_at + timedelta(seconds=61)
    _, old_token, _ = qr_token(session, now - timedelta(seconds=60))

    with pytest.raises(PermissionError, match="Invalid or expired"):
        verify_qr_token(session, old_token, now)


def test_submission_pairs_are_normalized_and_detect_two_second_cooccurrence():
    first = SimpleNamespace(
        student_id=205,
        submitted_at=datetime(2026, 9, 21, 10, 0, tzinfo=UTC),
    )
    second = SimpleNamespace(
        student_id=101,
        submitted_at=datetime(2026, 9, 21, 10, 0, 2, tzinfo=UTC),
    )

    assert _submission_pairs([first, second]) == [(101, 205, True)]
