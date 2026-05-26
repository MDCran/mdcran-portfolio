import { getDb } from "./mongodb";
import type { NextRequest } from "next/server";

/** Client IP from the usual proxy headers (Cloudflare / Vercel). */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Sliding-window-ish per-key rate limit (MongoDB-backed; persists across instances).
 * Returns true if the call is allowed, false if the limit is exceeded.
 * Keyed by scope + id (e.g. IP and/or session) so different APIs are independent.
 */
export async function apiRateLimit(scope: string, id: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const db = await getDb();
    const col = db.collection("apiRateLimits");
    const key = `${scope}:${id}`;
    const now = Date.now();
    const entry = await col.findOne({ key });
    if (!entry || now > new Date(entry.resetAt).getTime()) {
      await col.updateOne(
        { key },
        { $set: { key, scope, id, count: 1, resetAt: new Date(now + windowMs).toISOString() } },
        { upsert: true },
      );
      return true;
    }
    if ((entry.count as number) >= limit) return false;
    await col.updateOne({ key }, { $inc: { count: 1 } });
    return true;
  } catch {
    // Never block the API on a rate-limiter failure.
    return true;
  }
}

/** Convenience: limit by IP + (optional) session id together; both must pass. */
export async function limitVoiceLike(req: NextRequest, scope: string, perHour: number): Promise<boolean> {
  const ip = clientIp(req);
  const session = req.headers.get("x-mdcran-session") || "";
  const windowMs = 60 * 60 * 1000;
  const ipOk = await apiRateLimit(`${scope}:ip`, ip, perHour, windowMs);
  if (!ipOk) return false;
  if (session) {
    const sessOk = await apiRateLimit(`${scope}:sid`, session, perHour, windowMs);
    if (!sessOk) return false;
  }
  return true;
}
