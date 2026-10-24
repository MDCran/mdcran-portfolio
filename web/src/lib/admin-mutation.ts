/** A successful write followed by a failed refresh must never be reported as a
 * failed write: repeating a command could send it twice or delete more data. */
export async function completeAdminMutation<T>(write: () => Promise<T>, refresh: () => Promise<unknown>) {
  const value = await write();
  try { await refresh(); return { value, refreshError: null }; }
  catch (error) { return { value, refreshError: error instanceof Error ? error.message : "The latest data could not be loaded." }; }
}

export function bookingTimezoneValid(timezone: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); return timezone.trim().length > 0; }
  catch { return false; }
}

export function identityTrackingUrl(path: string, id: string): string {
  const base = new URL("https://mdcran.com");
  const target = new URL(path.startsWith("/") ? path : `/${path}`, base);
  if (target.origin !== base.origin) throw new Error("Choose a path on mdcran.com.");
  target.searchParams.set("identity", id);
  return target.href;
}
