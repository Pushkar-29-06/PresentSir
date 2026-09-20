/**
 * API Error Handling
 * Centralized error code to message mapping based on BACKEND_SPEC.md
 */

export const errorMessages: Record<string, string> = {
  // Authentication errors
  UNAUTHENTICATED: 'Please log in again',
  FORBIDDEN: 'No permission',
  INVALID_CREDENTIALS: 'Invalid login ID or password',
  DEVICE_OWNED_BY_OTHER: 'This device is registered to another user',

  // Device errors
  DEVICE_MISMATCH: 'Device not registered. Contact the admin.',
  REGISTRATION_CLOSED: 'Registration is closed. Contact the admin.',
  CHALLENGE_EXPIRED: 'Registration challenge expired. Try again.',
  SIGNATURE_INVALID: 'Fingerprint verification failed. Try again or request a reset.',

  // Attendance errors
  SESSION_NOT_OPEN: 'Attendance is not open for this lecture.',
  OUTSIDE_LECTURE_TIME: 'Outside the allowed lecture time.',
  SESSION_ALREADY_OPEN: 'A session is already open.',
  INVALID_STATE_TRANSITION: 'Invalid session state transition.',
  QR_INVALID: 'This is not a valid attendance code.',
  QR_EXPIRED: 'The code has expired. Scan the code currently on the screen.',
  NOT_ENROLLED: 'You are not enrolled in this course.',
  MODE_READ_ONLY: 'This device is not registered for attendance.',
  RATE_LIMITED: 'Too many attempts. Wait a moment.',
  VALIDATION_ERROR: 'Invalid input data.',
  REASON_REQUIRED: 'A reason is required.',

  // General errors
  NOT_FOUND: 'Resource not found',
  NETWORK_ERROR: 'No connection. Check your network and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
};

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(code: string, defaultMessage?: string): string {
  return errorMessages[code] || defaultMessage || 'An error occurred';
}
