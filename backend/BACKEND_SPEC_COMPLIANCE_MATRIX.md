# Backend Specification Compliance Matrix

**Audit date:** 2026-09-21  
**Applied migration:** `f93f2ab9f8a2_initial_schema`  
**Baseline policy:** The 19-table migration is immutable. No schema was added
or inferred during this audit.

## Evidence boundary

`BACKEND_SPEC.md` is not present as a physical file under the workspace.
This matrix therefore distinguishes:

- **Verified**: demonstrated by the current models, migration, routes, or tests.
- **Gap**: the broader supplied specification names an item absent from the
  applied baseline.
- **Unverified**: exact specification wording cannot be compared locally.

## 1. Tables

| Specification area | Current baseline | Status |
|---|---|---|
| `users`, `students`, `faculty`, `departments` | Present | Verified |
| `terms`, `courses`, `offerings`, `enrollments`, `slots` | Present | Verified |
| `device_bindings`, `registration_windows`, `device_requests` | Present | Verified |
| `attendance_sessions`, `attendance_submissions`, `attendance_records`, `attendance_audit_log` | Present | Verified |
| `flags`, `pair_cooccurrence`, `attendance_disputes` | Present | Verified |
| `assessments` | Absent | Gap |
| `assessment_scores` | Absent | Gap |
| `policies` | Absent | Gap |
| `notifications` | Absent | Gap |
| `refresh_tokens` | Absent; refresh tokens are currently JWT-based | Gap |

The current SQLAlchemy metadata and migration contain exactly 19 tables.

## 2. Columns, nullability, and types

| Area | Result |
|---|---|
| Academic model fields supplied during implementation | Verified against the supplied field definitions |
| Identity model fields (`login_id`, `status`, name/contact fields) | Verified in models and migration |
| Device lifecycle fields and timestamps | Verified |
| Attendance submission capture fields | Verified |
| JSON/JSONB risk fields | Verified |
| UTC-aware timestamp columns | Verified where timestamps are modeled |
| Exact full-spec column inventory and nullability | Unverified because the source document is not local |
| Assessment, policy, notification, and refresh-token columns | Gap |

## 3. Foreign keys and ownership

Verified foreign-key targets include:

- `courses.department_id -> departments.id`
- `offerings.course_id -> courses.id`
- `offerings.faculty_id -> faculty.user_id`
- `offerings.term_id -> terms.id`
- `enrollments.offering_id -> offerings.id`
- `enrollments.student_id -> students.user_id`
- `attendance_sessions.offering_id -> offerings.id`
- Attendance records/submissions/audit rows -> sessions and students
- Device, registration, and request ownership -> users

Service-level ownership checks are implemented for faculty offerings/sessions,
student attendance access, student disputes, and device registration.

Exact `ON DELETE` behavior remains **unverified** against the unavailable local
specification.

## 4. Constraints and indexes

Verified:

- Unique `users.login_id`
- Composite primary key on `enrollments`
- Composite primary key on `pair_cooccurrence`
- Unique `(session_id, student_id)` on submissions
- Unique `(session_id, student_id)` on official records
- `student_a < student_b` check on pair co-occurrence
- Partial unique active-device indexes on `user_id`, `android_id`, and
  `public_key`
- PostgreSQL append-only trigger for `attendance_audit_log`

Exact full-spec constraint inventory is **unverified** without the source file.

## 5. Status values

Implemented application status sets:

- Device bindings: `ACTIVE`, `PENDING`, `INVALIDATED`, `REVOKED`
- Device requests: `NEW_PHONE`, `BIOMETRIC_RESET`, `REINSTALL_REVIEW`
- Device request decisions: `PENDING`, `APPROVED`, `REJECTED`
- Attendance sessions: `SCHEDULED`, `OPEN`, `CLOSED`, `SAVED`, `SUBMITTED`,
  `CANCELLED`
- Attendance records: `PRESENT`, `ABSENT`, `EXCUSED`
- Disputes: `OPEN`, `ACCEPTED`, `REJECTED`
- User status: `ACTIVE`, `DISABLED` is supported as a stored value

These values are enforced in service logic rather than PostgreSQL enum types.
Exact allowed-value comparison with the unavailable specification remains
**unverified**.

## 6. Implemented endpoints

### Authentication

| Method | Path | Authorization |
|---|---|---|
| `POST` | `/auth/login` | Public |
| `POST` | `/auth/refresh` | Refresh token |
| `POST` | `/auth/logout` | Authenticated user |

### Device lifecycle

