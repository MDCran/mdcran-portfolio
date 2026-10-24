"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useStoredPreference } from "./useStoredPreference";
import { THEMES, type ThemeName, type ThemeInfo } from "./themes";
export { THEMES, type ThemeName, type ThemeInfo } from "./themes";

const STORAGE_KEY = "mdcran_theme";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  themeInfo: ThemeInfo;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  themeInfo: THEMES[0],
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [storedTheme, setStoredTheme] = useStoredPreference(STORAGE_KEY, "dark");
  const theme = THEMES.find((item) => item.id === storedTheme)?.id ?? "dark";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    if (THEMES.some((item) => item.id === t)) setStoredTheme(t);
  }, [setStoredTheme]);

  const themeInfo = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeInfo }}>
      {children}
    </ThemeContext.Provider>
  );
}
