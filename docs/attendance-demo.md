# Attendance demonstration

This guide tests slot creation, QR attendance, manual entry, review, and audit behavior.

## Accounts

Use `faculty001 / Faculty@123`, `admin001 / Admin@123`, and the seeded student accounts listed in the root README.

## Create a slot

1. Sign in as faculty.
2. Open **Faculty sessions**.
3. Choose the owned CS101 offering.
4. Enter a valid day, start time, end time, and room.
5. Click **Add slot**.

The slot must have an end time after its start time and must belong to the faculty member's offering.

## Start a session

1. Select the slot.
2. Choose the current date.
3. Create the scheduled session.
4. Start it within the lecture-time window.
5. Open the Smart Board.

The Smart Board shows a QR code and the complete manual attendance code. The code rotates, so students should use the current displayed value.

## Register a student device

1. Sign in as admin.
2. Open a registration window for the target student's user ID.
3. Sign in as the student.
4. Select **Register this browser** or register the mobile device.
5. Complete registration before the window expires.

The browser requires Web Crypto and should be served from `localhost` or HTTPS.

## Submit attendance

### QR path

1. Student opens **Attendance**.
2. Selects **Scan QR with camera**.
3. Allows camera permission.
4. Scans the Smart Board QR.
5. Submits the attendance.

### Manual code path

1. Copy the complete code from the Smart Board:

   ```text
   A1.<session_id>.<rotating_token>
   ```

2. Paste it in **Or paste QR value**.
3. Submit attendance.

The token must belong to the current open session and offering.

## Close and review

1. Faculty closes the session.
2. The backend creates `PRESENT` records for successful submissions.
3. Enrolled students without submissions become `ABSENT`.
4. Open **Review**.
5. Click **Change** for a student.
6. Select the new status.
7. Enter a reason with at least five characters.
8. Click **Save changes**.
9. Click **Save draft**.
10. Click **Submit final** when ready.

## Expected sources

| Action | Record source |
|---|---|
| Successful QR/manual-code submission | `SCAN` |
| Automatic record after close without submission | `SYSTEM` |
| Faculty correction | `MANUAL` |

## Validation checklist

- A faculty member cannot use another faculty member's offering.
- A student outside the offering cannot submit.
- An expired or wrong-session token is rejected.
- Duplicate nonce/submission is rejected.
- A manual edit without a reason is rejected.
- Every official record creation and edit has an audit log row.
- Student history shows only closed/saved/submitted sessions.

