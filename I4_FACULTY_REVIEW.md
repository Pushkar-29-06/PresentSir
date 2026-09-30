# I4 Faculty Attendance Review

The faculty review route is available at:

```text
/faculty/sessions/:id/review
```

It uses the existing attendance APIs for roster loading, manual attendance
edits, save-draft, and final submission:

- `GET /attendance/sessions/{id}`
- `GET /attendance/sessions/{id}/roster`
- `PATCH /attendance/sessions/{id}/records/{student_id}`
- `POST /attendance/sessions/{id}/SAVED`
- `POST /attendance/sessions/{id}/SUBMITTED`

The page supports roster filters for all, present, absent, manual, and flagged
records; headcount comparison; mandatory five-character edit reasons; draft
save; final-submit confirmation; and post-submit corrections through the same
reason-required edit endpoint. Submitted sessions are presented as read-only
except for explicitly initiated corrections.

## Pending acceptance validation

```text
PENDING — Android physical E2E

Requires:
- Android emulator or physical device
- adb
- native mobile/android project
- camera capability
- biometric-capable device/emulator
```
