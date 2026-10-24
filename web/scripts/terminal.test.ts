import test from "node:test";
import assert from "node:assert/strict";
import { ROOTS, ROUTES, VALID_DIRS, parseArguments, resolveTerminalPath, isCodeProject, formatDate, submitTerminalForm, validateTerminalForm, validateTerminalSnapshot, sanitizeBrowseUrl, type TerminalForm } from "../src/lib/terminal-shell";
import { randomFreeCell } from "../src/lib/terminal-games";
import type { Project } from "../src/lib/types";

test("every root and route alias resolves to a real virtual directory", () => {
  for (const root of ROOTS) assert.ok(VALID_DIRS.has(`/${root}`), root);
  for (const [alias, target] of Object.entries(ROUTES)) {
    assert.deepEqual(resolveTerminalPath([], alias), target);
    assert.ok(VALID_DIRS.has(`/${target.join("/")}`), alias);
  }
});

test("filesystem handles absolute, relative, parent, current and legacy paths", () => {
  assert.deepEqual(resolveTerminalPath([], "code"), ["engineering"]);
  assert.deepEqual(resolveTerminalPath([], "/code/./../articles"), ["articles"]);
  assert.deepEqual(resolveTerminalPath(["motion-and-graphics", "video-editing"], "../thumbnail-design"), ["motion-and-graphics", "thumbnail-design"]);
  assert.deepEqual(resolveTerminalPath(["articles"], "../../.."), []);
  assert.deepEqual(resolveTerminalPath(["articles"], "."), ["articles"]);
  assert.equal(resolveTerminalPath([], "missing"), null);
  assert.equal(resolveTerminalPath([], "constructor"), null);
  assert.equal(resolveTerminalPath([], "__proto__"), null);
});

test("quoted multiword titles and empty draft values survive parsing", () => {
  assert.deepEqual(parseArguments('"Jane Doe" jane@example.com "Project inquiry" "Hello there"').values, ["Jane Doe", "jane@example.com", "Project inquiry", "Hello there"]);
  assert.deepEqual(parseArguments('phone ""').values, ["phone", ""]);
  assert.equal(parseArguments('"unfinished').activeQuote, '"');
  assert.equal(parseArguments('"finished" ').hasTrailingSpace, true);
});

test("engineering listing includes current and legacy project categories", () => {
  for (const category of ["engineering", "coding-projects", "code"]) assert.ok(isCodeProject({ category } as Project));
  assert.ok(isCodeProject({ category: "other", extraCategories: ["engineering"] } as unknown as Project));
  assert.equal(isCodeProject({ category: "other" } as unknown as Project), false);
  assert.equal(formatDate("bad date"), "");
  assert.equal(formatDate("2026-02-09"), "February 9, 2026");
});

const form: TerminalForm = { name: "Test", email: "test@example.com", phone: "", subject: "Test", message: "Test message", identifier: "test@example.com" };

test("invalid form input is rejected before a request can be sent", async () => {
  let called = false;
  const fetcher = (async () => { called = true; return Response.json({ success: true }); }) as typeof fetch;
  await assert.rejects(submitTerminalForm("contact", { ...form, email: "invalid" }, fetcher), /valid email/);
  assert.equal(called, false);
  assert.throws(() => validateTerminalForm("contact", { ...form, name: " " }), /name/);
  assert.throws(() => validateTerminalForm("unsubscribe", { ...form, identifier: "invalid" }), /valid email/);
});

test("all form modes use their correct endpoint and preserve required payloads", async () => {
  for (const mode of ["contact", "subscribe", "unsubscribe"] as const) {
    const fetcher = (async (url, init) => {
      assert.equal(url, `/api/${mode}`);
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body));
      if (mode === "unsubscribe") assert.equal(body.identifier, form.identifier);
      else { assert.equal(body.consent, true); assert.equal(body.email, form.email); }
      return Response.json({ success: true });
    }) as typeof fetch;
    await submitTerminalForm(mode, form, fetcher);
  }
});

test("server errors, malformed bodies and unconfirmed replies never report success", async () => {
  const responses = [Response.json({ error: "Too many requests" }, { status: 429 }), Response.json({ success: false }), new Response("not JSON"), new Response(null, { status: 204 })];
  for (const response of responses) await assert.rejects(submitTerminalForm("contact", form, (async () => response) as typeof fetch));
  await assert.rejects(submitTerminalForm("subscribe", form, (async () => { throw new Error("Offline"); }) as typeof fetch), /Offline/);
  await assert.rejects(submitTerminalForm("unsubscribe", form, (async () => Response.json({ success: false, message: "No subscribed record" }, {status:400})) as typeof fetch), /No subscribed record/);
});

test("malformed portfolio snapshots are rejected before rendering", () => {
  for (const value of [null, {}, { projects: "invalid" }]) assert.throws(() => validateTerminalSnapshot(value));
  const snapshot = Object.fromEntries(["projects", "featuredProjects", "articles", "clients", "featuredClients", "experiences", "educations", "skills", "certifications", "awards", "clubs"].map(key => [key, []]));
  assert.doesNotThrow(() => validateTerminalSnapshot(snapshot));
});

test("browser accepts web addresses, enforces existing filters and rejects unsafe schemes", () => {
  assert.equal(sanitizeBrowseUrl("example.com").url, "https://example.com/");
  for (const url of ["javascript:alert(1)", "data:text/html,test", "ftp://example.com", "https://user:secret@example.com"]) assert.equal(sanitizeBrowseUrl(url).url, "");
  assert.equal(sanitizeBrowseUrl("https://sub.pornhub.com").blocked, true);
  assert.match(sanitizeBrowseUrl("https://google.com/search?q=hello").url, /safe=strict/);
});

test("Snake spawns only in free cells and terminates on a full board", () => {
  const occupied = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  assert.deepEqual(randomFreeCell(occupied, 2), { x: 1, y: 1 });
  assert.equal(randomFreeCell([...occupied, { x: 1, y: 1 }], 2), null);
});
