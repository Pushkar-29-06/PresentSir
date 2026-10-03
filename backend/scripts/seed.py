"""Seed local development users for PresentSir."""

import sys
from datetime import date
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.core.security import hash_password
from app.db import SessionLocal
from app.models.academic import Course, Department, Enrollment, Offering, Term
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
    *[
        {
            "login_id": f"student{number:03d}",
            "password": f"Student@{number + 122}",
            "role": "STUDENT",
            "name": name,
            "email": f"student{number:03d}@presentsir.local",
            "phone": f"90000000{number:02d}",
            "status": "ACTIVE",
            "roll_no": f"{number:03d}",
            "prn": f"DEMO-STUDENT-{number:03d}",
        }
        for number, name in (
            (2, "Aarav Sharma"),
            (3, "Diya Patel"),
            (4, "Rohan Mehta"),
            (5, "Ananya Iyer"),
            (6, "Vikram Singh"),
        )
    ],
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
        department = db.scalar(select(Department).where(Department.code == "CSE"))
        if department is None:
            department = Department(code="CSE", name="Computer Science and Engineering")
            db.add(department)
            db.flush()

        term = db.scalar(select(Term).where(Term.name == "2026-27 Semester 1"))
        if term is None:
            term = Term(
                name="2026-27 Semester 1",
                start_date=date(2026, 7, 1),
                end_date=date(2026, 12, 31),
                is_current=True,
            )
            db.add(term)
            db.flush()

        course = db.scalar(select(Course).where(Course.code == "CS101"))
        if course is None:
            course = Course(
                code="CS101",
                name="Introduction to Computer Science",
                department_id=department.id,
                semester=1,
                credits=4,
            )
            db.add(course)
            db.flush()

        for data in DEMO_USERS:
            existing = db.scalar(
                select(User).where(User.login_id == data["login_id"])
            )

            if existing:
                if existing.role == "FACULTY" and existing.department_id is None:
                    existing.department_id = department.id
                print(f"[ok] {data['role']} already exists: {data['login_id']}")
                continue

            user = User(
                role=data["role"],
                login_id=data["login_id"],
                password_hash=hash_password(data["password"]),
                name=data["name"],
                email=data["email"],
                phone=data["phone"],
                department_id=department.id,
                status=data["status"],
            )

            db.add(user)
            db.flush()

            if data["role"] == "STUDENT":
                db.add(
                    Student(
                        user_id=user.id,
                        roll_no=data.get("roll_no", "001"),
                        prn=data.get("prn", "DEMO-STUDENT-001"),
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

            print(f"[ok] Created {data['role']}: {data['login_id']}")

        db.flush()
        faculty = db.scalar(select(User).where(User.login_id == "faculty001"))
        students = db.scalars(
            select(User).where(
                User.role == "STUDENT",
                User.login_id.like("student%"),
            )
        ).all()
        if faculty is not None:
            offering = db.scalar(
                select(Offering).where(
                    Offering.course_id == course.id,
                    Offering.faculty_id == faculty.id,
                    Offering.term_id == term.id,
                )
            )
            if offering is None:
                offering = Offering(
                    course_id=course.id,
                    faculty_id=faculty.id,
                    term_id=term.id,
                    division="A",
                    batch="2026-2030",
                )
                db.add(offering)
                db.flush()
                print(f"[ok] Created faculty offering for {faculty.login_id}")

            for student in students:
                if db.scalar(
                    select(Enrollment).where(
                        Enrollment.offering_id == offering.id,
                        Enrollment.student_id == student.id,
                    )
                ) is None:
                    db.add(Enrollment(offering_id=offering.id, student_id=student.id))
                    print(f"[ok] Enrolled {student.login_id} in offering {offering.id}")

        db.commit()


if __name__ == "__main__":
    seed_users()