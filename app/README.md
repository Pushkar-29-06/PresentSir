# PresentSir - React Native Android Application

## Overview

PresentSir is a React Native Android application for secure attendance tracking in educational institutions. It uses biometric authentication, QR code scanning, and cryptographic signing to ensure attendance integrity.

## Tech Stack

- **React Native CLI** 0.73.0
- **TypeScript** 5.3.0
- **React Navigation** 6.x
- **TanStack Query** 5.x
- **Axios** 1.6.2
- **react-native-vision-camera** 4.5.0
- **react-native-biometrics** 3.0.1
- **react-native-device-info** 10.11.0
- **react-native-keychain** 8.2.0
- **react-native-svg** 14.1.0
- **@tabler/icons-react-native** 2.40.0
- **dayjs** 1.11.10
- **zustand** 4.4.7
- **@react-native-community/netinfo** 11.2.1

## Project Structure

```
app/
├── android/              # Android native code
├── ios/                  # iOS native code (placeholder)
├── src/
│   ├── api/              # API client and endpoints
│   ├── auth/             # Authentication context and utilities
│   ├── components/       # Reusable UI components
│   ├── features/         # Feature-based organization
│   ├── hooks/            # Custom React hooks
│   ├── navigation/       # Navigation configuration
│   ├── screens/          # Screen components
│   ├── services/         # Business logic services
│   ├── store/            # State management
│   ├── types/            # TypeScript type definitions
│   ├── theme/            # Design tokens
│   └── utils/            # Utility functions
├── assets/               # Static assets
├── __tests__/            # Test files
├── .env                  # Environment variables
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── babel.config.js       # Babel configuration
├── metro.config.js      # Metro bundler configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio
- A real Android device with USB debugging (emulators don't support hardware-backed biometrics)

### Installation

```bash
npm install
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on Android device
npm run android
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```
API_BASE_URL=http://localhost:8000/api/v1
WS_BASE_URL=ws://localhost:8008/ws
APP_NAME=PresentSir
```

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Architecture

The app follows a layered architecture:

- **Presentation**: Screens and components
- **Business Logic**: Services and hooks
- **Data**: API client and types
- **Infrastructure**: Navigation and utilities

## Security

This application handles security-critical operations:

- JWT token storage (Keychain)
- Biometric authentication
- Device registration and binding
- QR scanning and signature creation
- Attendance submission

All security-critical code requires human review before deployment.

## License

See the project root LICENSE file.
