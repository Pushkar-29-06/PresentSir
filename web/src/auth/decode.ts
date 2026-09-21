import type { Role } from "./types";

export function decodeRole(token: string | null): Role | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { role?: Role };
    return payload.role ?? null;
  } catch {
    return null;
  }
}
