const ACCESS_KEY = "presentsir.access_token";
const REFRESH_KEY = "presentsir.refresh_token";

export const tokenStore = {
  getAccessToken: () => sessionStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => sessionStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string) => {
    sessionStorage.setItem(ACCESS_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};
