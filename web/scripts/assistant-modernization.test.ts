import test from "node:test";
import assert from "node:assert/strict";
import { rankPublicRecords, safePublicPath, validatedCitations, type EvidenceSource } from "../src/lib/assistant-evidence";
import { validateSiteActions, sanitizeLegacyActions, PUBLIC_SITE_PATHS } from "../src/lib/assistant-actions";
import { assistantEvaluations } from "../src/lib/assistant-evals";
import { readAssistantPreferences, saveAssistantPreferences, memoryScopeChanged } from "../src/lib/assistant-preferences";
import { readVisitorMemory, rememberTopic, editRememberedTopics } from "../src/lib/visitor-memory";
import { offerConversation, takeConversation } from "../src/lib/conversation-handoff";
import { playStreamingSpeech } from "../src/lib/assistant-audio";
import { providerCancellation, relayProviderBody } from "../src/lib/assistant-lifecycle";
import { configuredTokenCap } from "../src/lib/assistant-budget-policy";

test("retrieval maps visitor language to actual public technology evidence", () => {
  const records = ["Minecraft map events", "Coretex AI agents TypeScript", "Health Tracker React Native mobile", "Portfolio Next.js full-stack", "Cloud infrastructure Docker AWS"];
  for (const [query, expected] of [["artificial intelligence orchestration", records[1]], ["Android experience", records[2]], ["devops hosting", records[4]], ["fullstack web apps", records[3]]]) assert.equal(rankPublicRecords(records, s => s, query, 1)[0], expected, query);
  assert.deepEqual(rankPublicRecords([], String, "hidden project", 5), []);
});
test("source cards require exact catalog-backed public citations", () => {
  const catalog: EvidenceSource[] = [{ id: "core", title: "Core", href: "/engineering/core", kind: "project", excerpt: "Public summary" }, { id: "contracts", title: "Contracts", href: "https://github.com/example/contracts", kind: "source", excerpt: "Contracts only" }];
  assert.deepEqual(validatedCitations("[fake](https://evil.test) [private](/admin) [wrong](https://github.com/example/contracts-private)", catalog), []);
  assert.deepEqual(validatedCitations("[source](/engineering/core#architecture) [again](/engineering/core)", catalog).map(s => s.id), ["core"]);
  assert.deepEqual(validatedCitations("[Contracts](https://github.com/example/contracts)", catalog).map(s => s.id), ["contracts"]);
});
test("site actions reject external, private, unknown, malformed and excessive operations", () => {
  for (const path of ["//evil.test", "/admin", "/api/chat", "/dashboard/private", "/private", "javascript:alert(1)", "/%61dmin", "/resume/../admin", "/resume?redirect=evil"]) assert.equal(safePublicPath(path), false, path);
  const paths = ["/resume", "/engineering/core"];
  assert.deepEqual(validateSiteActions({ actions: [{ type: "navigate", value: "/made-up" }, { type: "project", value: "hidden-project" }, { type: "theme", value: "custom-script" }, { type: "sendEmail", value: "submit" }] }, paths, ["core"]), []);
  assert.equal(validateSiteActions({ actions: [{ type: "navigate", value: "/resume#skills" }, { type: "project", value: "core" }, { type: "theme", value: "high-contrast" }, { type: "textSize", value: "large" }, { type: "highlight", value: "skills" }] }, paths, ["core"]).length, 4);
  assert.deepEqual(validateSiteActions(null), []);
});
test("topic editing rotates recall scope and drops handoff so deleted context cannot return", () => {
  const values = new Map<string, string>(); const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(globalThis, key, { configurable: true, value: storage });
  Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
  try {
    editRememberedTopics(["must not save"]); assert.deepEqual(readVisitorMemory().topics, []);
    saveAssistantPreferences({ ...readAssistantPreferences(), memory: true }); rememberTopic("delete this");
    const before = readAssistantPreferences().memoryEpoch; offerConversation([{ role: "user", content: "delete this" }]);
    editRememberedTopics(["React evidence"]);
    assert.notEqual(readAssistantPreferences().memoryEpoch, before); assert.deepEqual(readVisitorMemory().topics, ["React evidence"]); assert.deepEqual(takeConversation(), []);
    editRememberedTopics([]); assert.deepEqual(readVisitorMemory().topics, []);
  } finally { for (const key of ["localStorage", "sessionStorage", "window"]) Reflect.deleteProperty(globalThis, key); }
});
test("unsupported streaming playback preserves the body for existing audio fallback", async () => {
  const response = new Response(new Uint8Array([1, 2, 3]));
  const streamed = await playStreamingSpeech(response, { signal: new AbortController().signal, context: {} as AudioContext, onStart: () => assert.fail("Must not start unsupported audio") });
  assert.equal(streamed, false); assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
});
test("cancelled streaming speech releases audio without starting playback", async () => {
  const originalCreate = URL.createObjectURL; const originalRevoke = URL.revokeObjectURL;
  let paused = 0; let revoked = 0;
  class FakeMediaSource extends EventTarget { static isTypeSupported() { return true; } }
  class FakeAudio { setAttribute() {} pause() { paused++; } removeAttribute() {} load() {} }
  Object.defineProperty(globalThis, "MediaSource", { value: FakeMediaSource, configurable: true });
  Object.defineProperty(globalThis, "Audio", { value: FakeAudio, configurable: true });
  URL.createObjectURL = () => "blob:test"; URL.revokeObjectURL = () => { revoked++; };
  try {
    const controller = new AbortController(); controller.abort();
    await assert.rejects(playStreamingSpeech(new Response(new Uint8Array([1])), { signal: controller.signal, context: {} as AudioContext, onStart: () => assert.fail("Cancelled audio must not play") }), { name: "AbortError" });
    assert.ok(paused > 0); assert.equal(revoked, 1);
  } finally { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; Reflect.deleteProperty(globalThis, "Audio"); Reflect.deleteProperty(globalThis, "MediaSource"); }
});
test("evaluation scenarios cover recruiter, citation, private-scope and interruption regressions", () => {
  for (const id of ["recruiter", "citation", "private-scope", "interruption", "unknown-skill", "injection"]) assert.ok(assistantEvaluations.some(e => e.id === id));
});
test("normal site galleries remain valid actions while malformed legacy markers are discarded", () => {
  for (const path of ["/terminal", "/coretv", "/status", "/arts-and-entertainment/minecraft-maps", "/motion-and-graphics/video-editing"]) assert.equal(validateSiteActions({ actions: [{ type: "navigate", value: path }] }, PUBLIC_SITE_PATHS).length, 1);
  const supported = '__PROJECTTOUR__ __ACCESS:cb-deuteranopia__ __SEARCH:AI projects__ __TYPEID:contact-email|name@example.com__ __SLIDER:before-after|50__ __GOTOITEM:/articles|Coretex__ __CONTACTCARD:{"name":"Jane","email":"jane@example.com","message":"Hello"}__';
  assert.equal(sanitizeLegacyActions(supported), supported);
  assert.equal(sanitizeLegacyActions('__NAV://evil.test__ __NAV:/admin__ __GOTOITEM:/account|settings__ __SLIDER:demo|999__ __HIGHLIGHT:x"]__ __THEME:unknown__ __ACCESS:cb-evil__ __DELETE:all__ __CONTACTCARD:{"name":3}__').trim(), "");
});
test("memory deletion propagates across tabs without clearing unrelated preference edits", () => {
  const key = "mdcran_assistant_preferences";
  assert.equal(memoryScopeChanged({ key, oldValue: '{"memory":true,"memoryEpoch":"old"}', newValue: '{"memory":true,"memoryEpoch":"new"}' }), true);
  assert.equal(memoryScopeChanged({ key, oldValue: '{"memory":true}', newValue: '{"memory":false}' }), true);
  assert.equal(memoryScopeChanged({ key, oldValue: '{"memoryEpoch":"same","pace":1}', newValue: '{"memoryEpoch":"same","pace":0.9}' }), false);
  assert.equal(memoryScopeChanged({ key: "unrelated", oldValue: null, newValue: null }), false);
});
test("downstream audio cancellation aborts provider even when incoming request stays live", async () => {
  const incoming = new AbortController(); const upstream = providerCancellation(incoming.signal); let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([1])); }, cancel() { cancelled = true; } });
  const reader = relayProviderBody(body, upstream.cancel).getReader();
  assert.equal((await reader.read()).value?.[0], 1); await reader.cancel("user interrupted");
  assert.equal(incoming.signal.aborted, false); assert.equal(upstream.signal.aborted, true); assert.equal(cancelled, true);
  const disconnected = new AbortController(); const second = providerCancellation(disconnected.signal); disconnected.abort(); assert.equal(second.signal.aborted, true);
});
test("default reservation cap supports the existing large prompt and explicit bounds", () => {
  assert.equal(configuredTokenCap(), 5_000_000);
  assert.ok(configuredTokenCap() > 100 * 44_418);
  assert.equal(configuredTokenCap("invalid"), 5_000_000);
  assert.equal(configuredTokenCap("-1"), 1000);
  assert.equal(configuredTokenCap("20000000"), 10_000_000);
});
test("MSE setup failure falls back only before body consumption", async () => {
  const create = URL.createObjectURL; const revoke = URL.revokeObjectURL;
  class FakeMediaSource extends EventTarget { static isTypeSupported() { return true; } }
  class FakeAudio { onerror?: () => void; constructor() { queueMicrotask(() => this.onerror?.()); } setAttribute() {} pause() {} removeAttribute() {} load() {} }
  Object.defineProperty(globalThis, "MediaSource", { value: FakeMediaSource, configurable: true }); Object.defineProperty(globalThis, "Audio", { value: FakeAudio, configurable: true });
  URL.createObjectURL = () => "blob:test"; URL.revokeObjectURL = () => {};
  try {
    const response = new Response(new Uint8Array([4, 5]));
    assert.equal(await playStreamingSpeech(response, { signal: new AbortController().signal, context: {} as AudioContext, onStart: () => assert.fail("setup failed") }), false);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([4, 5]));
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; Reflect.deleteProperty(globalThis, "Audio"); Reflect.deleteProperty(globalThis, "MediaSource"); }
});
test("audio failure after playback starts rejects instead of replaying speech", async () => {
  const create = URL.createObjectURL; const revoke = URL.revokeObjectURL; let starts = 0;
  class FakeBuffer extends EventTarget { appendBuffer() { queueMicrotask(() => this.dispatchEvent(new Event("updateend"))); } }
  class FakeMediaSource extends EventTarget { readyState = "open"; static isTypeSupported() { return true; } constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event("sourceopen"))); } addSourceBuffer() { return new FakeBuffer(); } endOfStream() {} }
  class FakeAudio { onplaying?: () => void; onerror?: () => void; setAttribute() {} pause() {} removeAttribute() {} load() {} play() { queueMicrotask(() => { this.onplaying?.(); queueMicrotask(() => this.onerror?.()); }); return Promise.resolve(); } }
  Object.defineProperty(globalThis, "MediaSource", { value: FakeMediaSource, configurable: true }); Object.defineProperty(globalThis, "Audio", { value: FakeAudio, configurable: true });
  URL.createObjectURL = () => "blob:test"; URL.revokeObjectURL = () => {};
  try {
    const context = { createMediaElementSource: () => ({ connect() {}, disconnect() {} }), destination: {} } as unknown as AudioContext;
    await assert.rejects(playStreamingSpeech(new Response(new Uint8Array([1, 2])), { signal: new AbortController().signal, context, onStart: () => { starts++; } }));
    assert.equal(starts, 1);
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; Reflect.deleteProperty(globalThis, "Audio"); Reflect.deleteProperty(globalThis, "MediaSource"); }
});
