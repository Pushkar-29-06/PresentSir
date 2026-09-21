import { createContext, useContext, useMemo, useState } from "react";
import { createApiClient } from "../api/client";
import { tokenStore } from "./storage";
import type { AuthUser, MeResponse } from "./types";

const AuthContext = createContext<{
  user: AuthUser | null;
  api: ReturnType<typeof createApiClient>;
  signIn: (loginId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);

const apiBaseUrl = process.env.API_URL ?? "http://10.0.2.2:8000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const api = useMemo(() => createApiClient(apiBaseUrl, tokenStore), []);
  async function signIn(loginId: string, password: string) {
    const tokens = await api.request<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST", body: JSON.stringify({ login_id: loginId, password }),
    });
    await tokenStore.setTokens(tokens.access_token, tokens.refresh_token);
    const current = await api.request<MeResponse>("/me");
    setUser({ ...current.user, role: current.role });
  }
  async function signOut() {
    try { await api.request("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: await tokenStore.getRefreshToken() }) }); }
    finally { await tokenStore.clear(); setUser(null); }
  }
  return <AuthContext.Provider value={{ user, api, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
