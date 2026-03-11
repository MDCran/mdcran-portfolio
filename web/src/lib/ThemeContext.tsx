"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeName = "dark" | "hacker" | "cyberpunk" | "grayscale" | "high-contrast" | "light";

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  shortName: string;
  description: string;
  primary: string;
  background: string;
  accent: string;
  text: string;
}

export const THEMES: ThemeInfo[] = [
  { id: "dark", name: "Dark", shortName: "Dark", description: "Default cranberry theme", primary: "#ef4242", background: "#0a0a0a", accent: "#ef4242", text: "#ffffff" },
  { id: "hacker", name: "Hacker", shortName: "Hacker", description: "Matrix green terminal", primary: "#00ff41", background: "#050a05", accent: "#00ff41", text: "#00ff41" },
  { id: "cyberpunk", name: "Cyberpunk", shortName: "Cyber", description: "Neon pink & cyan", primary: "#ff00cc", background: "#0a0510", accent: "#ff00cc", text: "#ffffff" },
  { id: "grayscale", name: "Grayscale", shortName: "Gray", description: "Monochrome neutral", primary: "#888888", background: "#111111", accent: "#aaaaaa", text: "#cccccc" },
  { id: "high-contrast", name: "High Contrast", shortName: "HC Mode", description: "Maximum readability", primary: "#ffff00", background: "#000000", accent: "#ffff00", text: "#ffffff" },
  { id: "light", name: "Light", shortName: "Light", description: "Clean light mode", primary: "#d93636", background: "#f8f8f8", accent: "#d93636", text: "#1a1a1a" },
];

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
  const [theme, setThemeState] = useState<ThemeName>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setThemeState(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const themeInfo = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeInfo }}>
      {children}
    </ThemeContext.Provider>
  );
}
