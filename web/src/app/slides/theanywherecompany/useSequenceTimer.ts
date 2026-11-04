"use client";

import { useEffect, useRef } from "react";

/** One clock drives both the visible progress and the actual image change. */
export function useSequenceTimer({ seconds, cycleKey, paused, enabled = true, onAdvance }: {
  seconds: number;
  cycleKey: string;
  paused: boolean;
  enabled?: boolean;
  onAdvance: () => void;
}) {
  const clockRef = useRef<HTMLDivElement>(null);
  const remainingRef = useRef<HTMLSpanElement>(null);
  const advanceRef = useRef(onAdvance);
  const clock = useRef({ key: cycleKey, seconds, elapsed: 0, complete: false });

  useEffect(() => { advanceRef.current = onAdvance; }, [onAdvance]);

  useEffect(() => {
    const state = clock.current;
    if (state.key !== cycleKey || state.seconds !== seconds) {
      state.key = cycleKey;
      state.seconds = seconds;
      state.elapsed = 0;
      state.complete = false;
    }
    const duration = Math.max(1, seconds * 1000);
    let frame = 0;
    let started: number | null = null;
    let segmentElapsed = state.elapsed;
    const paint = () => {
      clockRef.current?.style.setProperty("--sequence-progress", String(enabled ? state.elapsed / duration : 1));
      const status = !enabled ? "complete" : state.complete ? "waiting" : paused || document.hidden ? "paused" : "playing";
      if (clockRef.current && clockRef.current.dataset.sequenceState !== status) clockRef.current.dataset.sequenceState = status;
      const remaining = `${Math.max(0, Math.ceil((duration - state.elapsed) / 1000))}s`;
      if (remainingRef.current && remainingRef.current.textContent !== remaining) remainingRef.current.textContent = remaining;
    };
    const freeze = () => {
      if (started !== null) state.elapsed = Math.min(duration, Math.max(0, segmentElapsed + performance.now() - started));
      started = null;
      cancelAnimationFrame(frame);
      paint();
    };
    const tick = (now: number) => {
      if (started === null) return;
      state.elapsed = Math.min(duration, Math.max(0, segmentElapsed + now - started));
      paint();
      if (state.elapsed >= duration) {
        state.complete = true;
        started = null;
        paint();
        advanceRef.current();
      } else frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (paused || document.hidden || !enabled || state.complete || started !== null) return;
      segmentElapsed = state.elapsed;
      started = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const visibilityChange = () => { if (document.hidden) freeze(); else resume(); };
    paint();
    resume();
    document.addEventListener("visibilitychange", visibilityChange);
    return () => { freeze(); document.removeEventListener("visibilitychange", visibilityChange); };
  }, [cycleKey, seconds, paused, enabled]);

  return { clockRef, remainingRef };
}
