export const DEFAULT_ASSISTANT_TOKEN_CAP = 5_000_000;
export function configuredTokenCap(value?: string) {
  const cap = Number(value || DEFAULT_ASSISTANT_TOKEN_CAP);
  return Number.isFinite(cap) ? Math.max(1000, Math.min(10000000, Math.floor(cap))) : DEFAULT_ASSISTANT_TOKEN_CAP;
}
