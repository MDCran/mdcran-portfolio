import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

const origin = process.env.SMOKE_ORIGIN ?? "http://localhost:48124";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Admin smoke tests require an isolated local server.");
if (!process.env.JWT_SECRET) throw new Error("Set the isolated server JWT_SECRET.");
const transport = { "x-forwarded-proto": "https" };
const auth = { ...transport, Cookie: `mdcran_admin_token=${jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "15m" })}`, "Content-Type": "application/json" };
const routes = ["projects", "articles", "clients", "resume", "site-content", "contacts", "campaigns", "booking", "rizz", "taps", "rate-limits", "visitors", "sessions", "identities", "device-candidates", "analytics", "analytics/overview", "operations", "publishing", "content-health", "ai-studio", "ai-routing", "discord", "status", "utm-links"];
for (const route of routes) {
  const path = `/api/admin/${route}`;
  assert.equal((await fetch(origin + path, { headers: transport })).status, 401, `Unauthenticated ${route}`);
  const response = await fetch(origin + path, { headers: auth });
  assert.equal(response.status, 200, `Authenticated ${route}: ${await response.clone().text()}`);
  assert.ok(await response.json(), `${route} returns JSON`);
  console.log(`Admin API passed: ${route}`);
}
const malformed = await fetch(origin + "/api/admin/status", { method: "POST", headers: auth, body: "{" });
assert.equal(malformed.status, 400, "Malformed status JSON");
const invalidBooking = await fetch(origin + "/api/admin/booking", { method: "PUT", headers: auth, body: JSON.stringify({ timezone: "Invalid/Zone" }) });
assert.equal(invalidBooking.status, 400, "Invalid booking settings are rejected");
const visitorCookie = { ...transport, Cookie: `mdcran_admin_token=${jwt.sign({ role: "visitor" }, process.env.JWT_SECRET, { expiresIn: "10m" })}` };
assert.equal((await fetch(origin + "/api/admin/projects", { headers: visitorCookie })).status, 401, "A signed non-admin token must not grant admin access");
console.log("Admin HTTP audit passed. No production writes or outbound messages.");
