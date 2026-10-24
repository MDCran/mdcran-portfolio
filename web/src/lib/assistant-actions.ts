import { safePublicPath } from "./assistant-evidence";
export const PUBLIC_SITE_PATHS = ["/", "/resume", "/resume/print", "/engineering", "/work", "/articles", "/contact", "/terminal", "/visitor-map", "/status", "/coretv", "/code", "/coding-projects", "/arts-and-entertainment", "/arts-and-entertainment/minecraft-maps", "/arts-and-entertainment/events", "/motion-and-graphics", "/motion-and-graphics/thumbnail-design", "/motion-and-graphics/video-editing", "/motion-and-graphics/web-dev-design", "/motion-and-graphics/web-design", "/motion-and-graphics/graphic-design", "/githubprofile", "/publications", "/privacy", "/terms", "/legal", "/bar", "/rizz", "/2d-pong", "/pocket-sunshine", "/rival-card"] as const;
export type SiteAction = { type: "navigate" | "highlight" | "theme" | "project" | "textSize"; value: string };
export const siteActionSchema = {
  type: "object" as const,
  properties: { actions: { type: "array", maxItems: 4, items: { type: "object", properties: { type: { type: "string", enum: ["navigate", "highlight", "theme", "project", "textSize"] }, value: { type: "string", maxLength: 180 } }, required: ["type", "value"], additionalProperties: false } } },
  required: ["actions"], additionalProperties: false,
};
export const siteActionDescription = "Operate the public portfolio. Use this tool instead of text markers for navigation, highlighting sections, themes, project cards, and text size. When focusing on a specific project, navigate to its exact published detail URL, highlight project-title or its relevant section, and include its project ID. For best-project requests choose one real project and open it, not a gallery. Write a short natural answer before calling. Never submit forms. Only use published paths/project IDs provided in context.";
export function validateSiteActions(input: unknown, publicPaths?: readonly string[], projectIds?: readonly string[]): SiteAction[] {
  if (!input || typeof input !== "object" || !("actions" in input) || !Array.isArray(input.actions)) return [];
  return input.actions.slice(0, 4).filter((a): a is SiteAction => {
    if (!a || typeof a.type !== "string" || typeof a.value !== "string" || a.value.length > 180) return false;
    switch (a.type) {
      case "navigate": return safePublicPath(a.value) && (!publicPaths || publicPaths.includes(a.value.split("#")[0]));
      case "project": return /^[\w-]+$/.test(a.value) && (!projectIds || projectIds.includes(a.value));
      case "highlight": return /^[a-zA-Z0-9_-]{1,120}$/.test(a.value);
      case "theme": return ["dark", "light", "hacker", "cyberpunk", "grayscale", "high-contrast"].includes(a.value);
      case "textSize": return ["small", "normal", "large", "larger", "largest"].includes(a.value);
      default: return false;
    }
  });
}
/** Called only after the request's cancellation/generation guard. */
export function dispatchSiteAction(action: SiteAction, navigate: (href: string) => void, theme: (value: string) => void) {
  if (action.type === "navigate") navigate(action.value);
  if (action.type === "theme") theme(action.value);
  if (action.type === "highlight") window.dispatchEvent(new CustomEvent("mdcran:highlight", { detail: action.value }));
  if (action.type === "textSize") window.dispatchEvent(new CustomEvent("mdcran:a11y-set", { detail: { textScale: ({ small: 0.9, normal: 1, large: 1.15, larger: 1.3, largest: 1.5 } as Record<string, number>)[action.value] } }));
}

/** Compatibility boundary for existing tours/forms/cursor gestures. Unknown or
 * malformed markers never reach the legacy handlers. Core actions prefer tools. */
export function sanitizeLegacyActions(text: string): string {
  const id = (value: string) => /^[\w-]{1,120}$/.test(value);
  const plain = (value: string, max = 500) => value.length > 0 && value.length <= max && !/[\x00-\x1f<>]/.test(value);
  return text.replace(/__([A-Z_]+?)(?::([\s\S]*?))?__/g, (marker, name: string, raw?: string) => {
    const value = raw ?? "";
    let valid = false;
    if (["TOUR", "PROJECTTOUR", "RESETZOOM", "CURSORRESET", "SCANTOMOBILE", "BEHAVIOR"].includes(name)) valid = raw === undefined;
    else if (name === "NAV" || name === "PREFETCH") valid = safePublicPath(value);
    else if (name === "GOTOITEM") { const parts = value.split("|"); valid = parts.length === 2 && safePublicPath(parts[0]) && plain(parts[1], 120); }
    else if (["HIGHLIGHT", "ZOOM", "EMPHASIZE", "CLICKID", "PROJECTCARD"].includes(name)) valid = id(value);
    else if (name === "THEME" || name === "TEXTSIZE") valid = validateSiteActions({ actions: [{ type: name === "THEME" ? "theme" : "textSize", value }] }).length === 1;
    else if (name === "ACCESS") valid = /^(?:motion-(?:reduce|allow)|readaloud-(?:on|off)|reset|cb-(?:deuteranopia|protanopia|tritanopia|none)|cursor-(?:large|circle|contrast|default))$/.test(value);
    else if (name === "SCROLL") valid = /^(?:up|down|left|right|top|bottom)(?::[\w-]{1,120})?$/.test(value);
    else if (name === "SLIDER") { const parts = value.split("|"); valid = parts.length === 2 && id(parts[0]) && /^\d{1,3}$/.test(parts[1]) && Number(parts[1]) <= 100; }
    else if (name === "CHECK") valid = /^[\w-]{1,120}(?:\|(?:on|off))?$/.test(value);
    else if (name === "TYPEID" || name === "SELECT") { const parts = value.split("|"); valid = parts.length === 2 && id(parts[0]) && plain(parts[1]); }
    else if (["TYPE", "SEARCH", "POINT", "CLICK"].includes(name)) valid = plain(value);
    else if (name === "IMAGESHOW") valid = /^\d{1,3}$/.test(value);
    else if (name === "CONSENT") valid = /^(?:opt-in|opt-out)$/.test(value);
    else if (name === "COPYLINK") valid = raw === undefined || plain(value, 1000);
    else if (["IDENTITY_CONFIRM", "IDENTITY_PROVIDE"].includes(name)) valid = plain(value, 80);
    else if (["IDENTITY_DENY", "REJECT_CANDIDATE"].includes(name)) valid = raw === undefined || /^[a-zA-Z0-9_-]{1,80}$/.test(value);
    else if (name === "CONTACTCARD" || name === "BOOKINGCARD") {
      try {
        const card = JSON.parse(value);
        const fields = ["name", "email", "phone", "subject", "message", "date", "time"];
        valid = card !== null && typeof card === "object" && !Array.isArray(card) && Object.keys(card).every(k => fields.includes(k) ? typeof card[k] === "string" && card[k].length <= (k === "message" ? 4000 : 250) : k === "consent" && typeof card[k] === "boolean");
        valid = valid && Boolean(card.name && (name === "BOOKINGCARD" ? card.email : card.message && (card.email || card.phone)));
      } catch { valid = false; }
    }
    return valid ? marker : "";
  });
}
