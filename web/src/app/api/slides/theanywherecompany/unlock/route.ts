import { NextRequest, NextResponse } from "next/server";
import { createSlidesSession, matchesSlidesPin, SLIDES_COOKIE, SLIDES_PATH, SLIDES_SESSION_SECONDS } from "@/lib/slides-access";
import { consumeSlidesPinAttempt } from "@/lib/slides-pin-rate-limit";

export const runtime = "nodejs";

function reply(body: object, status: number, retryAfter?: number) {
  return NextResponse.json(body, { status, headers: {
    "Cache-Control": "private, no-store",
    ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
  } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin || !request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ error: "This request is not allowed." }, 403);
  }
  try {
    const attempt = await consumeSlidesPinAttempt(request.headers);
    const locked = () => reply({ error: "Too many attempts. Try again shortly.", retryAfter: attempt.retryAfter }, 429, attempt.retryAfter);
    if (!attempt.allowed) return locked();
    let pin: unknown;
    try {
      const text = await request.text();
      if (text.length <= 128) pin = JSON.parse(text)?.pin;
    } catch { /* Invalid input still consumes an attempt. */ }
    if (!matchesSlidesPin(pin)) {
      return attempt.remaining === 0 ? locked() : reply({ error: "Incorrect PIN.", remaining: attempt.remaining }, 401);
    }
    const response = reply({ ok: true }, 200);
    response.cookies.set(SLIDES_COOKIE, createSlidesSession(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: SLIDES_PATH, maxAge: SLIDES_SESSION_SECONDS,
    });
    return response;
  } catch {
    return reply({ error: "Unable to unlock right now. Please try again shortly." }, 503, 30);
  }
}
