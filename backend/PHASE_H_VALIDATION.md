# Phase H Production and End-to-End Validation

## Isolated infrastructure

Pytest provisions a dedicated Docker Compose project from
`docker-compose.test.yml`:

- PostgreSQL 16 on host port `55432`
- Redis 7 on host port `56379`
- ephemeral PostgreSQL storage
- automatic migration application before test collection
- automatic Compose teardown after the test session

The isolated environment is configured by `tests/conftest.py`; tests do not
use the development database or Redis instance.

## HTTP validation

`tests/test_http_integration.py` verifies through FastAPI `TestClient`:

- health endpoint
- login
- refresh-token rotation
- previous refresh-token rejection
- logout
- revoked access-token rejection
- hashed refresh-token persistence and revocation

The existing service tests continue to cover device registration, attendance
session/submission/close/review, risk rules, and Phase G assessment/policy
schema behavior.

## Final gate

- `python -m pytest -q`: **26 passed**
- `python -m compileall -q app tests`: **passed**
- `python -m alembic check`: **No new upgrade operations detected**
- PostgreSQL tables: **24**
- Alembic revisions: **2**
- Schema drift: **0**
- Unapproved tables: **0**

The test run emits dependency deprecation warnings from Starlette/httpx and
Redis `setex`; these do not fail the gate.

## API contract freeze

The backend API contract is frozen after Phase H. Future changes require an
explicit contract change review covering routes, authorization, request and
response schemas, persistence effects, migrations, and regression tests.
