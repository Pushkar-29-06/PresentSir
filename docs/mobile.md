# Mobile client

The mobile client is a React Native CLI application for Android and iOS. It is intended for real-device testing because device-bound keys and camera behavior are not faithfully represented by an emulator.

## Install

```powershell
cd E:\presentsir\mobile
npm install
```

## Configure the API

Set the mobile API base URL using the configuration used by the mobile client. For a physical phone on Wi-Fi, use the laptop's private IP and port:

```text
http://<laptop-private-ip>:8000
```

For Android USB development, use:

```powershell
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
```

Then the app can use `http://localhost:8000`.

Android cleartext HTTP should be enabled only in the debug build. Production builds must use HTTPS.

## Run Metro and Android

Terminal 1:

```powershell
cd E:\presentsir\mobile
npm start
```

Terminal 2:

```powershell
cd E:\presentsir\mobile
npm run android
```

## Mobile attendance flow

1. Sign in as a student.
2. Have an admin open a registration window.
3. Register the device key.
4. Open the faculty Smart Board session.
5. Scan the rotating QR code.
6. Submit attendance.
7. Verify the result in student history and the faculty roster.

The mobile client uses device-bound cryptographic keys. Never copy private key material into logs, source control, or support messages.

## Typecheck

```powershell
cd E:\presentsir\mobile
npm run typecheck
```

## Platform prerequisites

- Android Studio and an Android SDK for Android.
- Xcode and CocoaPods for iOS.
- A physical device for hardware-backed key and camera testing.
- USB debugging enabled for Android USB development.

