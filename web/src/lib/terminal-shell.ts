import type { Project } from "./types";
import { validPublishDate } from "./project-date";
import { isValidEmail, isValidPhoneNumber } from "./contact-validation";
export const ROOTS = [
  "arts-and-entertainment",
  "motion-and-graphics",
  "engineering",
  "articles",
  "clients",
  "featured-work",
  "resume",
  "contact",
  "subscribe",
  "unsubscribe",
  "privacy",
  "terms",
] as const;

export const ROUTES: Record<string, string[]> = {
  clients: ["clients"],
  featured: ["featured-work"],
  "featured-work": ["featured-work"],
  work: [],
  arts: ["arts-and-entertainment"],
  "arts-and-entertainment": ["arts-and-entertainment"],
  motion: ["motion-and-graphics"],
  "motion-and-graphics": ["motion-and-graphics"],
  engineering: ["engineering"],
  code: ["engineering"],
  "coding-projects": ["engineering"],
  articles: ["articles"],
  resume: ["resume"],
  contact: ["contact"],
  message: ["contact"],
  subscribe: ["subscribe"],
  unsubscribe: ["unsubscribe"],
  privacy: ["privacy"],
  terms: ["terms"],
};

export const COMMANDS = [
  "help",
  "togglemusic",
  "togglekeystrokeclicks",
  "ask",
  "ai",
  "mode",
  "agent",
  "tour",
  "next",
  "back",
  "recruiter",
  "skills",
  "experience",
  "education",
  "highlight",
  "cursor",
  "pet",
  "animations",
  "window",
  "focus",
  "stop",
  "about",
  "reload",
  "set",
  "send",
  "cancel",
  "cls",
  "browser",
  "quit",
  "q",
  "?",
  "clear",
  "home",
  "ls",
  "pwd",
  "cd",
  "open",
  "nano",
  "search",
  "select",
  "clients",
  "featured",
  "projects",
  "articles",
  "resume",
  "contact",
  "subscribe",
  "unsubscribe",
  "spotify",
  "browse",
  "togglebackground",
  "terms",
  "privacy",
  "visitors",
  "snake",
  "pacman",
  "exit",
] as const;

export const VALID_DIRS = new Set([
  "/",
  "/arts-and-entertainment",
  "/arts-and-entertainment/minecraft-maps",
  "/arts-and-entertainment/events",
  "/motion-and-graphics",
  "/motion-and-graphics/thumbnail-design",
  "/motion-and-graphics/video-editing",
  "/motion-and-graphics/web-dev-design",
  "/engineering",
  "/articles",
  "/clients",
  "/featured-work",
  "/resume",
  "/contact",
  "/subscribe",
  "/unsubscribe",
  "/privacy",
  "/terms",
]);

export function parseArguments(input: string) {
  const values: string[] = [];
  let current = "";
  let activeQuote: '"' | "'" | null = null;
  let started = false;

  for (const char of input) {
    if (activeQuote) {
      if (char === activeQuote) {
        activeQuote = null;
      } else {
        current += char;
      }
      started = true;
      continue;
    }

    if (char === '"' || char === "'") {
      activeQuote = char;
      started = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (started) {
        values.push(current);
        current = "";
        started = false;
      }
      continue;
    }

    current += char;
    started = true;
  }

  if (started) {
    values.push(current);
  }

  return {
    values,
    hasTrailingSpace: /\s$/.test(input),
    activeQuote,
  };
}

export function resolveTerminalPath(cwd: string[], target: string): string[] | null {
  const value = target.trim();
  if (!value || value === "/" || value === "~") return [];
  const alias = Object.hasOwn(ROUTES, value.toLowerCase()) ? ROUTES[value.toLowerCase()] : undefined;
  if (alias) return [...alias];
  const parts = value.startsWith("/") ? [] : [...cwd];
  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  if (["code", "coding-projects"].includes(parts[0])) parts[0] = "engineering";
  return VALID_DIRS.has(`/${parts.join("/")}`) ? parts : null;
}

export function isCodeProject(project: Project) {
  return [project.category, ...(project.extraCategories ?? [])].some(value =>
    ["engineering", "coding-projects", "code"].includes(value)) ||
    [project.subcategory, ...(project.extraSubcategories ?? [])].includes("coding");
}

