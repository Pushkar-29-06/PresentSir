# Quickstart

## Prerequisites

Install Python 3.11+, Node.js 20+, npm, and Docker Desktop. Start Docker Desktop before starting the project services.

## First setup

```powershell
cd E:\presentsir\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and replace `JWT_SECRET=change-me` with a long random value. Do not commit `.env`.

Install the web dependencies:

```powershell
cd E:\presentsir\web
npm install
```

Install mobile dependencies only when working on the React Native client:

```powershell
cd E:\presentsir\mobile
npm install
```

## Start services

```powershell
cd E:\presentsir\backend
docker compose up -d
alembic upgrade head
python scripts\seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In another terminal:

```powershell
cd E:\presentsir\web
npm run dev -- --host 0.0.0.0 --port 5173
```

## Stop services

Stop the frontend and backend with `Ctrl+C`, then:

```powershell
cd E:\presentsir\backend
docker compose down
```

Use `docker compose down -v` only when intentionally deleting the local database volume.

## Useful checks

```powershell
Invoke-WebRequest http://localhost:8000/health
Get-NetTCPConnection -State Listen -LocalPort 8000,5173
docker compose ps
```

