const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizePhone(value: string | undefined | null) {
  return String(value ?? "").trim();
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
