# Phase F Security, Integration, and Compliance Audit

## Verification status

- `python -m pytest -q`: 23 passed
- `python -m compileall app tests`: passed
- `python -m alembic check`: no new upgrade operations detected
- SQLAlchemy metadata: 19 tables
- Applied Alembic revision: `f93f2ab9f8a2_initial_schema`

## Security coverage

The test suite covers:

- Access/refresh token type separation.
- Revoked access-token rejection.
- Role authorization rejection.
- Active and revoked device binding behavior.
- Device ownership protection.
- Replacement approval and registration-window lifecycle.
- Invalid signatures and replay protection.
- Duplicate attendance submission rejection.
- QR current-step and grace-step boundaries.
- Closed-session QR rejection.
- Attendance state transitions and transactional close behavior.
- Manual edit auditing, including `POST_SUBMIT_EDIT`.
- Dispute ownership and resolution behavior.

The audit-log append-only protection is installed by the baseline migration
with a PostgreSQL trigger that rejects updates and deletes.

## Authorization boundary

- Students are restricted to their own analytics and attendance data.
- Faculty access is restricted to owned offerings and sessions.
- Faculty-only review and risk endpoints reject students.
- Admin-only institution analytics and device administration reject other roles.

## Known verification limitation

The repository does not currently contain a dedicated TestClient integration
fixture that provisions isolated PostgreSQL and Redis data for a complete
HTTP login-to-submit flow. Existing coverage validates the service pipeline
and security invariants directly; live HTTP integration coverage should be
added when an isolated integration-test database/Redis fixture is introduced.

## Assessment schema status

The assessment schema was deliberately added in the separate Phase G
migration. `assessment_scores` has no primary key or uniqueness constraint
because the supplied definition does not specify one. Marks analytics is now
backed by persisted assessment scores.
