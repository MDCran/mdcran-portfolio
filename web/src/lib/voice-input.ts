export const MICROPHONE_PERMISSION_GUIDANCE = "Waiting for microphone permission. Choose Allow in your browser prompt; if no prompt appears, check site microphone permissions.";

export interface SpeechResultEvent {
  resultIndex: number;
  results: { length: number; [index: number]: { isFinal: boolean; 0: { transcript: string } } };
}
export interface BrowserRecognition {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

/** The browser's speech service can fail even after microphone access succeeds.
 * Switch to recording once instead of endlessly restarting a broken service. */
export function startBrowserRecognition(recognition: BrowserRecognition, options: {
  signal: AbortSignal; language: string; onResult: (event: SpeechResultEvent) => void; onFallback: () => void;
}) {
  let stopped = false;
  let restart: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (stopped) return;
    stopped = true; clearTimeout(restart);
    recognition.onresult = null; recognition.onerror = null; recognition.onend = null;
    options.signal.removeEventListener("abort", stop);
    try { recognition.abort(); } catch { /* Already ended. */ }
  };
  const fallback = () => { if (stopped || options.signal.aborted) return; stop(); options.onFallback(); };
  const start = () => { if (stopped || options.signal.aborted) return; try { recognition.start(); } catch { fallback(); } };
  recognition.continuous = true; recognition.interimResults = true; recognition.lang = options.language;
  recognition.onresult = event => { if (!stopped && !options.signal.aborted) options.onResult(event); };
  recognition.onerror = event => {
    // Silence is normal; all service/device/permission failures get one fallback.
    if (event.error !== "no-speech" && event.error !== "aborted") fallback();
  };
  recognition.onend = () => { if (!stopped && !options.signal.aborted) { clearTimeout(restart); restart = setTimeout(start, 250); } };
  options.signal.addEventListener("abort", stop, { once: true });
  if (options.signal.aborted) stop(); else start();
  return stop;
}

export function watchMicrophoneEnd(stream: MediaStream, signal: AbortSignal, ended: () => void) {
  const tracks = stream.getAudioTracks();
  let stopped = false;
  const cleanup = () => { stopped = true; for (const track of tracks) track.removeEventListener("ended", onEnded); signal.removeEventListener("abort", cleanup); };
  const onEnded = () => { if (stopped || signal.aborted) return; cleanup(); ended(); };
  for (const track of tracks) track.addEventListener("ended", onEnded);
  signal.addEventListener("abort", cleanup, { once: true });
  if (signal.aborted) cleanup(); else if (!tracks.length || tracks.some(track => track.readyState === "ended")) onEnded();
  return cleanup;
}

export async function transcribeVoiceClip(blob: Blob, options: {
  signal: AbortSignal; localSupported: boolean; localTranscribe: (blob: Blob) => Promise<string>;
  request?: typeof fetch;
}): Promise<string> {
  options.signal.throwIfAborted();
  if (!blob.size) return "";
  if (options.localSupported) {
    try {
      const text = await options.localTranscribe(blob);
      options.signal.throwIfAborted();
      // Empty local output is successful silence, never a paid fallback.
      return text.trim();
    } catch { options.signal.throwIfAborted(); }
  }
  const extension = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData(); form.set("file", blob, `voice.${extension}`);
  const response = await (options.request ?? fetch)("/api/voice/stt", { method: "POST", body: form, signal: options.signal });
  options.signal.throwIfAborted();
  if (!response.ok) throw new Error(response.status === 429 ? "Voice transcription limit reached. Try again later or continue in text." : "Speech could not be transcribed. Try again or continue in text.");
  const data = await response.json();
  options.signal.throwIfAborted();
  if (typeof data?.text !== "string") throw new Error("Speech transcription returned an invalid response. Try again or continue in text.");
  return data.text.trim();
}

/** One bounded recording, with chunks scoped to this recorder rather than a
 * shared component ref. Late stop/data events cannot mix different microphones. */
export function startVoiceRecording(stream: MediaStream, options: {
  signal: AbortSignal; onRecorder: (recorder: MediaRecorder) => void;
  onClip: (blob: Blob) => void; onError: () => void;
}): (() => void) | null {
  let recorder: MediaRecorder | undefined;
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const chunks: Blob[] = [];
  const cleanup = () => {
    if (finished) return;
    finished = true; clearTimeout(timer); options.signal.removeEventListener("abort", cleanup);
    if (recorder) {
      recorder.ondataavailable = null; recorder.onstop = null; recorder.onerror = null;
      try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* Already stopped. */ }
    }
  };
  const fail = () => { if (finished) return; cleanup(); if (!options.signal.aborted) options.onError(); };
  const stop = () => { if (finished || options.signal.aborted) return; try { if (recorder?.state === "recording") recorder.stop(); } catch { fail(); } };
  try {
    options.signal.throwIfAborted();
    recorder = new MediaRecorder(stream);
    const current = recorder;
    recorder.ondataavailable = event => { if (!finished && !options.signal.aborted && event.data.size) chunks.push(event.data); };
    recorder.onstop = () => { if (finished || options.signal.aborted) return; const blob = new Blob(chunks, { type: current.mimeType }); cleanup(); options.onClip(blob); };
    recorder.onerror = fail;
    options.signal.addEventListener("abort", cleanup, { once: true });
    recorder.start(); options.onRecorder(recorder);
    timer = setTimeout(stop, 30_000);
    return stop;
  } catch { fail(); return null; }
}
