/* ──────────────────────────────────────────────────────────────────────────
   Lightweight, client-side visitor memory.

   Persists across visits in localStorage so the assistant can recognise
   returning visitors, adapt its greeting, and match the time-of-day mood.
   No PII — just counts and timestamps.
   ────────────────────────────────────────────────────────────────────────── */

const KEY = "mdcran_visitor_memory";

export type Daypart = "morning" | "day" | "evening" | "night";

export interface VisitorMemory {
  visits: number;
  firstSeen: number;
  lastSeen: number;
  /** True when this is not their first time here. */
  returning: boolean;
  /** Whole days since the previous visit (0 if same day / first visit). */
  daysSinceLast: number;
  /** Short list of things the visitor has asked about (most recent last). */
  topics: string[];
}

const MAX_TOPICS = 6;

function blank(now: number): VisitorMemory {
  return { visits: 0, firstSeen: now, lastSeen: now, returning: false, daysSinceLast: 0, topics: [] };
}

export function readVisitorMemory(): VisitorMemory {
  if (typeof window === "undefined") return blank(Date.now());
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank(Date.now());
    const parsed = JSON.parse(raw) as Partial<VisitorMemory>;
    const now = Date.now();
    const lastSeen = typeof parsed.lastSeen === "number" ? parsed.lastSeen : now;
    return {
      visits: typeof parsed.visits === "number" ? parsed.visits : 0,
      firstSeen: typeof parsed.firstSeen === "number" ? parsed.firstSeen : now,
      lastSeen,
      returning: (parsed.visits ?? 0) > 0,
      daysSinceLast: Math.floor((now - lastSeen) / 86_400_000),
      topics: Array.isArray(parsed.topics) ? parsed.topics.filter((t): t is string => typeof t === "string").slice(-MAX_TOPICS) : [],
    };
  } catch {
    return blank(Date.now());
  }
}

/** Record a new visit. Returns the memory snapshot *before* this visit was added
    (so callers can tailor a "welcome back" message using the prior state). */
export function recordVisit(): VisitorMemory {
  const prior = readVisitorMemory();
  if (typeof window === "undefined") return prior;
  const now = Date.now();
  const next: VisitorMemory = {
    visits: prior.visits + 1,
    firstSeen: prior.visits === 0 ? now : prior.firstSeen,
    lastSeen: now,
    returning: prior.visits > 0,
    daysSinceLast: prior.visits === 0 ? 0 : Math.floor((now - prior.lastSeen) / 86_400_000),
    topics: prior.topics,
  };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* */ }
  return { ...prior, returning: prior.visits > 0 };
}

/** Remember a short snippet of what the visitor asked, deduped + capped. */
export function rememberTopic(text: string): void {
  if (typeof window === "undefined") return;
  const clean = text.trim().replace(/\s+/g, " ").slice(0, 80);
  if (clean.length < 4) return;
  try {
    const mem = readVisitorMemory();
    const topics = [...mem.topics.filter((t) => t.toLowerCase() !== clean.toLowerCase()), clean].slice(-MAX_TOPICS);
    localStorage.setItem(KEY, JSON.stringify({ ...mem, topics }));
  } catch { /* */ }
}

export function getDaypart(d: Date = new Date()): Daypart {
  const h = d.getHours();
  if (h >= 22 || h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "day";
  return "evening";
}
