import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createApiClient } from "../api/client";
import { decodeRole } from "./decode";
import { tokenStore } from "./storage";
import type { AuthUser, MeResponse, Role } from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  role: Role | null;
  api: ReturnType<typeof createApiClient>;
  signIn: (loginId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const api = useMemo(() => createApiClient(apiBaseUrl, tokenStore), []);
  const role = user?.role ?? decodeRole(tokenStore.getAccessToken());

  async function signIn(loginId: string, password: string) {
    const tokens = await api.request<{ access_token: string; refresh_token: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ login_id: loginId, password }) },
    );
    tokenStore.setTokens(tokens.access_token, tokens.refresh_token);
    const current = await api.request<MeResponse>("/me");
    setUser({ ...current.user, role: current.role });
    navigate(`/${current.role.toLowerCase()}`);
  }

  async function signOut() {
    try {
      await api.request<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: tokenStore.getRefreshToken() }),
      });
    } finally {
      tokenStore.clear();
      setUser(null);
      navigate("/login");
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, api, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
