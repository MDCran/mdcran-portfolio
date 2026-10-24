"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useGamePause(onResume: (duration: number) => void) {
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const pausedAt = useRef(0);
  const callback = useRef(onResume);
  useEffect(() => { callback.current = onResume; }, [onResume]);
  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    pausedAt.current = performance.now();
    setPaused(true);
  }, []);
  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    const duration = performance.now() - pausedAt.current;
    pausedRef.current = false;
    callback.current(duration);
    setPaused(false);
  }, []);
  const togglePause = useCallback(() => { if (pausedRef.current) resume(); else pause(); }, [pause, resume]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause(); };
    const blur = () => pause();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", blur);
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("blur", blur); };
  }, [pause]);
  return { paused, pausedRef, togglePause, resume };
}
