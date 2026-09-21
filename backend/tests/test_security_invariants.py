from types import SimpleNamespace

import jwt
import pytest
from fastapi import HTTPException

from app.core import dependencies
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.risk.rules import RULES, pair_affinity_qualifies


def test_access_and_refresh_tokens_are_type_scoped():
    access, _ = create_access_token(101)
    refresh, _ = create_refresh_token(101)

    assert decode_token(access, expected_type="access")["sub"] == "101"
    assert decode_token(refresh, expected_type="refresh")["sub"] == "101"

    with pytest.raises(jwt.InvalidTokenError):
        decode_token(access, expected_type="refresh")
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(refresh, expected_type="access")


def test_revoked_access_token_is_rejected(monkeypatch):
    token, _ = create_access_token(101)
    monkeypatch.setattr(dependencies, "is_token_revoked", lambda _: True)

    with pytest.raises(HTTPException) as error:
        dependencies.get_current_token(token)

    assert error.value.status_code == 401


def test_role_dependency_rejects_wrong_role():
    dependency = dependencies.require_roles("FACULTY")

    with pytest.raises(HTTPException) as error:
        dependency(SimpleNamespace(role="STUDENT"))

    assert error.value.status_code == 403


def test_pair_risk_rule_uses_central_configuration():
    assert pair_affinity_qualifies(
        RULES.pair_min_sessions,
        int(RULES.pair_min_sessions * RULES.pair_close_ratio),
    )
    assert not pair_affinity_qualifies(RULES.pair_min_sessions - 1, 10)
