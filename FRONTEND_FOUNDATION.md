# Frontend Foundation

## Applications

- `web/`: React, Vite, and TypeScript for Student, Faculty, and Admin web
  route trees.
- `mobile/`: React Native CLI TypeScript foundation for Student and Faculty
  route trees.

## Shared foundation behavior

- TanStack Query providers are installed in both applications.
- API clients attach bearer access tokens.
- A single refresh attempt is made after a `401`.
- Failed refresh clears tokens and leaves the user at the login boundary.
- Web tokens use `sessionStorage` for session-scoped smart-board safety; mobile
  tokens use AsyncStorage.
- Web role guards enforce Student, Faculty, and Admin route access.
- Mobile navigation selects separate Student and Faculty route trees.
- Light/dark/system theme primitives are present for the web; mobile theme
  tokens are ready for the native theme provider.

## Backend contract

`GET /me` returns the authenticated non-sensitive user profile and role:

```json
{
  "user": {
    "id": 1,
    "login_id": "student-1",
    "name": "Student",
    "email": "student@example.test",
    "phone": "0000000000",
    "department_id": null,
    "status": "ACTIVE"
  },
  "role": "STUDENT"
}
```

## Validation

- `web`: `npm run build` passes.
- `mobile`: `npm run typecheck` passes.

Feature screens are intentionally not implemented in this milestone.
