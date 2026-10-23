/** Incremental MPEG playback. Returns false without consuming the body if MSE is
 * unavailable; callers retain their existing decoded-buffer browser fallback. */
export async function playStreamingSpeech(response: Response, options: {
  signal: AbortSignal; context: AudioContext; analyser?: AnalyserNode | null;
  onStart: () => void; onProgress?: (seconds: number) => void;
  onAudio?: (audio: HTMLAudioElement | null) => void;
}): Promise<boolean> {
  if (!response.body || typeof MediaSource === "undefined" || !MediaSource.isTypeSupported("audio/mpeg")) return false;
  const media = new MediaSource(); const url = URL.createObjectURL(media); const audio = new Audio(url);
  audio.setAttribute("playsinline", ""); options.onAudio?.(audio);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const failed = new AbortController();
  const operationSignal = AbortSignal.any([options.signal, failed.signal]);
  let source: MediaElementAudioSourceNode | undefined;
  let rejectPlayback: (reason: unknown) => void = () => {};
  let finished = false;
  const stopped = () => operationSignal.aborted || finished;
  const abort = () => { audio.pause(); void reader?.cancel().catch(() => {}); rejectPlayback(new DOMException("Cancelled", "AbortError")); };
  operationSignal.addEventListener("abort", abort, { once: true });
  try {
    await new Promise<void>((resolve, reject) => {
      rejectPlayback = reject;
      media.addEventListener("sourceopen", () => resolve(), { once: true });
      audio.onerror = () => reject(new Error("Audio stream unavailable"));
      if (stopped()) abort();
    });
    if (stopped()) throw new DOMException("Cancelled", "AbortError");
    const buffer = media.addSourceBuffer("audio/mpeg");
    source = options.context.createMediaElementSource(audio);
    if (options.analyser) { source.connect(options.analyser); options.analyser.connect(options.context.destination); } else source.connect(options.context.destination);
    reader = response.body.getReader();
    let started = false;
    audio.onplaying = () => { if (!started && !stopped()) { started = true; options.onStart(); } };
    audio.ontimeupdate = () => { if (!stopped()) options.onProgress?.(audio.currentTime); };
    const playback = new Promise<void>((resolve, reject) => { rejectPlayback = reject; audio.onended = () => resolve(); audio.onerror = () => { failed.abort(new Error("Audio playback failed")); reject(new Error("Audio playback failed")); }; });
    // Attach a rejection handler immediately while the body is still arriving.
    const play = audio.play(); void play.catch(error => { failed.abort(error); rejectPlayback(error); }); void playback.catch(() => {});
    while (!stopped()) {
      const { value, done } = await reader.read(); if (done) break;
      await new Promise<void>((resolve, reject) => {
        const abortAppend = () => { cleanup(); reject(new DOMException("Cancelled", "AbortError")); };
        const cleanup = () => { buffer.removeEventListener("updateend", finish); buffer.removeEventListener("error", fail); operationSignal.removeEventListener("abort", abortAppend); };
        const finish = () => { cleanup(); resolve(); }; const fail = () => { cleanup(); reject(new Error("Audio buffer failed")); };
        buffer.addEventListener("updateend", finish, { once: true }); buffer.addEventListener("error", fail, { once: true }); operationSignal.addEventListener("abort", abortAppend, { once: true });
        if (stopped()) { abortAppend(); return; }
        try { buffer.appendBuffer(new Uint8Array(value).buffer); } catch (e) { cleanup(); reject(e); }
      });
    }
    if (stopped()) throw new DOMException("Cancelled", "AbortError");
    if (media.readyState === "open") media.endOfStream();
    await playback;
    return true;
  } catch (error) {
    // A setup failure before acquiring/reading the body is safe to fall back. Once
    // playback or body consumption begins, never replay from the beginning.
    if (!options.signal.aborted && !reader) return false;
    throw error;
  } finally {
    finished = true;
    audio.onplaying = null; audio.ontimeupdate = null; audio.onended = null; audio.onerror = null;
    operationSignal.removeEventListener("abort", abort); audio.pause(); audio.removeAttribute("src"); audio.load(); source?.disconnect(); options.onAudio?.(null); URL.revokeObjectURL(url); void reader?.cancel().catch(() => {});
  }
}
