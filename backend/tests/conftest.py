import os
import subprocess
import time
from pathlib import Path

import pytest
import redis
from sqlalchemy import create_engine, text


BACKEND = Path(__file__).resolve().parents[1]
COMPOSE_FILE = BACKEND / "docker-compose.test.yml"
PROJECT = "attendance_backend_pytest"
DATABASE_URL = "postgresql+psycopg://test_att:test_att@localhost:55432/attendance_test"
REDIS_URL = "redis://:testpass@localhost:56379/0"


def _compose(*args: str) -> None:
    subprocess.run(
        ["docker", "compose", "-p", PROJECT, "-f", str(COMPOSE_FILE), *args],
        cwd=BACKEND,
        check=True,
        capture_output=True,
        text=True,
    )


def _wait_for_services() -> None:
    deadline = time.monotonic() + 90
    last_error = ""
    while time.monotonic() < deadline:
        try:
            engine = create_engine(DATABASE_URL, pool_pre_ping=True)
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            engine.dispose()
            client = redis.Redis.from_url(REDIS_URL)
            client.ping()
            client.close()
            return
        except Exception as exc:
            last_error = str(exc)
            time.sleep(1)
    raise RuntimeError(f"Test services did not become ready: {last_error}")


def pytest_configure() -> None:
    os.environ["DATABASE_URL"] = DATABASE_URL
    os.environ["REDIS_URL"] = REDIS_URL
    _compose("up", "-d", "--wait")
    _wait_for_services()
    subprocess.run(
        [str(BACKEND / ".venv" / "Scripts" / "python.exe"), "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND,
        check=True,
    )


def pytest_unconfigure() -> None:
    _compose("down", "-v", "--remove-orphans")
