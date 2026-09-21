# I3B QR Attendance

The student mobile QR path now uses `react-native-vision-camera` and follows
the latency-critical sequence:

```text
QR decode
  -> UUID nonce
  -> ATT1 signature payload
  -> biometric prompt
  -> POST /attendance/submissions
```

The scanner:

- requests camera permission
- accepts only `A1.{session_id}.{qr_token}` values
- uses a square full-screen viewfinder
- stops the camera immediately after the first valid decode
- provides torch and cancel controls
- gives haptic feedback on decode
- reuses the same nonce, payload, and signature for a network retry

The backend submission proof helper is aligned to the same
`ATT1|{session_id}|{qr_token}|{android_id}|{client_nonce}` payload.
