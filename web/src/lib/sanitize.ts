/** Input sanitization + content moderation for user-supplied strings. */

function assertString(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

/** Strip characters that enable HTML/script injection and MongoDB operator abuse. */
function stripDangerous(s: string): string {
  return s
    .replace(/[<>]/g, "")               // no HTML angle brackets
    .replace(/[\x00-\x1f\x7f]/g, "")   // no control characters
    .trim();
}

/** Sanitize a display name: strip injection chars, limit length, collapse whitespace. */
export function sanitizeName(raw: unknown, maxLen = 60): string {
  return stripDangerous(assertString(raw))
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

/** Sanitize a free-text field (message, subject, note, context excerpt). */
export function sanitizeText(raw: unknown, maxLen: number): string {
  return stripDangerous(assertString(raw)).slice(0, maxLen);
}

/**
 * Validate that a value is safe to use as a MongoDB document ID lookup.
 * Accepts only strings matching UUID / alphanumeric-with-hyphens format.
 * Returns undefined for anything that doesn't match (prevents operator injection).
 */
export function sanitizeId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  // MongoDB ObjectId (24-char hex) or UUID (36-char) or our own randomUUID() IDs
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(raw)) return undefined;
  return raw;
}

/**
 * Validate that a device serial looks like a real fingerprint hash.
 * SHA-256 produces 64 hex chars; FNV fallback may be shorter — allow 16-128.
 */
export function isValidSerial(s: string): boolean {
  return /^[a-f0-9]{16,128}$/i.test(s);
}

// ─── Inappropriate name filter ──────────────────────────────────────────────

const BLOCKED_TOKENS = new Set([
  "fuck", "fucker", "fucking", "fucks", "fucked",
  "shit", "shits", "shitting",
  "cunt", "cunts",
  "cock", "cocks",
  "dick", "dicks",
  "ass", "asshole", "assholes",
  "bitch", "bitches",
  "pussy", "pussies",
  "whore", "whores",
  "slut", "sluts",
  "bastard", "bastards",
  "nigger", "niggers", "nigga",
  "faggot", "faggots", "fag", "fags",
  "retard", "retards",
  "rape", "rapist",
  "piss", "prick",
  "twat", "wank", "wanker",
  "arse", "arsehole",
]);

/**
 * Returns true if the name contains an offensive word as a discrete token
 * (split on whitespace, hyphens, underscores, digits).
 * Intentionally avoids false-positives on substrings inside real names
 * (e.g. "Cassandra" is fine — no token equals "ass").
 */
export function isInappropriate(name: string): boolean {
  const tokens = name
    .toLowerCase()
    .split(/[\s\-_0-9]+/)
    .filter(Boolean);
  return tokens.some((t) => BLOCKED_TOKENS.has(t));
}
