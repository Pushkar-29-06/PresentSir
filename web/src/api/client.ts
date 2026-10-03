import { isUiDevMode } from "../auth/AuthProvider";
import { mockApiResponses } from "../auth/mockData";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

type TokenStore = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (access: string, refresh: string) => void;
  clear: () => void;
};

export function createApiClient(baseUrl: string, tokens: TokenStore) {
  let refreshInFlight: Promise<boolean> | null = null;

  async function refresh(): Promise<boolean> {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const refreshToken = tokens.getRefreshToken();
      if (!refreshToken) return false;
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        tokens.clear();
        return false;
      }
      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
      };
      tokens.setTokens(data.access_token, data.refresh_token);
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  async function request<T>(
    path: string,
    init: RequestInit = {},
    retried = false,
  ): Promise<T> {
    // Dev mode: return mock data for known endpoints
    if (isUiDevMode()) {
      const mockData = mockApiResponses[path];
      if (mockData !== undefined && !init.method) {
        return mockData as T;
      }
      // For write operations in dev mode, return success without actual API call
      if (init.method === "POST" || init.method === "DELETE" || init.method === "PUT" || init.method === "PATCH") {
        // Return a generic success response
        return { success: true } as T;
      }
      // For GET requests without mock data, return empty array or null
      if (!init.method) {
        return [] as T;
      }
    }

    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    const accessToken = tokens.getAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (response.status === 401 && !retried && (await refresh())) {
      return request<T>(path, init, true);
    }
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }
      throw new ApiError(`API request failed: ${response.status}`, response.status, body);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return { request };
}
