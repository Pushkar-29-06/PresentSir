# Deployment

## Production principles

- Use managed PostgreSQL and Redis or protected private instances.
- Run the API behind HTTPS.
- Use a reverse proxy for the web application and API.
- Store secrets in the deployment platform, never in Git.
- Set exact production `CORS_ORIGINS`.
- Set `ENFORCE_LECTURE_TIME=true`.
- Replace all demo credentials and seed data.
- Disable or protect interactive API docs in production if required by policy.

## Backend environment

Start from [`backend/.env.example`](../backend/.env.example). Required values include:

```env
DATABASE_URL=postgresql+psycopg://user:password@host:5432/attendance
REDIS_URL=redis://:password@host:6379/0
JWT_SECRET=<long-random-secret>
CORS_ORIGINS=https://web.example.com
API_PORT=8000
REALTIME_PORT=8008
ENFORCE_LECTURE_TIME=true
```

Run migrations during deployment:

```powershell
alembic upgrade head
```

Start the API:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Web deployment

Set the API origin at build time:

```env
VITE_API_URL=https://api.example.com
```

Build:

```powershell
cd web
npm ci
npm run build
```

Serve `web/dist` with a static host or reverse proxy.

## HTTPS and camera access

Camera access and browser cryptography require a secure context. Use HTTPS for phone demonstrations. A temporary tunnel can be useful for testing but is not a production deployment; tunnel URLs can expire and change.

The frontend and backend origins must be updated together:

1. Set `VITE_API_URL` to the HTTPS API origin.
2. Add the exact frontend HTTPS origin to `CORS_ORIGINS`.
3. Restart/rebuild the frontend and restart the API.
4. Verify `GET /health` and a login request.

## Reverse proxy outline

```text
https://web.example.com       -> web static files
https://api.example.com      -> FastAPI :8000
wss://api.example.com/ws/... -> FastAPI WebSocket :8000
```

Forward the `Upgrade` and `Connection` headers for WebSocket traffic.

