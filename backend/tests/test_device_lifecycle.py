from base64 import b64encode
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

from app.device.service import (
    _verify_signature,
    get_active_binding,
    update_device_status,
)


def test_invalid_signature_is_rejected() -> None:
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()

    with pytest.raises(PermissionError, match="Invalid registration signature"):
        _verify_signature(
            public_key,
            b64encode(b"invalid").decode(),
            b"android:challenge",
            "Ed25519",
        )


def test_revoked_binding_cannot_authenticate() -> None:
    db = Mock()
    db.scalar.return_value = None

    with pytest.raises(PermissionError, match="DEVICE_BINDING_REQUIRED"):
        get_active_binding(db, 10, "android-10")


def test_active_binding_is_required_for_android_authentication() -> None:
    db = Mock()
    db.scalar.return_value = None

    with pytest.raises(PermissionError, match="DEVICE_BINDING_REQUIRED"):
        get_active_binding(db, 10, "android-10")


def test_admin_can_revoke_active_binding() -> None:
    db = Mock()
    binding = SimpleNamespace(
        status="ACTIVE",
        revoke_reason=None,
        revoked_at=None,
        updated_at=None,
    )
    db.get.return_value = binding
    actor = SimpleNamespace(status="ACTIVE", role="ADMIN", id=1)

    updated = update_device_status(db, 42, actor, "REVOKED", "Lost phone")

    assert updated.status == "REVOKED"
    assert updated.revoke_reason == "Lost phone"
    assert updated.revoked_at is not None
    db.commit.assert_called_once()


def test_terminal_binding_cannot_be_revoked_again() -> None:
    db = Mock()
    db.get.return_value = SimpleNamespace(status="REVOKED")
    actor = SimpleNamespace(status="ACTIVE", role="ADMIN", id=1)

    with pytest.raises(ValueError, match="already terminal"):
        update_device_status(db, 42, actor, "REVOKED", "Repeated request")
