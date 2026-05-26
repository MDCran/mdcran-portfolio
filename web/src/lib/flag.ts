/** Convert a 2-letter ISO country code (e.g. "US") to its flag emoji. */
export function flagEmoji(code?: string | null): string {
  if (!code || code.length !== 2) return "🏳️";
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}
