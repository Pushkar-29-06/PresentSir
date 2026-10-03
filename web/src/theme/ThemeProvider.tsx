import { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext<{ mode: "light" } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force light mode only
    document.documentElement.dataset.theme = "light";
    // Clear any stored theme preference
    localStorage.removeItem("presentsir.theme");
  }, []);
  return <ThemeContext.Provider value={{ mode: "light" }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
