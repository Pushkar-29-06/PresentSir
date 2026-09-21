type TokenStore = {
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  clear: () => Promise<void>;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API request failed: ${status}`);
  }
}

export function createApiClient(baseUrl: string, tokens: TokenStore) {
  let refreshInFlight: Promise<boolean> | null = null;
  async function refresh() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const token = await tokens.getRefreshToken();
      if (!token) return false;
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: token }),
      });
      if (!response.ok) { await tokens.clear(); return false; }
      const data = await response.json() as { access_token: string; refresh_token: string };
      await tokens.setTokens(data.access_token, data.refresh_token);
      return true;
    })().finally(() => { refreshInFlight = null; });
    return refreshInFlight;
  }
  async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    const access = await tokens.getAccessToken();
    if (access) headers.set("Authorization", `Bearer ${access}`);
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (response.status === 401 && !retried && await refresh()) return request<T>(path, init, true);
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }
      throw new ApiError(response.status, body);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }
  return { request };
}
