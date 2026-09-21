import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY = "presentsir.access_token";
const REFRESH_KEY = "presentsir.refresh_token";

export const tokenStore = {
  getAccessToken: () => AsyncStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => AsyncStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string) =>
    Promise.all([AsyncStorage.setItem(ACCESS_KEY, access), AsyncStorage.setItem(REFRESH_KEY, refresh)]).then(() => undefined),
  clear: () => Promise.all([AsyncStorage.removeItem(ACCESS_KEY), AsyncStorage.removeItem(REFRESH_KEY)]).then(() => undefined),
};
