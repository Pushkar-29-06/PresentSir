import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
const THEME_KEY = "presentsir.theme";
const ThemeContext = createContext<{ mode: ThemeMode; setMode: (mode: ThemeMode) => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  useEffect(() => { void AsyncStorage.getItem(THEME_KEY).then((stored) => {
    if (stored === "light" || stored === "dark" || stored === "system") setMode(stored);
  }); }, []);
  function updateMode(next: ThemeMode) {
    setMode(next);
    void AsyncStorage.setItem(THEME_KEY, next);
  }
  return <ThemeContext.Provider value={{ mode, setMode: updateMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
