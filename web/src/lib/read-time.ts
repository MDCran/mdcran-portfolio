import type { ArticleSection } from "./types";

/** Read time in minutes: 0–150 words = 1 min, 150–300 = 2 min, etc. */
export function readMinutesFromWords(words: number): number {
  return Math.max(1, Math.ceil(words / 150));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function sectionsWordCount(sections?: ArticleSection[]): number {
  if (!sections) return 0;
  let n = 0;
  for (const s of sections) {
    for (const v of Object.values(s)) {
      if (typeof v === "string") n += countWords(v);
      else if (Array.isArray(v)) for (const x of v) if (typeof x === "string") n += countWords(x);
    }
  }
  return n;
}

export function articleReadMinutes(a: { title?: string; excerpt?: string; sections?: ArticleSection[] }): number {
  return readMinutesFromWords(countWords([a.title ?? "", a.excerpt ?? ""].join(" ")) + sectionsWordCount(a.sections));
}

export function projectReadMinutes(p: { title?: string; description?: string; longDescription?: string; sections?: ArticleSection[] }): number {
  return readMinutesFromWords(
    countWords([p.title ?? "", p.description ?? "", p.longDescription ?? ""].join(" ")) + sectionsWordCount(p.sections)
  );
}

/** Format "MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD" or ISO into "Aug 1, 2025" (or "Aug 2025" when no day). */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatPublishDate(date?: string): string {
  if (!date) return "";
  let m = date.match(/^(\d{4})-(\d{2})-(\d{2})/); // YYYY-MM-DD / ISO
  if (m) return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  m = date.match(/^(\d{2})-(\d{2})-(\d{4})$/); // MM-DD-YYYY
  if (m) return `${MONTHS[+m[1] - 1]} ${+m[2]}, ${m[3]}`;
  m = date.match(/^(\d{2})-(\d{4})$/); // MM-YYYY
  if (m) return `${MONTHS[+m[1] - 1]} ${m[2]}`;
  const d = new Date(date);
  if (!isNaN(d.getTime())) return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return date;
}
