/**
 * Request ID generation utilities
 * UUID generation for API requests
 */

/**
 * Generate a UUID v4
 * Used for client_nonce in attendance submission
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
}

/**
 * Generate a request ID for API calls
 */
export function generateRequestId(): string {
  return generateUUID();
}
