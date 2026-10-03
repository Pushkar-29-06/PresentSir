# PresentSir

PresentSir is a smart attendance platform with a FastAPI backend, React/Vite web application, React Native mobile client, PostgreSQL, and Redis.

It supports:

- Role-based authentication for students, faculty, and administrators.
- Faculty-owned courses, offerings, timetable slots, and attendance sessions.
- Rotating QR attendance with signed device submissions.
- Browser-based student attendance with QR camera scanning or manual code entry.
- Faculty roster review and manual attendance corrections with audit history.
- Student attendance history and analytics.
- Device registration windows and public-key proof of possession.
- Risk flags, disputes, notifications, assessments, policy, and reporting APIs.

## Project layout

```text
PresentSir/
├── backend/              FastAPI API, SQLAlchemy models, Alembic migrations
├── web/                  React + Vite website
├── mobile/               React Native Android/iOS client
├── PresentSirNative/     Additional React Native project assets
├── docs/                 Setup, architecture, API, demo, deployment guides
├── FRONTEND_FOUNDATION.md
└── backend/BACKEND_SPEC_COMPLIANCE_MATRIX.md
```

## Requirements

- Windows, macOS, or Linux.
- Python 3.11+.
- Node.js 20+ and npm.
- Docker Desktop with Compose.
- PostgreSQL and Redis are normally supplied by Docker.
- A real HTTPS origin is required for phone camera and Web Crypto features. `localhost` is treated as secure by modern browsers; a LAN HTTP address generally is not.

## Quick start on Windows

Open three PowerShell windows.

### 1. Start PostgreSQL and Redis

```powershell
cd E:\presentsir\backend
docker compose up -d
```

### 2. Prepare and start the backend

```powershell
cd E:\presentsir\backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
python scripts\seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Verify it:

```text
http://localhost:8000/health
http://localhost:8000/docs
```

Expected health response:

```json
{"status":"ok"}
```

### 3. Start the web application

```powershell
cd E:\presentsir\web
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open:

```text
http://localhost:5173
```

The local web configuration is stored in [`web/.env.local`](./web/.env.local). For local development it should contain:

```env
VITE_API_URL=http://localhost:8000
```

## Demo accounts

These accounts are created by the development seed only. Change or remove them before production.

| Role | Login ID | Password |
|---|---|---|
| Student | `student001` | `Student@123` |
| Student | `student002` | `Student@124` |
| Student | `student003` | `Student@125` |
| Student | `student004` | `Student@126` |
| Student | `student005` | `Student@127` |
| Student | `student006` | `Student@128` |
| Faculty | `faculty001` | `Faculty@123` |
| Admin | `admin001` | `Admin@123` |

The seed creates the CS101 offering owned by `faculty001`, creates demo enrollment, and is safe to run repeatedly.

## Attendance demonstration

1. Sign in as `faculty001`.
2. Open **Faculty sessions**.
3. Select the faculty-owned offering.
4. Add or select a slot.
5. Create a session for the current lecture time.
6. Start the session.
7. Open **Smart board**.
8. Students either scan the QR code or paste the complete manual code:

   ```text
   A1.<session_id>.<rotating_token>
   ```

9. Students must have a registered browser/device before submitting.
10. Close the session to generate official `PRESENT` and `ABSENT` records.
11. Open **Review** to change a record manually. A reason of at least five characters is required.
12. Click **Save draft**, then **Submit final** when the roster is complete.

Manual edits use source `MANUAL`. QR submissions become source `SCAN`. Every official record change writes an attendance audit entry.

See [`docs/attendance-demo.md`](./docs/attendance-demo.md) for the complete flow and validation checklist.

## Tests and builds

Backend:

```powershell
cd E:\presentsir\backend
.\.venv\Scripts\python.exe -m pytest -q
```

Web typecheck/build:

```powershell
cd E:\presentsir\web
npm run lint
npm run build
```

Mobile typecheck:

```powershell
cd E:\presentsir\mobile
npm run typecheck
```

## API overview

The current application uses root paths rather than an `/api/v1` prefix.

| Area | Example routes |
|---|---|
| Health | `GET /health` |
| Authentication | `POST /auth/login`, `POST /auth/refresh`, `GET /me` |
| Faculty data | `GET /faculty/offerings`, `POST /faculty/slots` |
| Sessions | `POST /attendance/sessions`, `POST /attendance/sessions/{id}/start` |
| QR | `GET /attendance/sessions/{id}/qr` |
| Student submission | `POST /attendance/submissions` |
| Roster | `GET /attendance/sessions/{id}/roster` |
| Manual edit | `PATCH /attendance/sessions/{id}/records/{student_id}` |
| Analytics | `/analytics/...` |
| WebSocket | `/ws/sessions/{id}` |

The generated OpenAPI document is available at `http://localhost:8000/openapi.json`.

## Phone and HTTPS access

For a phone, prefer an HTTPS tunnel or a properly configured reverse proxy. Temporary LocalTunnel URLs can expire or return `400`, `502`, or `503` even when the local application is healthy.

For a LAN-only test:

```text
http://<laptop-private-ip>:5173
```

Both devices must be on the same reachable private network, and Windows Firewall must allow the required ports. Camera access may still require HTTPS.

See [`docs/deployment.md`](./docs/deployment.md) and [`docs/troubleshooting.md`](./docs/troubleshooting.md).

## Security notes

- Never commit `.env`, private keys, JWTs, refresh tokens, or real student data.
- Use a generated `JWT_SECRET` in every non-demo environment.
- Keep `ENFORCE_LECTURE_TIME=true` outside controlled demonstrations.
- Use HTTPS in production.
- Restrict `CORS_ORIGINS` to exact trusted origins.
- Demo passwords are for local development only.

## Documentation

- [`docs/quickstart.md`](./docs/quickstart.md) — installation and daily startup.
- [`docs/architecture.md`](./docs/architecture.md) — services, data flow, and state machine.
- [`docs/api.md`](./docs/api.md) — endpoint contracts and examples.
- [`docs/attendance-demo.md`](./docs/attendance-demo.md) — end-to-end attendance demonstration.
- [`docs/deployment.md`](./docs/deployment.md) — production and HTTPS deployment guidance.
- [`docs/mobile.md`](./docs/mobile.md) — React Native setup and real-device testing.
- [`docs/troubleshooting.md`](./docs/troubleshooting.md) — common failures and fixes.
- [`backend/BACKEND_SPEC_COMPLIANCE_MATRIX.md`](./backend/BACKEND_SPEC_COMPLIANCE_MATRIX.md) — implementation audit matrix.
