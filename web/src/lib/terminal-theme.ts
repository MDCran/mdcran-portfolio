import { THEMES, type ThemeName } from "./themes";

export const TERMINAL_THEME_KEY = "mdcran_terminal_theme";
export const DEFAULT_TERMINAL_THEME: ThemeName = "hacker";
export const TERMINAL_THEMES = ["hacker", "dark", "cyberpunk", "grayscale", "light", "high-contrast"] as const satisfies readonly ThemeName[];

export function resolveTerminalTheme(value: string): ThemeName | null {
  const name = value.trim().toLowerCase().replace(/\s+/g, "-");
  const normalized = name === "gray" || name === "grey" ? "grayscale" : name === "cyber" ? "cyberpunk" : name;
  return TERMINAL_THEMES.find(theme => theme === normalized) ?? null;
}

function channels(hex: string) { return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)); }
function mix(a: string, b: string, amount: number) {
  const other = channels(b);
  return `#${channels(a).map((value, index) => Math.round(value * (1 - amount) + other[index] * amount).toString(16).padStart(2, "0")).join("")}`;
}

export function terminalThemeStyle(name: ThemeName): Record<string, string> {
  const theme = THEMES.find(theme => theme.id === name)!;
  const light = name === "light", highContrast = name === "high-contrast";
  const accent = name === "grayscale" ? theme.accent : theme.primary;
  const secondary = name === "cyberpunk" ? "#00e5ff" : accent;
  const surface = light ? "#ffffff" : mix(theme.background, theme.text, highContrast ? 0 : 0.025);
  const values = {
    background: theme.background,
    surface,
    raised: highContrast ? "#242400" : mix(surface, accent, light ? 0.075 : 0.12),
    accent,
    secondary,
    text: theme.text,
    muted: highContrast ? theme.text : mix(theme.text, theme.background, light ? 0.32 : 0.28),
    error: light ? "#b42318" : "#ff9c9c",
    selection: highContrast ? accent : mix(surface, accent, light ? 0.2 : 0.28),
    "on-selection": highContrast ? "#000000" : theme.text,
  };
  const style: Record<string, string> = { colorScheme: light ? "light" : "dark" };
  for (const [key, value] of Object.entries(values)) {
    style[`--terminal-${key}`] = value;
    style[`--terminal-${key}-rgb`] = channels(value).join(" ");
  }
  style["--terminal-text-glow"] = light || highContrast ? "0" : "0.12";
  style["--terminal-decoration-opacity"] = light ? "0.1" : highContrast ? "0.04" : "1";
  style["--terminal-gif-opacity"] = light ? "0.035" : highContrast ? "0.02" : "0.16";
  style["--terminal-scene-filter"] = name === "dark" ? "hue-rotate(235deg) saturate(.65)" : name === "cyberpunk" ? "hue-rotate(165deg)" : light || name === "grayscale" || highContrast ? "grayscale(1)" : "none";
  return style;
}
