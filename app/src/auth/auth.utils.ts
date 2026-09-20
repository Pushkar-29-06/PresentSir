/**
 * Authentication utilities
 * Helper functions for authentication operations
 * Security-critical: requires human review
 */

/**
 * Check if user can mark attendance
 * Only FULL mode allows attendance marking
 */
export function canMarkAttendance(deviceMode: 'FULL' | 'READ_ONLY' | 'WEB'): boolean {
  return deviceMode === 'FULL';
}

/**
 * Check if device needs registration
 */
export function needsRegistration(deviceMode: 'FULL' | 'READ_ONLY' | 'WEB'): boolean {
  return deviceMode === 'READ_ONLY';
}

/**
 * Get device mode message for UI
 */
export function getDeviceModeMessage(
  deviceMode: 'FULL' | 'READ_ONLY' | 'WEB',
): string {
  switch (deviceMode) {
    case 'FULL':
      return 'Device registered';
    case 'READ_ONLY':
      return 'Device not registered. Contact the admin.';
    case 'WEB':
      return 'Web client';
    default:
      return 'Unknown device status';
  }
}
