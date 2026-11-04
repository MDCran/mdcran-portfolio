// Server-side only: never import this module from a client component.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SLIDES_PATH = "/slides/theanywherecompany";
export const SLIDES_COOKIE = "mdcran_anywhere_slides";
export const SLIDES_SESSION_SECONDS = 12 * 60 * 60;
const pinHash = "fb7bab9edf08f024aabf3501518399e82ab590666207a8b0ab7963b181ecf4b8";

function signingSecret() {
  const secret = process.env.SLIDES_SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("Slideshow session signing is not configured");
  return secret;
}

function signature(expires: string) {
  return createHmac("sha256", signingSecret()).update(`anywhere-slides:session:v1:${pinHash}:${expires}`).digest("base64url");
}

export function matchesSlidesPin(pin: unknown): boolean {
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) return false;
  return timingSafeEqual(createHash("sha256").update(pin).digest(), Buffer.from(pinHash, "hex"));
}

export function createSlidesSession(now = Date.now()): string {
  const expires = String(now + SLIDES_SESSION_SECONDS * 1000);
  return `v1.${expires}.${signature(expires)}`;
}

export function verifySlidesSession(token: string | undefined, now = Date.now()): boolean {
  if (!token || token.length > 160) return false;
  const [version, expires, supplied, extra] = token.split(".");
  if (version !== "v1" || extra !== undefined || !/^\d{13}$/.test(expires ?? "") || !/^[\w-]{43}$/.test(supplied ?? "")) return false;
  if (Number(expires) <= now || Number(expires) > now + SLIDES_SESSION_SECONDS * 1000 + 60_000) return false;
  try {
    return timingSafeEqual(Buffer.from(supplied), Buffer.from(signature(expires)));
  } catch {
    return false;
  }
}

export function slidesRateKey(client: string): string {
  return createHmac("sha256", signingSecret()).update(`anywhere-slides:attempt:${client}`).digest("hex");
}

export function normalizedSlidesPath(path: string): string {
  try { return new URL(decodeURIComponent(path), "https://local.invalid").pathname; }
  catch { return path; }
}

export function isSlidesMediaPath(path: string): boolean {
  return normalizedSlidesPath(path).startsWith(`${SLIDES_PATH}/`);
}

export function isSlidesImageRequest(url: string, origin: string): boolean {
  try { return isSlidesMediaPath(new URL(url, origin).pathname); }
  catch { return false; }
}
