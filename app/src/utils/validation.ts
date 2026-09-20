/**
 * Validation utilities
 * Form validation and data validation helpers
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate login ID format
 */
export function isValidLoginId(loginId: string): boolean {
  const loginIdRegex = /^[A-Za-z0-9]+$/;
  return loginId.length > 0 && loginIdRegex.test(loginId);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Validate reason field (minimum 5 characters for manual marks)
 */
export function isValidReason(reason: string): boolean {
  return reason.trim().length >= 5;
}

/**
 * Validate QR token format (starts with A1.)
 */
export function isValidQRToken(token: string): boolean {
  return token.startsWith('A1.');
}
