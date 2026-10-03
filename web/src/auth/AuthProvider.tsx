import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createApiClient } from "../api/client";
import { decodeRole } from "./decode";
import { tokenStore } from "./storage";
import type { AuthUser, MeResponse, Role } from "./types";
import { mockUsers, mockMeResponses } from "./mockData";

type AuthContextValue = {
  user: AuthUser | null;
  role: Role | null;
  api: ReturnType<typeof createApiClient>;
  signIn: (loginId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const isDevMode = import.meta.env.VITE_UI_DEV_MODE === "true";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const api = useMemo(() => createApiClient(apiBaseUrl, tokenStore), []);
  const role = user?.role ?? decodeRole(tokenStore.getAccessToken());

  async function signIn(loginId: string, password: string) {
    if (isDevMode) {
      // Dev mode: bypass backend and use mock users
      let selectedRole: Role | null = null;
      if (loginId.toLowerCase() === "dev_student" || loginId.toLowerCase() === "student") {
        selectedRole = "STUDENT";
      } else if (loginId.toLowerCase() === "dev_faculty" || loginId.toLowerCase() === "faculty") {
        selectedRole = "FACULTY";
      } else if (loginId.toLowerCase() === "dev_admin" || loginId.toLowerCase() === "admin") {
        selectedRole = "ADMIN";
      }

      if (selectedRole) {
        // Set mock tokens with valid JWT structure for decode function
        const mockPayload = btoa(JSON.stringify({ role: selectedRole }));
        const mockAccessToken = `header.${mockPayload}.signature`;
        tokenStore.setTokens(mockAccessToken, "dev_mock_refresh_token");
        const mockResponse = mockMeResponses[selectedRole];
        setUser({ ...mockResponse.user, role: mockResponse.role });
        navigate(`/${selectedRole.toLowerCase()}`);
        return;
      }
    }

    // Production mode: normal authentication flow
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

export function isUiDevMode() {
  return isDevMode;
}
