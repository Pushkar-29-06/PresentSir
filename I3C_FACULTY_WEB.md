# I3C Faculty Web

The faculty web flow now exposes:

- `/faculty/slots` for owned offering slots, creation, editing, and activation state.
- `/faculty/sessions` for selecting a slot, date, topic, and creating a scheduled session.
- `/faculty/sessions/:id/board` for the classroom smart board.

The board wraps the backend token in the mobile-compatible payload
`A1.{session_id}.{qr_token}`, renders the QR locally, refreshes the token and
session state every two seconds, and uses `/ws/sessions/{id}` when available.
It never requests or renders student names. If the socket disconnects, the
two-second polling loop remains active.

## Explicit contract change

The submission proof is intentionally aligned across clients and backend:

```text
ATT1|{session_id}|{qr_token}|{android_id}|{client_nonce}
```

This is a versioned backend contract change, not an internal implementation
detail. The backend regression suite covers the exact byte representation.
