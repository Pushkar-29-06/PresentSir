export const attendanceMessages: Record<string, string> = {
  QR_EXPIRED: "This QR code has expired. Scan the current code.",
  QR_INVALID: "This QR code is not valid for PresentSir.",
  SESSION_NOT_OPEN: "Attendance is not currently open.",
  NOT_ENROLLED: "You are not enrolled in this offering.",
  MODE_READ_ONLY: "Attendance is unavailable in read-only mode.",
  DEVICE_MISMATCH: "This device is not the active device for your account.",
  SIGNATURE_INVALID: "Biometric verification failed. Try scanning again.",
  RATE_LIMITED: "Too many attempts. Please wait and try again.",
  NETWORK_ERROR: "Could not reach PresentSir. Check your connection and retry.",
};

export function isAttendanceNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && error.message.includes("Network request failed"));
}

export function attendanceErrorMessage(error: unknown): string {
  const detail = error instanceof Error && "body" in error
    ? (error as Error & { body?: { detail?: unknown } }).body?.detail
    : undefined;
  if (typeof detail === "string" && attendanceMessages[detail]) return attendanceMessages[detail];
  if (isAttendanceNetworkError(error)) {
    return attendanceMessages.NETWORK_ERROR;
  }
  return typeof detail === "string" ? detail : "Attendance could not be recorded. Try again.";
}
