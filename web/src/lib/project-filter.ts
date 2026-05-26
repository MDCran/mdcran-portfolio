export type DateMode = "any" | "before" | "after" | "between";

export interface AdvancedFilters {
  dateMode: DateMode;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  clientIds: string[];
}

export const EMPTY_ADVANCED: AdvancedFilters = { dateMode: "any", clientIds: [] };

export function activeAdvancedCount(f: AdvancedFilters): number {
  let n = 0;
  if (f.dateMode !== "any") n++;
  if (f.clientIds.length) n++;
  return n;
}

/** Parse "MM-YYYY" | "MM-DD-YYYY" | "YYYY-MM-DD" | ISO → epoch ms (start of day), or null. */
function toTime(date?: string): number | null {
  if (!date) return null;
  let m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return Date.UTC(+m[3], +m[1] - 1, +m[2]);
  m = date.match(/^(\d{2})-(\d{4})$/);
  if (m) return Date.UTC(+m[2], +m[1] - 1, 1);
  const t = new Date(date).getTime();
  return isNaN(t) ? null : t;
}

export function projectMatchesAdvanced(
  item: { publishDate?: string; clientIds?: string[] },
  f: AdvancedFilters
): boolean {
  // Client filter (multi-select, OR)
  if (f.clientIds.length) {
    const ids = item.clientIds ?? [];
    if (!f.clientIds.some((id) => ids.includes(id))) return false;
  }
  // Date filter
  if (f.dateMode !== "any") {
    const t = toTime(item.publishDate);
    if (t == null) return false;
    const from = toTime(f.dateFrom);
    const to = toTime(f.dateTo);
    if (f.dateMode === "before" && to != null && t > to) return false;
    if (f.dateMode === "after" && from != null && t < from) return false;
    if (f.dateMode === "between") {
      if (from != null && t < from) return false;
      if (to != null && t > to) return false;
    }
  }
  return true;
}
