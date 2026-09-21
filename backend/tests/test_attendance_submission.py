from base64 import b64encode
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

from app.attendance.submission import (
    SubmissionRejected,
    _verify_submission_signature,
    submit_attendance,
    submission_proof,
)


def test_submission_proof_is_deterministic():
    first = submission_proof(7, 2, "android-1", "nonce-1234567890", "qr")
    second = submission_proof(7, 2, "android-1", "nonce-1234567890", "qr")
    assert first == second
    assert b'"session_id":7' in first


def test_valid_submission_signature_is_accepted():
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    binding = SimpleNamespace(public_key=public_key, key_algorithm="Ed25519")
    message = submission_proof(7, 2, "android-1", "nonce-1234567890", "qr")

    _verify_submission_signature(
        binding,
        b64encode(private_key.sign(message)).decode(),
        message,
    )


def test_invalid_submission_signature_is_rejected():
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    binding = SimpleNamespace(public_key=public_key, key_algorithm="Ed25519")
    message = submission_proof(7, 2, "android-1", "nonce-1234567890", "qr")

    with pytest.raises(SubmissionRejected, match="Invalid submission signature"):
        _verify_submission_signature(
            binding,
            b64encode(b"invalid").decode(),
            message,
        )


class FakeRedis:
    def __init__(self):
        self.values = set()

    def set(self, key, value, nx=False, ex=None):
        if nx and key in self.values:
            return False
        self.values.add(key)
        return True

    def close(self):
        pass


class FakeDb:
    def __init__(self, session, enrolled=True):
        self.session = session
        self.enrolled = enrolled
        self.item = None

    def get(self, model, identifier):
        return self.session

    def scalar(self, query):
        return object() if self.enrolled else None

    def add(self, item):
        self.item = item
        item.id = 99

    def commit(self):
        pass

    def refresh(self, item):
        pass


def test_valid_submission_persists_raw_event_only(monkeypatch):
    session = SimpleNamespace(
        id=7,
        status="OPEN",
        offering_id=12,
        close_at=None,
    )
    binding = SimpleNamespace(
        id=3,
        public_key="unused",
        key_algorithm="Ed25519",
    )
    db = FakeDb(session)
    redis = FakeRedis()
    student = SimpleNamespace(id=20, role="STUDENT", status="ACTIVE")

    monkeypatch.setattr(
        "app.attendance.submission.get_active_binding",
        lambda *_: binding,
    )
    monkeypatch.setattr(
        "app.attendance.submission.verify_qr_token",
        lambda *_: (4, True),
    )
    monkeypatch.setattr(
        "app.attendance.submission._verify_submission_signature",
        lambda *_: None,
    )
    monkeypatch.setattr("app.attendance.submission.get_redis", lambda: redis)

    item = submit_attendance(
        db,
        student,
        session_id=7,
        android_id="android-1",
        qr_token="qr",
        client_nonce="nonce-1234567890",
        signature="signature",
        app_version="1.0",
        latency_ms=20,
        ip="127.0.0.1",
        user_agent="test",
    )

    assert item.id == 99
    assert item.used_grace_step is True
    assert db.item.__class__.__name__ == "AttendanceSubmission"


def test_replayed_nonce_is_rejected(monkeypatch):
    redis = FakeRedis()
    monkeypatch.setattr("app.attendance.submission.get_redis", lambda: redis)
    from app.attendance.submission import _reserve_nonce

    _reserve_nonce(7, 20, "nonce-1234567890", 60)
    with pytest.raises(SubmissionRejected, match="Replay detected"):
        _reserve_nonce(7, 20, "nonce-1234567890", 60)
