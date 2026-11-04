import { isIP } from "node:net";
import { slidesRateKey } from "./slides-access";

export const SLIDES_PIN_ATTEMPTS = 5;
export const SLIDES_PIN_WINDOW_MS = 15 * 60 * 1000;
type PinAttempt = { _id: string; count: number; resetAt: Date };
let indexReady: Promise<unknown> | undefined;

/** Vercel replaces X-Forwarded-For; do not prefer a caller-supplied CF header. */
export function slidesClientAddress(headers: Headers): string {
  const value = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  return isIP(value) ? value : "unknown";
}

/** Atomic, shared across instances, and deliberately fail-closed on database errors. */
export async function consumeSlidesPinAttempt(headers: Headers, now = Date.now()) {
  const { getDb } = await import("./mongodb");
  const db = await getDb();
  const collection = db.collection<PinAttempt>("slidePinAttempts");
  indexReady ??= collection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 86400 }).catch((error) => { indexReady = undefined; throw error; });
  await indexReady;
  const expired = { $lte: [{ $ifNull: ["$resetAt", new Date(0)] }, new Date(now)] };
  const update = [{ $set: {
    count: { $cond: [expired, 1, { $min: [{ $add: [{ $ifNull: ["$count", 0] }, 1] }, SLIDES_PIN_ATTEMPTS + 1] }] },
    resetAt: { $cond: [expired, new Date(now + SLIDES_PIN_WINDOW_MS), "$resetAt"] },
  } }];
  const id = slidesRateKey(slidesClientAddress(headers));
  const consume = () => collection.findOneAndUpdate({ _id: id }, update, { upsert: true, returnDocument: "after" });
  let attempt: PinAttempt | null;
  try { attempt = await consume(); }
  catch (error) {
    // Two first requests can race to insert the unique _id. Retry the increment.
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    attempt = await consume();
  }
  if (!attempt) throw new Error("PIN attempt could not be recorded");
  return {
    allowed: attempt.count <= SLIDES_PIN_ATTEMPTS,
    remaining: Math.max(0, SLIDES_PIN_ATTEMPTS - attempt.count),
    retryAfter: Math.max(1, Math.ceil((attempt.resetAt.getTime() - now) / 1000)),
  };
}
