from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db import SessionLocal
from app.main import app
from app.models.user import User
from app.models.refresh_token import RefreshToken


def test_http_auth_refresh_rotation_and_logout() -> None:
    db: Session = SessionLocal()
    user = User(
        id=9001,
        role="STUDENT",
        login_id="integration-student",
        password_hash=hash_password("integration-password"),
        name="Integration Student",
        email="integration@example.test",
        phone="0000000000",
        status="ACTIVE",
    )
    db.add(user)
    db.commit()
    db.close()

    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert client.get("/me").status_code == 401

        login = client.post(
            "/auth/login",
            json={
                "login_id": "integration-student",
                "password": "integration-password",
            },
        )
        assert login.status_code == 200
        first = login.json()
        assert first["token_type"] == "bearer"

        me = client.get(
            "/me",
            headers={"Authorization": f"Bearer {first['access_token']}"},
        )
        assert me.status_code == 200
        assert me.json()["role"] == "STUDENT"
        assert me.json()["user"]["login_id"] == "integration-student"
        assert "password_hash" not in me.json()["user"]

        refreshed = client.post(
            "/auth/refresh",
            json={"refresh_token": first["refresh_token"]},
        )
        assert refreshed.status_code == 200
        second = refreshed.json()
        assert second["refresh_token"] != first["refresh_token"]

        old_refresh = client.post(
            "/auth/refresh",
            json={"refresh_token": first["refresh_token"]},
        )
        assert old_refresh.status_code == 401

        logout = client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {second['access_token']}"},
            json={"refresh_token": second["refresh_token"]},
        )
        assert logout.status_code == 204

        revoked_access = client.get(
            "/analytics/students/9001/overview",
            headers={"Authorization": f"Bearer {second['access_token']}"},
        )
        assert revoked_access.status_code == 401

    db = SessionLocal()
    records = db.query(RefreshToken).filter(RefreshToken.user_id == 9001).all()
    assert len(records) == 2
    assert all(record.token_hash for record in records)
    assert all(record.revoked_at is not None for record in records)
    db.query(RefreshToken).filter(RefreshToken.user_id == 9001).delete()
    db.query(User).filter(User.id == 9001).delete()
    db.commit()
    db.close()
