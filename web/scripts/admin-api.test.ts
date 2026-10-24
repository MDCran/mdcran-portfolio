import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { readAdminObject, statusService, statusIncident, visitorAdjustment, bookingConfig, utmLink } from "../src/lib/admin-api-validation";
const DEFAULT_BOOKING_CONFIG = {
  enabled: false, icalUrl: "", timezone: "America/New_York", blockHolidays: true,
  hours: Array.from({ length: 7 }, () => ({ enabled: true, start: "09:00", end: "17:00" })),
  minNoticeDays: 2, maxAdvanceDays: 30, maxPerDay: 4, bufferMinutes: 30,
  slotIntervalMinutes: 30, blackouts: [], meetingTypes: [],
};

test("admin JSON boundary rejects malformed, null and array bodies", async () => {
  for (const body of ["{", "null", "[]", '"text"']) {
    await assert.rejects(readAdminObject(new Request("http://localhost/test", { method: "POST", body })), error => error instanceof Error && "status" in error && error.status === 400);
  }
  assert.deepEqual(await readAdminObject(new Request("http://localhost/test", { method: "POST", body: '{"name":"ok"}' })), { name: "ok" });
});

test("status records require usable fields and preserve server-owned metadata", () => {
  assert.throws(() => statusService({ name: "" }));
  assert.throws(() => statusService({ name: "Service", pingUrl: "javascript:alert(1)" }));
  assert.throws(() => statusService({ name: "Service", sortOrder: "2" }));
  const service = statusService({ name: " Service ", defunct: true, type: "service", _id: "injected" });
  assert.equal(service.name, "Service");
  assert.equal(service.defunct, true);
  assert.equal("_id" in service, false);
  const updated = statusService({ name: "Renamed", createdAt: "bad" }, service);
  assert.equal(updated.createdAt, service.createdAt);
  assert.equal(updated.id, service.id);
  const base = { serviceId: service.id, title: "Outage", message: "Investigating", startedAt: "2026-01-01T00:00:00.000Z" };
  for (const invalid of [{ severity: "urgent" }, { severity: ["minor"] }, { status: ["resolved"] }, { status: "bad" }, { serviceId: {} }, { message: [] }, { startedAt: "not a date" }]) {
    assert.throws(() => statusIncident({ ...base, ...invalid }));
  }
  const resolved = statusIncident({ ...base, status: "resolved", resolvedAt: "2026-01-02T00:00:00.000Z" });
  assert.ok(resolved.resolvedAt);
  assert.equal(statusIncident({ status: "investigating" }, resolved).resolvedAt, undefined);
  assert.throws(() => statusIncident({ ...base, status: "resolved", resolvedAt: "2025-12-31T00:00:00.000Z" }));
});

test("visitor adjustments reject nonnumeric, fractional and unsafe counts", () => {
  for (const addedCount of ["abc", "20", NaN, Infinity, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => visitorAdjustment({ country: "US", countryName: "United States", addedCount }));
  }
  const adjustment = visitorAdjustment({ country: "us", countryName: " United States ", addedCount: 20 });
  assert.equal(adjustment.country, "US");
  assert.equal(adjustment.addedCount, 20);
  assert.throws(() => visitorAdjustment({ country: { $ne: "" }, countryName: "Unknown", addedCount: 20 }));
});

test("booking settings reject configurations that break slot generation", () => {
  assert.deepEqual(bookingConfig({ ...DEFAULT_BOOKING_CONFIG }), DEFAULT_BOOKING_CONFIG);
  for (const patch of [
    { timezone: "Not/AZone" }, { hours: Array(7).fill(null) },
    { hours: Array(7).fill({ enabled: true, start: "17:00", end: "09:00" }) },
    { hours: Array(7).fill({ enabled: true, start: "25:00", end: "26:00" }) },
    { blackouts: [{ start: "2026-02-30", end: "2026-03-01" }] },
    { blackouts: [{ start: "2026-03-02", end: "2026-03-01" }] },
    { meetingTypes: [{ id: "x", name: "Call", location: "Meet", enabled: true, durations: [0] }] },
    { maxAdvanceDays: 1, minNoticeDays: 5 }, { icalUrl: "file:///calendar.ics" },
  ]) assert.throws(() => bookingConfig({ ...DEFAULT_BOOKING_CONFIG, ...patch }));
});

test("admin tokens require admin role, expiry and the issued signing algorithm", async () => {
  const secret = "admin-api-unit-test-secret-only";
  process.env.JWT_SECRET = secret;
  const { verifyAdminToken, signAdminToken } = await import("../src/lib/auth");
  assert.equal(verifyAdminToken(signAdminToken()), true);
  assert.equal(verifyAdminToken(jwt.sign({ role: "visitor" }, secret, { expiresIn: "1h" })), false);
  assert.equal(verifyAdminToken(jwt.sign({ role: "admin" }, secret)), false);
  assert.equal(verifyAdminToken(jwt.sign({ role: "admin" }, secret, { algorithm: "HS384", expiresIn: "1h" })), false);
  assert.equal(verifyAdminToken(jwt.sign({ role: "admin" }, secret, { expiresIn: -1 })), false);
  assert.equal(verifyAdminToken(jwt.sign({ role: "admin" }, "wrong", { expiresIn: "1h" })), false);
});


test("saved tracking links use validated destinations and authoritative tracking fields", () => {
  const base = { label: "Campaign", baseUrl: "https://example.com/page?utm_term=old#section", source: "linkedin", medium: "social", campaign: "launch", url: "javascript:alert(1)" };
  const saved = utmLink(base);
  const url = new URL(saved.url);
  assert.equal(url.origin, "https://example.com");
  assert.equal(url.searchParams.get("utm_campaign"), "launch");
  assert.equal(url.searchParams.has("utm_term"), false);
  assert.equal(url.hash, "#section");
  assert.throws(() => utmLink({ ...base, baseUrl: "javascript:alert(1)" }));
  assert.throws(() => utmLink({ ...base, id: { $ne: "" } }));
});
