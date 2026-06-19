const DISABLED_COOKIE = "mdcran_shortcuts_disabled";
const CUSTOM_COOKIE = "mdcran_shortcuts_custom";
const MAX_AGE = 365 * 24 * 3600;

export const ALL_SHORTCUTS = [
  { id: "terminal",    keys: ["Ctrl", "Alt", "T"], label: "Open Terminal",         defaultKey: "t",  remappable: true  },
  { id: "themes",      keys: ["Shift", "Alt"],      label: "Cycle Themes",         defaultKey: null, remappable: false },
  { id: "search",      keys: ["S"],                  label: "Search",               defaultKey: "s",  remappable: true  },
  { id: "contact",     keys: ["C"],                  label: "Contact",              defaultKey: "c",  remappable: true  },
  { id: "go-home",     keys: ["G", "H"],             label: "Go Home",              defaultKey: "h",  remappable: true  },
  { id: "go-ae",       keys: ["G", "E"],             label: "Arts & Entertainment", defaultKey: "e",  remappable: true  },
  { id: "go-motion",   keys: ["G", "M"],             label: "Motion & Graphics",    defaultKey: "m",  remappable: true  },
  { id: "go-code",     keys: ["G", "C"],             label: "Go Code",              defaultKey: "c",  remappable: true  },
  { id: "go-articles", keys: ["G", "A"],             label: "Go Articles",          defaultKey: "a",  remappable: true  },
  { id: "go-spotify",  keys: ["G", "S"],             label: "Go Spotify",           defaultKey: "s",  remappable: true  },
  { id: "go-resume",   keys: ["G", "R"],             label: "Go Resume",            defaultKey: "r",  remappable: true  },
] as const;

export type ShortcutId = (typeof ALL_SHORTCUTS)[number]["id"];
export type ShortcutCustomMap = Record<string, string>; // id → custom key (single char)

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${MAX_AGE}; path=/`;
}

export function loadDisabled(): Set<string> {
  try {
    const v = readCookie(DISABLED_COOKIE);
    if (v) return new Set(JSON.parse(v) as string[]);
  } catch { /* */ }
  return new Set();
}

export function loadCustom(): ShortcutCustomMap {
  try {
    const v = readCookie(CUSTOM_COOKIE);
    if (v) return JSON.parse(v) as ShortcutCustomMap;
  } catch { /* */ }
  return {};
}

function broadcast(disabled: Set<string>, custom: ShortcutCustomMap) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("mdcran:shortcuts-updated", { detail: { disabled: [...disabled], custom } })
  );
}

export function saveDisabled(disabled: Set<string>): void {
  writeCookie(DISABLED_COOKIE, JSON.stringify([...disabled]));
  broadcast(disabled, loadCustom());
}

export function saveCustom(custom: ShortcutCustomMap): void {
  writeCookie(CUSTOM_COOKIE, JSON.stringify(custom));
  broadcast(loadDisabled(), custom);
}

export function resetAll(): void {
  writeCookie(DISABLED_COOKIE, "[]");
  writeCookie(CUSTOM_COOKIE, "{}");
  broadcast(new Set(), {});
}
