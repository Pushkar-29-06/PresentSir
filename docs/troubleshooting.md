# Troubleshooting

## Health is OK but login says service unavailable

Check the frontend API URL:

```powershell
Get-Content E:\presentsir\web\.env.local
```

For local testing it should be:

```env
VITE_API_URL=http://localhost:8000
```

Restart Vite after changing environment variables:

```powershell
cd E:\presentsir\web
npm run dev -- --host 0.0.0.0 --port 5173
```

Then hard-refresh the browser with `Ctrl+Shift+R`.

## Registration window expired

Registration windows are one-time, user-specific, and short-lived. The default duration is 15 minutes. Ask an admin to open a new window, then register immediately.

An already active device cannot be replaced through a normal registration window. Use the device request/reset flow.

## Invalid registration signature

Use the latest frontend build. Browser ECDSA signatures are converted to the DER format expected by the backend. Clear the old page cache and reload after a frontend update.

## Camera access failed

- Use `http://localhost:5173` on the laptop or an HTTPS URL on a phone.
- Allow camera permission in browser site settings.
- Confirm the device has a camera.
- Make sure the page is not inside an insecure iframe.
- Use the manual code field if camera access is unavailable.

## QR token rejected

Use the complete current value:

```text
A1.<session_id>.<token>
```

Do not use only the token. Tokens rotate and are valid only for the current open session.

## Manual attendance save does nothing

For a row change:

- The session must be `CLOSED`, `SAVED`, or `SUBMITTED`.
- Choose a status.
- Enter a reason of at least five characters.
- Click **Save changes**.

For the session draft:

- The session must be `CLOSED`.
- Click **Save draft**.
- Then use **Submit final** from the `SAVED` state.

The review page displays the backend error detail after a failed request.

## Phone cannot open the site

Verify the laptop is listening on all interfaces:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5173,8000
```

Try the laptop's private IP:

```text
http://<laptop-private-ip>:5173
```

The phone and laptop must be on the same reachable network. Guest Wi-Fi, VPNs, mobile-data fallback, and router client isolation can prevent access.

## LocalTunnel returns 400/502/503

This usually indicates the temporary tunnel, not the application, has expired or lost its connection. Verify locally first:

```text
http://localhost:5173
http://localhost:8000/health
```

Use a stable HTTPS provider for repeatable demos and keep its process running.

## Port already in use

Find the process:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5173,8000
```

Stop only the specific process ID:

```powershell
Stop-Process -Id <PID>
```

## Tests fail after database changes

Start the containers and apply migrations:

```powershell
cd E:\presentsir\backend
docker compose up -d
alembic upgrade head
```

Then run:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

