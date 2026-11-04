import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import { createSlidesSession, matchesSlidesPin, SLIDES_COOKIE, SLIDES_PATH, SLIDES_SESSION_SECONDS, verifySlidesSession } from "../src/lib/slides-access";
import { slidesClientAddress } from "../src/lib/slides-pin-rate-limit";

test("only the specified four-digit PIN is accepted", () => {
  assert.equal(matchesSlidesPin("1106"), true);
  for (const pin of ["0000", "1107", "01106", "1106 ", "", 1106, null, ["1106"], "１１０６"]) assert.equal(matchesSlidesPin(pin), false);
});

test("sessions expire, reject tampering, and require the server's signing secret", (t) => {
  const original = process.env.SLIDES_SESSION_SECRET;
  process.env.SLIDES_SESSION_SECRET = "unit-test-slides-secret-one";
  t.after(() => { if (original === undefined) delete process.env.SLIDES_SESSION_SECRET; else process.env.SLIDES_SESSION_SECRET = original; });
  const now = 1_800_000_000_000;
  const token = createSlidesSession(now);
  assert.equal(verifySlidesSession(token, now), true);
  assert.equal(verifySlidesSession(token, now + SLIDES_SESSION_SECONDS * 1000 - 1), true);
  assert.equal(verifySlidesSession(token, now + SLIDES_SESSION_SECONDS * 1000), false);
  assert.equal(verifySlidesSession(token.replace("v1.", "v2."), now), false);
  assert.equal(verifySlidesSession(`${token}.extra`, now), false);
  const parts = token.split(".");
  assert.equal(verifySlidesSession(`v1.${Number(parts[1]) + 1}.${parts[2]}`, now), false);
  assert.equal(verifySlidesSession(`${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`, now), false);
  process.env.SLIDES_SESSION_SECRET = "unit-test-slides-secret-two";
  assert.equal(verifySlidesSession(token, now), false);
  delete process.env.SLIDES_SESSION_SECRET;
  const originalJwt = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try { assert.equal(verifySlidesSession(token, now), false); assert.throws(() => createSlidesSession(now)); }
  finally { if (originalJwt !== undefined) process.env.JWT_SECRET = originalJwt; }
});

test("direct images, videos, fonts, encoded paths and optimized images require a signed session", (t) => {
  const original = process.env.SLIDES_SESSION_SECRET;
  process.env.SLIDES_SESSION_SECRET = "unit-test-slides-proxy-secret";
  t.after(() => { if (original === undefined) delete process.env.SLIDES_SESSION_SECRET; else process.env.SLIDES_SESSION_SECRET = original; });
  const assets = [`${SLIDES_PATH}/skyway.webp`, `${SLIDES_PATH}/after-dark.mp4`, `${SLIDES_PATH}/fonts/Inter-Variable.woff2`, "/slides/%74heanywherecompany/skyway.webp", `/_next/image?url=${encodeURIComponent(`${SLIDES_PATH}/skyway.webp`)}&w=640&q=75`];
  for (const asset of assets) {
    const url = `https://www.mdcran.com${asset}`;
    assert.equal(proxy(new NextRequest(url)).status, 401, asset);
    assert.equal(proxy(new NextRequest(url, { method: "HEAD", headers: { cookie: `${SLIDES_COOKIE}=fake` } })).status, 401);
    const allowed = proxy(new NextRequest(url, { headers: { cookie: `${SLIDES_COOKIE}=${createSlidesSession()}` } }));
    assert.equal(allowed.status, 200, asset);
    assert.equal(allowed.headers.get("Cache-Control"), "private, no-store");
  }
  assert.equal(proxy(new NextRequest("https://www.mdcran.com/unrelated-image.png")).status, 200);
  assert.equal(proxy(new NextRequest(`https://www.mdcran.com${SLIDES_PATH}`)).headers.get("Cache-Control"), "private, no-store");
});

test("the PIN limiter uses the platform IP and ignores spoofable fallback headers", () => {
  assert.equal(slidesClientAddress(new Headers({ "x-forwarded-for": "203.0.113.4, 10.0.0.1", "cf-connecting-ip": "1.2.3.4" })), "203.0.113.4");
  assert.equal(slidesClientAddress(new Headers({ "cf-connecting-ip": "1.2.3.4" })), "unknown");
  assert.equal(slidesClientAddress(new Headers({ "x-forwarded-for": "anything" })), "unknown");
});
