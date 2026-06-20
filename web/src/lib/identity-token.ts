/* ─────────────────────────────────────────────────────────────────────────────
   Identity Token — client-side persistence layer for the "Token Recycler".

   Writes a lightweight identity payload to BOTH localStorage and a long-lasting
   cookie so that identity survives localStorage clears, private-mode switches,
   and cookie purges individually.  Read order: localStorage → cookie.

   Tracking link params recognised:
     ?uid=<any>          — raw unique identifier (recruiter_apple_123, etc.)
     ?identity=<uuid>    — admin-created identity UUID
     ?name=<string>      — display name hint
     ?company=<string>   — company hint
     ?utm_source=<str>   — traffic source
     ?utm_campaign=<str> — campaign slug (used to infer company/context)
     ?utm_medium=<str>   — medium hint
   ──────────────────────────────────────────────────────────────────────────── */

export interface IdentityToken {
  id: string;
  name: string;
  source: string;
  company?: string;
  campaign?: string;
  medium?: string;
  capturedAt: number;
}

const LS_KEY = "mdcran_idt";
const COOKIE_NAME = "mdcran_idt";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

// ── Write ────────────────────────────────────────────────────────────────────

export function writeIdentityToken(token: IdentityToken): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(token);
  try { localStorage.setItem(LS_KEY, raw); } catch { /* quota or private mode */ }
  try {
    const encoded = encodeURIComponent(raw);
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${encoded}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax${secure}`;
  } catch { /* cookies disabled */ }
}

// ── Read ─────────────────────────────────────────────────────────────────────

function parseCookieValue(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = COOKIE_NAME + "=";
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try { return decodeURIComponent(trimmed.slice(prefix.length)); } catch { return null; }
    }
  }
  return null;
}

function parseTokenJson(raw: string | null): IdentityToken | null {
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as Partial<IdentityToken>;
    if (typeof t.id !== "string" || !t.id) return null;
    return {
      id: t.id,
      name: typeof t.name === "string" ? t.name : "Guest",
      source: typeof t.source === "string" ? t.source : "unknown",
      company: typeof t.company === "string" ? t.company : undefined,
      campaign: typeof t.campaign === "string" ? t.campaign : undefined,
      medium: typeof t.medium === "string" ? t.medium : undefined,
      capturedAt: typeof t.capturedAt === "number" ? t.capturedAt : Date.now(),
    };
  } catch { return null; }
}

/** Read the identity token. Tries localStorage first, falls back to cookie. */
export function readIdentityToken(): IdentityToken | null {
  if (typeof window === "undefined") return null;
  let lsRaw: string | null = null;
  try { lsRaw = localStorage.getItem(LS_KEY); } catch { /* */ }
  const cookieRaw = lsRaw ? null : parseCookieValue();
  const token = parseTokenJson(lsRaw ?? cookieRaw);
  // Restore to localStorage if token came only from the cookie
  if (token && !lsRaw && cookieRaw) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(token)); } catch { /* */ }
  }
  return token;
}

// ── Parse from URL ────────────────────────────────────────────────────────────

/** Tracking-link / bridge params consumed on landing — kept in one list so the
 *  recycler can strip them all from the URL after reading. */
export const TRACKING_PARAM_KEYS = [
  "uid", "identity", "name", "company", "utm_source", "utm_campaign", "utm_medium", "source", "handshake_id",
] as const;

/** Parse identity signals from a URL search string (e.g. window.location.search).
 *  Returns null when no recognised tracking params are present.
 *  `handshakeId` is the transient "Scan to Mobile" bridge token — it is NOT part
 *  of the persisted IdentityToken (it is consumed once, server-side, on landing). */
export function parseIdentityFromUrl(search: string): (Partial<IdentityToken> & { handshakeId?: string }) | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(search);
  const uid = p.get("uid")?.trim().slice(0, 128);
  const identityId = p.get("identity")?.trim().slice(0, 36); // UUID max length
  const name = p.get("name")?.trim().slice(0, 60);
  const company = p.get("company")?.trim().slice(0, 60);
  const source = (p.get("utm_source")?.trim() || p.get("source")?.trim())?.slice(0, 60);
  const campaign = p.get("utm_campaign")?.trim().slice(0, 80);
  const medium = p.get("utm_medium")?.trim().slice(0, 40);
  const handshakeId = p.get("handshake_id")?.trim().slice(0, 64);

  // Only proceed if at least one meaningful tracking/bridge param is present
  const hasTracking = !!(uid || identityId || (name && company) || source || handshakeId);
  if (!hasTracking) return null;

  return {
    id: uid || identityId || "",
    name: name || "",
    source: source || "direct",
    company: company || undefined,
    campaign: campaign || undefined,
    medium: medium || undefined,
    handshakeId: handshakeId || undefined,
  };
}

// ── Clear ─────────────────────────────────────────────────────────────────────

export function clearIdentityToken(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(LS_KEY); } catch { /* */ }
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax${secure}`;
  } catch { /* */ }
}