| Method | Path | Authorization |
|---|---|---|
| `POST` | `/device/registration-window` | Admin |
| `POST` | `/device/register/challenge` | Authenticated user |
| `POST` | `/device/register` | Authenticated user |
| `POST` | `/device/bindings/{device_id}/revoke` | Admin |
| `POST` | `/device/bindings/{device_id}/invalidate` | Admin |
| `POST` | `/device/requests` | Authenticated user |
| `POST` | `/device/requests/{request_id}/decision` | Admin |

### Attendance and review

| Method | Path | Authorization |
|---|---|---|
| `POST` | `/attendance/sessions` | Faculty |
| `POST` | `/attendance/sessions/{session_id}/start` | Owning faculty |
| `POST` | `/attendance/sessions/{session_id}/{target}` | Owning faculty |
| `GET` | `/attendance/sessions/{session_id}/qr` | Owning faculty |
| `POST` | `/attendance/submissions` | Student with active device |
| `GET` | `/attendance/sessions/{session_id}/roster` | Owning faculty |
| `PATCH` | `/attendance/sessions/{session_id}/records/{student_id}` | Owning faculty |
| `POST` | `/attendance/records/{record_id}/disputes` | Owning student |
| `POST` | `/attendance/disputes/{dispute_id}/decision` | Owning faculty |

### Analytics

Analytics routes are present for student attendance, overview, trends,
offering summaries, early warnings, risk queue/statistics, institution
analytics, and attendance reports. Exact path/contract comparison remains
**unverified** without the local specification.

## 7. Request and response contracts

Pydantic request/response schemas exist for authentication, device operations,
attendance sessions/submissions/review, disputes, and analytics.

Verified validation includes:

- Required login and password
- Android ID length constraints
- Registration challenge and signature fields
- Submission nonce minimum length
- Manual-edit reason minimum length of five characters
- Analytics report date ordering

Exact required/optional field comparison is **unverified** without
`BACKEND_SPEC.md`.

## 8. Attendance state machine

Implemented transitions:

```text
SCHEDULED -> OPEN
SCHEDULED -> CANCELLED
OPEN      -> CLOSED
OPEN      -> CANCELLED
CLOSED    -> SAVED
SAVED     -> SUBMITTED
```

`SUBMITTED` and `CANCELLED` are terminal in the ordinary transition service.
Manual attendance edits are allowed in `CLOSED`, `SAVED`, and `SUBMITTED`;
submitted edits use `POST_SUBMIT_EDIT`.

## 9. Risk rules

Centralized in `app/risk/rules.py`:

- Headcount mismatch score: `30`
- Pair-affinity score: `35`
- Minimum pair sessions: `5`
- Minimum close ratio: `0.60`
- Close-cooccurrence window: `2` seconds
- Shortage threshold: `75%`

The close workflow and analytics use the shared risk service/configuration.
Exact comparison with every specification rule and weight remains
**unverified** without the source document.

## 10. Audit and security

Verified:

- Password hashing uses Argon2.
- JWT access and refresh tokens are type-scoped.
- Redis-backed token revocation is used.
- Redis-backed nonce replay protection is used.
- Active device binding is required for device-authenticated attendance.
- Invalidated/revoked bindings are rejected.
- Public-key proof of possession is verified.
- QR current-step and configured grace-step validation is enforced.
- Duplicate submissions are rejected by both application flow and database
  uniqueness.
- Faculty offering/session ownership is checked.
- Student record/dispute ownership is checked.
- Attendance audit rows are written with official record mutations.
- PostgreSQL trigger rejects updates/deletes on `attendance_audit_log`.

The exact complete mutation-to-audit event inventory is **unverified** without
the local specification.

## 11. Known limitations and unresolved gaps

| Item | Status |
|---|---|
| Live isolated TestClient + PostgreSQL + Redis fixture | Not implemented |
| `assessments` table | Absent |
| `assessment_scores` table | Absent |
| Marks analytics | Unavailable |
| `policies` table | Absent |
| `notifications` table | Absent; shortage events currently use application logging |
| `refresh_tokens` table | Absent; refresh tokens are JWT-based |
| Physical `BACKEND_SPEC.md` for exact comparison | Unavailable in workspace |

## Gate result

The implementation is **not specification-complete**. The 19-table baseline
and implemented services pass the available verification, but the final gate
is blocked by the unresolved assessment/assessment-score gap, additional
broader-spec tables, absent live integration fixtures, and inability to perform
an exact local `BACKEND_SPEC.md` comparison.
