# I7 Admin Workspace

Admin routes are available under:

```text
/admin/users
/admin/requests
/admin/policy
/admin/institution
/admin/audit
```

The workspace uses the existing policy, device, and institution analytics
contracts and adds admin-scoped read APIs for users, device requests, and
attendance audit entries. Audit data can be exported as CSV from the browser.

Registration statuses are presented as:

```text
Not registered
Window open
Registered
Reset requested
```

Device request actions support `NEW_PHONE`, `BIOMETRIC_RESET`, and
`REINSTALL_REVIEW` through the existing decision service.

The physical Android acceptance test remains pending:

```text
PENDING — Android physical E2E

Requires:
- Android emulator or physical device
- adb
- native mobile/android project
- camera capability
- biometric-capable device/emulator
```
