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

import { MicrophoneTestSession, initialMicrophoneTestState, type MicrophoneTestState } from "../src/lib/microphone-test-session";

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function flushMicrotasks() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
function microphoneFixture() {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const override = (key: string, value: unknown) => { originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); };
  const requests: { constraints: MediaStreamConstraints; result: ReturnType<typeof deferred<MediaStream>> }[] = [];
  const frames = new Map<number, FrameRequestCallback>(); let frameId = 0; let paused = 0; let updates = 0;
  const timers = new Map<number, () => void>(); let timerId = 0;
  let state: MicrophoneTestState = { ...initialMicrophoneTestState };
  let resume: Promise<void> = Promise.resolve();
  const contexts: FakeContext[] = []; const recorders: FakeRecorder[] = []; const revoked: string[] = [];
  let recordingThrows = false;
  class Devices extends EventTarget {
    inputs = [{ kind: "audioinput", deviceId: "usb", label: "USB microphone" }, { kind: "videoinput", deviceId: "camera" }] as MediaDeviceInfo[];
    enumeration: Promise<MediaDeviceInfo[]> | undefined;
    getUserMedia(constraints: MediaStreamConstraints) { const result = deferred<MediaStream>(); requests.push({ constraints, result }); return result.promise; }
    enumerateDevices() { return this.enumeration ?? Promise.resolve(this.inputs); }
  }
  class FakeContext {
    closed = 0; connected = 0;
    constructor() { contexts.push(this); }
    resume() { return resume; }
    close() { this.closed++; return Promise.resolve(); }
    createAnalyser() { return { fftSize: 256, getByteTimeDomainData: (data: Uint8Array) => data.fill(144) }; }
    createMediaStreamSource() { return { connect: () => this.connected++, disconnect: () => this.connected-- }; }
  }
  class FakeRecorder {
    state = "inactive"; mimeType = "audio/webm"; onstop: (() => void) | null = null; ondataavailable: ((event: { data: Blob }) => void) | null = null; onerror: (() => void) | null = null;
    constructor() { if (recordingThrows) throw new Error("unsupported"); recorders.push(this); }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["test audio"]) }); this.onstop?.(); }
  }
  const devices = new Devices();
  override("navigator", { mediaDevices: devices }); override("AudioContext", FakeContext); override("MediaRecorder", FakeRecorder);
  override("requestAnimationFrame", (cb: FrameRequestCallback) => { frames.set(++frameId, cb); return frameId; }); override("cancelAnimationFrame", (id: number) => frames.delete(id));
  override("setTimeout", (cb: () => void, delay: number) => { assert.equal(delay, 5000); timers.set(++timerId, cb); return timerId; }); override("clearTimeout", (id: number) => timers.delete(id));
  const create = URL.createObjectURL; const revoke = URL.revokeObjectURL; let clip = 0;
  URL.createObjectURL = () => `blob:mic-${++clip}`; URL.revokeObjectURL = url => revoked.push(url);
  const session = new MicrophoneTestSession(next => { state = next; updates++; }, () => paused++);
  const stream = () => { let stops = 0; const track = Object.assign(new EventTarget(), { stop: () => stops++ }); return { input: { getTracks: () => [track] } as unknown as MediaStream, stops: () => stops, end: () => track.dispatchEvent(new Event("ended")) }; };
  return { session, devices, requests, contexts, frames, timers, recorders, revoked, stream, state: () => state, updates: () => updates, paused: () => paused, setResume: (value: Promise<void>) => { resume = value; }, rejectRecording: () => { recordingThrows = true; }, restore: () => { session.dispose(); URL.createObjectURL = create; URL.revokeObjectURL = revoke; for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } } };
}

test("microphone permission failure offers recovery and retry uses the exact selected input", async () => {
  const f = microphoneFixture();
  try {
    const denied = f.session.start(); f.requests[0].result.reject(new DOMException("Denied", "NotAllowedError")); await denied;
    assert.match(f.state().error, /Allow microphone access/); assert.equal(f.state().active, false);
    f.session.selectDevice("usb"); const retry = f.session.start(); const input = f.stream(); f.requests[1].result.resolve(input.input); await retry;
    assert.deepEqual(f.requests[1].constraints, { audio: { deviceId: { exact: "usb" } } }); assert.equal(f.state().active, true); assert.ok(f.state().level > 0); assert.equal(f.state().devices.length, 1);
  } finally { f.restore(); }
});

