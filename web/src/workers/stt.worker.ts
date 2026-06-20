/// <reference lib="webworker" />
/* ─────────────────────────────────────────────────────────────────────────────
   Local speech-to-text worker — free, on-device transcription via
   @xenova/transformers (Whisper tiny.en, WASM). Runs off the main thread so the
   UI never freezes during tensor processing. The model (~40MB) downloads once
   and is cached in the browser; no audio ever leaves the device.

   Message protocol (main → worker):
     { type: "preload" }                              // warm up / download the model
     { type: "transcribe", id, audio: Float32Array }  // audio = mono @ 16kHz
   (worker → main):
     { type: "ready" }                 // model loaded
     { type: "progress", pct }         // 0-100 download progress
     { type: "result", id, text }      // transcription done
     { type: "error", id?, error }     // failure (id present for transcribe calls)
   ──────────────────────────────────────────────────────────────────────────── */

import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from "@xenova/transformers";

// Pull model weights from the hosted CDN (no bundled local model files).
env.allowLocalModels = false;
// Cache the downloaded model in the browser so subsequent visits are instant.
env.useBrowserCache = true;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loading: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

async function getTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (transcriber) return transcriber;
  if (loading) return loading;
  loading = (pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
    progress_callback: (p: { status?: string; progress?: number }) => {
      if (typeof p?.progress === "number") ctx.postMessage({ type: "progress", pct: Math.round(p.progress) });
    },
  }) as Promise<AutomaticSpeechRecognitionPipeline>)
    .then((t) => {
      transcriber = t;
      ctx.postMessage({ type: "ready" });
      return t;
    })
    .finally(() => { loading = null; });
  return loading;
}

interface AsrOutput { text?: string }

ctx.addEventListener("message", async (event: MessageEvent) => {
  const data = event.data as { type?: string; id?: string; audio?: Float32Array };
  try {
    if (data?.type === "preload") {
      await getTranscriber();
      return;
    }
    if (data?.type === "transcribe") {
      const pipe = await getTranscriber();
      const audio = data.audio;
      if (!audio || audio.length === 0) {
        ctx.postMessage({ type: "result", id: data.id, text: "" });
        return;
      }
      // Whisper expects a Float32Array sampled at 16000Hz.
      const out = (await pipe(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      })) as AsrOutput | AsrOutput[];
      const text = Array.isArray(out) ? out.map((o) => o.text ?? "").join(" ") : (out.text ?? "");
      ctx.postMessage({ type: "result", id: data.id, text: text.trim() });
    }
  } catch (err) {
    ctx.postMessage({ type: "error", id: data?.id, error: String(err instanceof Error ? err.message : err) });
  }
});
