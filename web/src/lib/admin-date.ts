/** Format precise dates without inventing a day for editorial years or ranges. */
function savedDate(value?: string): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  return /^invalid date$/i.test(text) ? "" : text;
}

function calendarDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(text);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function fmtDate(value?: string): string {
  const text = savedDate(value);
  if (!text) return "—";
  const date = calendarDate(text);
  if (!date || (text.includes("T") && Number.isNaN(new Date(text).getTime()))) return text;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function fmtDateTime(value?: string): string {
  const text = savedDate(value);
  if (!text) return "—";
  // Calendar dates, year-only values, and human ranges have no recorded time.
  if (!text.includes("T")) return fmtDate(text);
  if (!calendarDate(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