test("old permission rejection cannot stop a newer microphone session", async () => {
  const f = microphoneFixture();
  try {
    const old = f.session.start(); f.session.selectDevice("usb"); const current = f.session.start(); const input = f.stream(); f.requests[1].result.resolve(input.input); await current;
    f.requests[0].result.reject(new DOMException("Denied", "NotAllowedError")); await old;
    assert.equal(f.state().active, true); assert.equal(f.state().error, ""); assert.equal(input.stops(), 0);
  } finally { f.restore(); }
});

test("stopping during permission or AudioContext resume cannot resurrect microphone capture", async () => {
  const f = microphoneFixture();
  try {
    const pending = f.session.start(); const late = f.stream(); f.session.stop(); f.requests[0].result.resolve(late.input); await pending;
    assert.equal(late.stops(), 1); assert.equal(f.contexts.length, 0);
    const resume = deferred<void>(); f.setResume(resume.promise); const second = f.session.start(); const input = f.stream(); f.requests[1].result.resolve(input.input); await flushMicrotasks();
    f.session.stop(); resume.resolve(); await second;
    assert.equal(input.stops(), 1); assert.equal(f.contexts[0].closed, 1); assert.equal(f.contexts[0].connected, 0); assert.equal(f.frames.size, 0); assert.equal(f.state().active, false);
  } finally { f.restore(); }
});

test("device removal stops selected capture and resets to system default", async () => {
  const f = microphoneFixture();
  try {
    f.session.selectDevice("usb"); const start = f.session.start(); const input = f.stream(); f.requests[0].result.resolve(input.input); await start;
    f.devices.inputs = []; f.devices.dispatchEvent(new Event("devicechange")); await flushMicrotasks();
    assert.equal(input.stops(), 1); assert.equal(f.state().device, ""); assert.equal(f.state().active, false); assert.match(f.state().error, /disconnected/);
    const next = f.session.start(); f.requests[1].result.resolve(f.stream().input); await next; assert.deepEqual(f.requests[1].constraints, { audio: true });
  } finally { f.restore(); }
});

test("unmount disposes capture, queued frames, pending enumeration and device listeners", async () => {
  const f = microphoneFixture();
  try {
    const enumeration = deferred<MediaDeviceInfo[]>(); f.devices.enumeration = enumeration.promise;
    const start = f.session.start(); const input = f.stream(); f.requests[0].result.resolve(input.input); await start;
    const queuedFrame = [...f.frames.values()][0]; f.session.dispose(); const updates = f.updates();
    enumeration.resolve(f.devices.inputs); f.devices.dispatchEvent(new Event("devicechange")); queuedFrame(0); await flushMicrotasks();
    assert.equal(input.stops(), 1); assert.equal(f.contexts[0].closed, 1); assert.equal(f.frames.size, 0); assert.equal(f.updates(), updates);
  } finally { f.restore(); }
});

test("five-second local recording can be played/deleted and cancellation discards late clips", async () => {
  const f = microphoneFixture();
  try {
    const start = f.session.start(); f.requests[0].result.resolve(f.stream().input); await start;
    f.session.record(); assert.equal(f.state().recording, true); [...f.timers.values()][0](); assert.equal(f.state().url, "blob:mic-1"); assert.equal(f.state().recording, false); assert.equal(f.timers.size, 0);
    const paused = f.paused(); f.session.deleteRecording(); assert.ok(f.paused() > paused); assert.deepEqual(f.revoked, ["blob:mic-1"]); assert.equal(f.state().url, "");
    f.session.record(); const lateStop = f.recorders[1].onstop; f.session.stop(); lateStop?.(); assert.equal(f.state().url, ""); assert.equal(f.timers.size, 0); assert.equal(f.recorders[1].state, "inactive");
  } finally { f.restore(); }
});

