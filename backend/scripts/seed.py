"""Seed local development users for PresentSir."""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.core.security import hash_password
from app.db import SessionLocal
from app.models.user import User, Student, Faculty


DEMO_USERS = [
    {
        "login_id": "student001",
        "password": "Student@123",
        "role": "STUDENT",
        "name": "Demo Student",
        "email": "student001@presentsir.local",
        "phone": "9000000001",
        "status": "ACTIVE",
    },
    {
        "login_id": "faculty001",
        "password": "Faculty@123",
        "role": "FACULTY",
        "name": "Demo Faculty",
        "email": "faculty001@presentsir.local",
        "phone": "9000000002",
        "status": "ACTIVE",
    },
    {
        "login_id": "admin001",
        "password": "Admin@123",
        "role": "ADMIN",
        "name": "Demo Admin",
        "email": "admin001@presentsir.local",
        "phone": "9000000003",
        "status": "ACTIVE",
    },
]


def seed_users():
    with SessionLocal() as db:
        for data in DEMO_USERS:
            existing = db.scalar(
                select(User).where(User.login_id == data["login_id"])
            )

            if existing:
                print(f"✓ {data['role']} already exists: {data['login_id']}")
                continue

            user = User(
                role=data["role"],
                login_id=data["login_id"],
                password_hash=hash_password(data["password"]),
                name=data["name"],
                email=data["email"],
                phone=data["phone"],
                status=data["status"],
            )

            db.add(user)
            db.flush()

            if data["role"] == "STUDENT":
                db.add(
                    Student(
                        user_id=user.id,
                        roll_no="001",
                        prn="DEMO-STUDENT-001",
                        semester=5,
                        division="C",
                        batch="2024-2028",
                    )
                )

            elif data["role"] == "FACULTY":
                db.add(
                    Faculty(
                        user_id=user.id,
                        employee_no="DEMO-FAC-001",
                        designation="Assistant Professor",
                    )
                )

            print(f"✓ Created {data['role']}: {data['login_id']}")

        db.commit()


if __name__ == "__main__":
    seed_users()