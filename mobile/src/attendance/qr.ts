export type DecodedAttendanceQr = {
  sessionId: number;
  qrToken: string;
};

export function decodeAttendanceQr(value: string): DecodedAttendanceQr | null {
  if (!value.startsWith("A1.")) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const sessionId = Number(parts[1]);
  const qrToken = parts[2];
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || !qrToken) return null;
  return { sessionId, qrToken };
}

export function submissionProof(
  sessionId: number,
  qrToken: string,
  androidId: string,
  clientNonce: string,
): string {
  return `ATT1|${sessionId}|${qrToken}|${androidId}|${clientNonce}`;
}
