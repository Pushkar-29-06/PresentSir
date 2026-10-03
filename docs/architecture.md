# Architecture

## Services

| Service | Port | Responsibility |
|---|---:|---|
| FastAPI API | 8000 | Authentication, devices, academics, attendance, analytics, admin |
| FastAPI WebSocket routes | 8000 | Live session and QR/count events |
| PostgreSQL | 5432 | Durable application data |
| Redis | 6379 | Challenges, nonce replay protection, token revocation, realtime support |
| Vite | 5173 | Development web server |
| React Native Metro | 8081 | Mobile development bundler |

The current deployment mounts WebSocket routes in the API process. A separate realtime process is not required for the current web flow.

## Request flow

```text
Student/Faculty/Admin client
          |
          v
      FastAPI :8000
       /       \
      v         v
 PostgreSQL   Redis
```

The web API client attaches the access token, refreshes once after a `401`, and clears the session if refresh fails.

## Core ownership rules

- Faculty can access only offerings they own.
- Faculty can create sessions only for valid active slots belonging to their offering.
- Students can submit only for their own account and enrolled offering.
- Device registration is authorized by an administrator-created registration window.
- Attendance submissions require an active device binding and a valid signature.
- Manual faculty edits require ownership, enrollment, an existing official record, and a reason.

## Attendance state machine

```text
SCHEDULED -> OPEN -> CLOSED -> SAVED -> SUBMITTED
     |         |
     v         v
 CANCELLED  CANCELLED
```

Lecture-time enforcement allows a session to open from `START_EARLY_MINUTES` before the scheduled start until the scheduled end.

## QR and signature flow

1. Faculty opens a session.
2. The API derives a rotating token from the session secret and current rotation step.
3. The Smart Board renders `A1.session_id.qr_token`.
4. The student scans or pastes that complete value.
5. The student signs `ATT1|session_id|qr_token|android_id|client_nonce`.
6. The API validates session state, enrollment, device binding, token step, signature, and nonce replay.
7. Closing the session creates official records and audit rows.

## Important implementation note

The original product specification describes Android-only attendance, but this repository also supports browser attendance because it is required for the current demonstration flow. Browser registration stores the private key in browser local storage; use this only for controlled demos and prefer the mobile client for production.

