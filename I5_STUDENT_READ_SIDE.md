# I5 Student Attendance and Analytics

Student read-side surfaces are available on both clients:

- Web: `/student/attendance`
- Web: `/student/analytics`
- Mobile: Attendance and Analytics tiles in the student home

Attendance history is served by the student-scoped
`GET /attendance/students/me/history` endpoint. Aggregate and trend data use
the existing student analytics services. Disputes are submitted through the
existing `POST /attendance/records/{record_id}/disputes` endpoint.

The web attendance page displays the fixed notice:

> Attendance can only be marked from the PresentSir mobile app.

No web attendance-marking or QR-scanning action is exposed.

The faculty lifecycle remains unchanged:

```text
CLOSED -> SAVED -> SUBMITTED -> read-only -> correction with reason
```

## Pending physical validation

```text
PENDING — Android physical E2E

Requires:
- Android emulator or physical device
- adb
- native mobile/android project
- camera capability
- biometric-capable device/emulator
```
