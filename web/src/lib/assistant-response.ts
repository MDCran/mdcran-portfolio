type CancelTask = () => void;
type ResponseClock = {
  timer: (callback: () => void, delay: number) => CancelTask;
  frame: (callback: () => void) => CancelTask;
};

const browserClock: ResponseClock = {
  timer(callback, delay) { const id = setTimeout(callback, delay); return () => clearTimeout(id); },
  frame(callback) { const id = requestAnimationFrame(callback); return () => cancelAnimationFrame(id); },
};

/** Actions belong to a response, not to the arrival of its tool call. Delays begin
 * when playback starts or after the written reply has had a chance to paint. */
export function createResponseActions(options: {
  signal: AbortSignal;
  isCurrent: () => boolean;
  clock?: ResponseClock;
}) {
  const clock = options.clock ?? browserClock;
  let ready = false;
  let cancelled = false;
  let waitingForPaint = false;
  const pending: { callback: () => void; delay: number }[] = [];
  const tasks = new Set<CancelTask>();
  const subscriptions = new Set<CancelTask>();
  const active = () => !cancelled && !options.signal.aborted && options.isCurrent();

  function cancel() {
    cancelled = true;
    pending.length = 0;
    for (const stop of tasks) stop();
    tasks.clear();
    for (const unsubscribe of subscriptions) unsubscribe();
    subscriptions.clear();
  }

  function cancelOn(signal: AbortSignal) {
    if (cancelled) return;
    if (signal.aborted) { cancel(); return; }
    signal.addEventListener("abort", cancel, { once: true });
    subscriptions.add(() => signal.removeEventListener("abort", cancel));
  }

  function runLater(callback: () => void, delay: number) {
    const stop = clock.timer(() => { tasks.delete(stop); if (active()) callback(); }, delay);
    tasks.add(stop);
  }

  function schedule(callback: () => void, delay = 0) {
    if (!active()) return;
    if (ready) runLater(callback, delay);
    else pending.push({ callback, delay });
  }

  function startSpeech() {
    if (ready || !active()) return;
    ready = true;
    for (const { callback, delay } of pending.splice(0)) runLater(callback, delay);
  }

  function nextFrame(callback: () => void) {
    const stop = clock.frame(() => { tasks.delete(stop); if (active()) callback(); });
    tasks.add(stop);
  }

  function startText() {
    if (ready || waitingForPaint || !active()) return;
    waitingForPaint = true;
    nextFrame(() => nextFrame(startSpeech));
  }

  cancelOn(options.signal);
  return { schedule, startSpeech, startText, cancel, cancelOn };
}

export type ResponseActions = ReturnType<typeof createResponseActions>;