export function formatDate(value?: string) {
  const date = validPublishDate(value);
  return date ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "";
}

export type TerminalFormMode = "contact" | "subscribe" | "unsubscribe";
export type TerminalForm = { name: string; email: string; phone: string; subject: string; message: string; identifier: string };

export function validateTerminalForm(mode: TerminalFormMode, form: TerminalForm) {
  const required = mode === "contact" ? ["name", "email", "subject", "message"] : mode === "unsubscribe" ? ["identifier"] : [];
  const missing = required.filter(key => !form[key as keyof TerminalForm].trim());
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(", ")}`);
  if (mode === "unsubscribe") {
    if (!isValidEmail(form.identifier) && !isValidPhoneNumber(form.identifier)) throw new Error("Enter a valid email address or phone number.");
  } else {
    if (!form.email.trim() && !form.phone.trim()) throw new Error("Provide an email address or phone number.");
    if (form.email && !isValidEmail(form.email)) throw new Error("Enter a valid email address.");
    if (form.phone && !isValidPhoneNumber(form.phone)) throw new Error("Enter a valid phone number.");
  }
}

export async function submitTerminalForm(mode: TerminalFormMode, form: TerminalForm, fetcher: typeof fetch = fetch) {
  validateTerminalForm(mode, form);
  const body = mode === "unsubscribe" ? { identifier: form.identifier.trim() } : mode === "subscribe"
    ? { name: form.name.trim() || undefined, email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, consent: true }
    : { ...form, consent: true, source: "terminal" };
  const response = await fetcher(`/api/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) {
    const message = typeof result?.error === "string" ? result.error : typeof result?.message === "string" ? result.message : null;
    throw new Error(message ?? `Unable to confirm ${mode} submission (HTTP ${response.status}). Try again or use the website form.`);
  }
}

export function validateTerminalSnapshot(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid terminal data.");
  const data = value as Record<string, unknown>;
  for (const key of ["projects", "featuredProjects", "articles", "clients", "featuredClients", "experiences", "educations", "skills", "certifications", "awards", "clubs"]) {
    if (!Array.isArray(data[key])) throw new Error(`Invalid terminal data: ${key}.`);
  }
}


const BLOCKED_DOMAINS = new Set([
  "pornhub.com","xvideos.com","xnxx.com","redtube.com","youporn.com","tube8.com",
  "xhamster.com","spankbang.com","eporner.com","tnaflix.com","txxx.com",
  "brazzers.com","naughtyamerica.com","bangbros.com","mofos.com","realitykings.com",
  "onlyfans.com","fansly.com","manyvids.com","4tube.com","drtuber.com",
  "chaturbate.com","cam4.com","stripchat.com","bongacams.com","myfreecams.com",
  "livejasmin.com","camsoda.com","streamate.com","jasmin.com",
  "rule34.xxx","e621.net","hentai2read.com","nhentai.net","hentaifox.com",
]);

export function sanitizeBrowseUrl(raw: string): { url: string; blocked: boolean } {
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return { url: "", blocked: false };
  const full = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(full);
    if (parsed.username || parsed.password || !parsed.hostname) return { url: "", blocked: false };
    const host = parsed.hostname.replace(/^www\./, "");
    const baseDomain = host.split(".").slice(-2).join(".");
    if (BLOCKED_DOMAINS.has(host) || BLOCKED_DOMAINS.has(baseDomain)) {
      return { url: full, blocked: true };
    }
    // Enforce safe search on search engines
    if (host === "google.com" && /\/search/.test(parsed.pathname)) {
      parsed.searchParams.set("safe", "strict");
    }
    if (host === "bing.com" && /\/search/.test(parsed.pathname)) {
      parsed.searchParams.set("adlt", "strict");
    }
    if (host === "duckduckgo.com") {
      parsed.searchParams.set("kp", "1");
    }
    if (host === "youtube.com") {
      parsed.searchParams.set("restrict", "strict");
    }
    return { url: parsed.toString(), blocked: false };
  } catch {
    return { url: full, blocked: false };
  }
}
