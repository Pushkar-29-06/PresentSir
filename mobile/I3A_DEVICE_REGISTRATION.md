# I3A Student Device Registration

The student mobile flow is wired to the frozen backend device-registration
contract:

1. An administrator opens a registration window.
2. The signed-in student opens Device registration.
3. The app reads the Android device ID.
4. The app generates an RSA key pair through `react-native-biometrics`.
5. The app requests `POST /device/register/challenge`.
6. The biometric/device credential signs `{android_id}:{challenge}`.
7. The app sends `POST /device/register` with the public key and signature.
8. The binding result is persisted locally for the device-status screen.

No QR or attendance submission request is made during registration. The next
step can consume the active device binding for the signed QR submission path.

Registration failures map to explicit UI messages for:

- unavailable/expired registration windows
- device ownership conflicts
- existing active devices
- invalid proof signatures
- network failures

The native Android build and biometric prompt require a physical/emulated
Android environment; TypeScript validation is covered by `npm run typecheck`.