test("unsupported recording is a visible recoverable error with capture resources released", async () => {
  const f = microphoneFixture();
  try {
    const start = f.session.start(); const input = f.stream(); f.requests[0].result.resolve(input.input); await start;
    f.rejectRecording(); assert.doesNotThrow(() => f.session.record()); assert.match(f.state().error, /recording is unavailable/); assert.equal(input.stops(), 1); assert.equal(f.state().recording, false);
  } finally { f.restore(); }
});

test("microphone missing-device, unavailable-input and insecure-browser paths stay actionable", async () => {
  for (const [name, guidance] of [["NotFoundError", /Connect an input/], ["OverconstrainedError", /System default/]] as const) {
    const f = microphoneFixture();
    try { const start = f.session.start(); f.requests[0].result.reject(new DOMException("Unavailable", name)); await start; assert.match(f.state().error, guidance); assert.equal(f.state().active, false); } finally { f.restore(); }
  }
  const f = microphoneFixture();
  try { Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} }); await f.session.start(); assert.match(f.state().error, /HTTPS/); assert.equal(f.requests.length, 0); } finally { f.restore(); }
});

test("speech cancellation stops the stream and ignores queued playback progress", async () => {
  const create = URL.createObjectURL; const revoke = URL.revokeObjectURL;
  let starts = 0; let progress = 0; let cancelled = 0; let disconnected = 0; let revoked = 0;
  const playing = deferred<void>(); let audio!: FakeAudio;
  class FakeMediaSource extends EventTarget {
    static isTypeSupported() { return true; }
    constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event("sourceopen"))); }
    addSourceBuffer() { return new EventTarget(); }
  }
  class FakeAudio {
    onplaying: (() => void) | null = null; ontimeupdate: (() => void) | null = null; onended: (() => void) | null = null; onerror: (() => void) | null = null; currentTime = 3; pauses = 0;
    setAttribute() {} removeAttribute() {} load() {} pause() { this.pauses++; }
    play() { queueMicrotask(() => { this.onplaying?.(); playing.resolve(); }); return Promise.resolve(); }
  }
  Object.defineProperty(globalThis, "MediaSource", { configurable: true, value: FakeMediaSource }); Object.defineProperty(globalThis, "Audio", { configurable: true, value: FakeAudio });
  URL.createObjectURL = () => "blob:cancel-test"; URL.revokeObjectURL = () => { revoked++; };
  try {
    const controller = new AbortController(); const response = new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled++; } }));
    const context = { destination: {}, createMediaElementSource: () => ({ connect() {}, disconnect() { disconnected++; } }) } as unknown as AudioContext;
    const result = playStreamingSpeech(response, { signal: controller.signal, context, onAudio: value => { if (value) audio = value as unknown as FakeAudio; }, onStart: () => { starts++; }, onProgress: () => { progress++; } });
    await playing.promise; const oldProgress = audio.ontimeupdate; const oldPlaying = audio.onplaying;
    controller.abort(); await assert.rejects(result, { name: "AbortError" }); oldProgress?.(); oldPlaying?.();
    assert.equal(starts, 1); assert.equal(progress, 0); assert.equal(cancelled, 1); assert.equal(disconnected, 1); assert.equal(revoked, 1); assert.ok(audio.pauses > 0); assert.equal(audio.ontimeupdate, null);
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; Reflect.deleteProperty(globalThis, "Audio"); Reflect.deleteProperty(globalThis, "MediaSource"); }
});



test("system-default track ending stops capture and cannot revive an unmounted session", async () => {
  const f = microphoneFixture();
  try {
    const start = f.session.start(); const input = f.stream(); f.requests[0].result.resolve(input.input); await start;
    assert.equal(f.state().device, ""); input.end(); assert.equal(f.state().active, false); assert.match(f.state().error, /input ended/); assert.equal(input.stops(), 1); assert.equal(f.frames.size, 0);
    f.session.dispose(); const updates = f.updates(); input.end(); assert.equal(f.updates(), updates);
  } finally { f.restore(); }
});
