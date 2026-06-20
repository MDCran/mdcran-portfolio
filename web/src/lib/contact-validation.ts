const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizePhone(value: string | undefined | null) {
  return String(value ?? "").trim();
}

// Auto-formats a phone number as the user types.
// US 10-digit: (555) 123-4567  |  US with country code: +1 (555) 123-4567
// Other international (+XX...): preserves +prefix with digits
export function formatPhoneInput(raw: string): string {
  const trimmed = raw.trimStart();
  const hasPlus = trimmed.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hasPlus) {
    if (digits.length === 0) return "+";
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return `+${digits}`;
  }

  const d = digits.slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isValidEmail(value: string) {
  const normalized = normalizeEmail(value);
  return Boolean(normalized) && EMAIL_PATTERN.test(normalized);
}

export function isValidPhoneNumber(value: string) {
  const normalized = normalizePhone(value);
  if (!normalized) return false;
  if (!/^\+?[\d\s().-]+$/.test(normalized)) return false;

  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  return true;
}
