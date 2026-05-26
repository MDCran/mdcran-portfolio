/* Deterministic placeholder dates for projects that have no saved publish date.
   The same project always maps to the same date (derived from its id/slug), so it
   never flickers between renders. Range: Jan 1 2021 → Dec 31 2024. */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Stable "MM-DD-YYYY" date in [2021-01-01, 2024-12-31] derived from a seed. */
export function synthProjectDate(seed: string): string {
  const start = Date.UTC(2021, 0, 1);
  const end = Date.UTC(2024, 11, 31);
  const days = Math.floor((end - start) / 86_400_000);
  const offset = hashStr(seed || "mdcran") % (days + 1);
  const d = new Date(start + offset * 86_400_000);
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${d.getUTCFullYear()}`;
}

type DatedProject = { id?: string; slug?: string; title?: string; publishDate?: string };

/** Real publish date if set, otherwise a stable synthetic one. */
export function effectiveProjectDate(p: DatedProject): string {
  if (p.publishDate && p.publishDate.trim()) return p.publishDate;
  return synthProjectDate(p.id || p.slug || p.title || "");
}

/** True when the project has no real saved date (so the displayed date is synthetic). */
export function isSyntheticDate(p: { publishDate?: string }): boolean {
  return !(p.publishDate && p.publishDate.trim());
}
