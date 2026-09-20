/**
 * API Types
 * Types generated from backend OpenAPI specification
 * These will be generated from backend /openapi.json when available
 */

// User types
export interface User {
  id: number;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  login_id: string;
  name: string;
  email: string;
  phone?: string;
  department_id?: number;
  status: 'ACTIVE' | 'DISABLED';
}

export interface DeviceInfo {
  status: 'ACTIVE' | 'PENDING' | 'INVALIDATED' | 'REVOKED' | 'NOT_REGISTERED';
  mode: 'FULL' | 'READ_ONLY' | 'WEB';
}

// Auth types
export interface LoginRequest {
  login_id: string;
  password: string;
  client: 'app' | 'web';
  android_id?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
  device: DeviceInfo;
  server_time: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Attendance types
export interface AttendanceSubmissionRequest {
  session_id: number;
  qr_token: string;
  client_nonce: string;
  android_id: string;
  signature: string;
}

export interface AttendanceSubmissionResponse {
  status: 'RECORDED';
  already_recorded: boolean;
  course: {
    code: string;
    name: string;
  };
  recorded_at: string;
}

// Error types
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
