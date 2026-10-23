/** Dates must come from a saved public record; never manufacture chronology. */
export function validPublishDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  let y = 0,
    m = 1,
    d = 1;
  let match = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?(?:T.*)?$/);
  if (match) {
    y = +match[1];
    m = +match[2];
    d = +(match[3] || 1);
  } else {
    match = value.match(/^(\d{2})-(?:(\d{2})-)?(\d{4})$/);
    if (!match) return null;
    m = +match[1];
    d = +(match[2] || 1);
    y = +match[3];
  }
  if (
    y < 1900 ||
    y > new Date().getFullYear() + 1 ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  )
    return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
    ? date
    : null;
}
export function effectiveProjectDate(p: { publishDate?: string }): string {
  return validPublishDate(p.publishDate) ? p.publishDate!.trim() : "";
}
