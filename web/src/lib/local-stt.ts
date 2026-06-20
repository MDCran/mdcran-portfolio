/* ─────────────────────────────────────────────────────────────────────────────
   Local speech-to-text — client helper around the on-device Whisper worker.

   Web Speech API (in VoiceMode / ChatPanel) still drives LIVE captions. This
   module provides the FREE, on-device transcription engine used to turn a
   recorded audio Blob into text — replacing the paid ElevenLabs STT on the
   fallback path (browsers without Web Speech) and as a no-cost first choice.
   All processing happens in a Web Worker; audio never leaves the browser.
   ──────────────────────────────────────────────────────────────────────────── */

type Pending = { resolve: (text: string) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> };

let worker: Worker | null = null;
let workerFailed = false;       // hard-disabled (construction failure, or too many transient errors)
let workerErrorCount = 0;       // consecutive transient onerror events
let resampleUnsupported = false; // OfflineAudioContext@16k threw (old Safari) — skip re-trying
const MAX_WORKER_ERRORS = 3;
const pending = new Map<string, Pending>();
let modelReady = false;
let lastProgress = 0;
const progressListeners = new Set<(pct: number) => void>();
let seq = 0;

function emitProgress(pct: number) { for (const cb of progressListeners) { try { cb(pct); } catch { /* */ } } }

/** Whether on-device STT can run here (Worker + WebAssembly + AudioContext, and
 *  the worker hasn't hard-failed / 16k resample hasn't been ruled unsupported). */
export function isLocalSttSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (workerFailed || resampleUnsupported) return false;
  const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
  return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && Boolean(w.AudioContext || w.webkitAudioContext);
}

/** True once the Whisper model has finished downloading/initializing. */
export function isLocalSttModelReady(): boolean { return modelReady; }

/** Last reported model-download progress (0-100). */
export function getLocalSttProgress(): number { return lastProgress; }

/** Subscribe to model download progress (0-100). Returns an unsubscribe fn.
 *  Supports multiple subscribers (VoiceMode + ChatPanel mount concurrently). */
export function onLocalSttProgress(cb: (pct: number) => void): () => void {
  progressListeners.add(cb);
  return () => { progressListeners.delete(cb); };
}

function getWorker(): Worker | null {
  if (workerFailed) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../workers/stt.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; id?: string; text?: string; pct?: number; error?: string };
      if (d.type === "ready") { modelReady = true; workerErrorCount = 0; lastProgress = 100; emitProgress(100); return; }
      if (d.type === "progress") { if (typeof d.pct === "number") { lastProgress = d.pct; emitProgress(d.pct); } return; }
      if (d.type === "result" && d.id) {
        const p = pending.get(d.id);
        if (p) { clearTimeout(p.timer); pending.delete(d.id); p.resolve((d.text ?? "").trim()); }
        return;
      }
      if (d.type === "error") {
        if (d.id) { const p = pending.get(d.id); if (p) { clearTimeout(p.timer); pending.delete(d.id); p.reject(new Error(d.error || "stt error")); } }
        return;
      }
    };
    worker.onerror = () => {
      // Reject everything in flight and tear down the worker, but do NOT permanently
      // latch on a single transient error — a fresh worker is lazily rebuilt on the
      // next call. Only hard-disable after repeated failures (genuinely broken).
      for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new Error("stt worker error")); }
      pending.clear();
      try { worker?.terminate(); } catch { /* */ }
      worker = null;
      modelReady = false;
      if (++workerErrorCount >= MAX_WORKER_ERRORS) workerFailed = true;
    };
    return worker;
  } catch {
    workerFailed = true;
    return null;
  }
}

/** Warm up the model (download + init) ahead of the first transcription. */
export function preloadLocalStt(): void {
  if (!isLocalSttSupported()) return;
  try { getWorker()?.postMessage({ type: "preload" }); } catch { /* */ }
}

/** Decode a recorded audio Blob into mono Float32 PCM resampled to 16kHz
 *  (what Whisper expects), using an OfflineAudioContext for the resample. */
async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const arrayBuf = await blob.arrayBuffer();
  const decodeCtx = new AC();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    try { await decodeCtx.close(); } catch { /* */ }
  }
  const TARGET = 16000;
  const frames = Math.ceil(decoded.duration * TARGET);
  if (frames <= 0) return new Float32Array(0);
  // Some older WebKit builds reject an OfflineAudioContext below ~22050 Hz. If the
  // 16k resample isn't supported, latch it off so we don't re-decode every utterance,
  // and let the caller fall back to the server STT.
  let offline: OfflineAudioContext;
  try {
    offline = new OfflineAudioContext(1, frames, TARGET);
  } catch {
    resampleUnsupported = true;
    throw new Error("offline resample @16k unsupported");
  }
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/** Transcribe a recorded audio Blob fully on-device. Rejects on timeout /
 *  unsupported / worker failure so callers can fall back to a server STT. */
export async function transcribeBlobLocal(blob: Blob, timeoutMs?: number): Promise<string> {
  if (!isLocalSttSupported()) throw new Error("local stt unsupported");
  const w = getWorker();
  if (!w) throw new Error("local stt worker unavailable");
  const audio = await blobToMono16k(blob);
  if (audio.length === 0) return "";
  // First-use downloads the ~40MB model — give it a generous window so a slow
  // download isn't pushed to the paid server STT purely on a timeout.
  const effectiveTimeout = timeoutMs ?? (modelReady ? 25000 : 120000);
  const id = `stt-${++seq}`;
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("local stt timeout")); }, effectiveTimeout);
    pending.set(id, { resolve, reject, timer });
    // Transfer the underlying buffer to avoid a copy across the worker boundary.
    try { w.postMessage({ type: "transcribe", id, audio }, [audio.buffer]); }
    catch { clearTimeout(timer); pending.delete(id); reject(new Error("local stt post failed")); }
  });
}
