"use client";

import { useCallback, useEffect, useRef } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { clampCursor, cursorTrajectory, type CursorPoint } from "./cursor-motion";
import { useStoredPreference } from "./useStoredPreference";

/** Both AI cursors share the same movement and accessibility behavior. */
export function useCursorMotion() {
  const x = useMotionValue(0), y = useMotionValue(0);
  const controls = useRef<{ stop(): void }[]>([]);
  const destination = useRef<CursorPoint | null>(null);
  const reduce = useRef(false);
  const systemReduced = useReducedMotion();
  const [prefs] = useStoredPreference("mdcran_a11y", "{}");
  const prefersReduced = (() => {
    try { return JSON.parse(prefs)?.motion === "reduce" || systemReduced === true; }
    catch { return systemReduced === true; }
  })();
  const stop = useCallback(() => {
    controls.current.forEach((control) => control.stop());
    controls.current = [];
  }, []);
  useEffect(() => {
    reduce.current = prefersReduced;
    if (prefersReduced && destination.current) {
      stop(); x.set(destination.current.x); y.set(destination.current.y);
    }
  }, [prefersReduced, stop, x, y]);
  useEffect(() => stop, [stop]);

  const place = useCallback((point: CursorPoint) => {
    stop();
    const safe = clampCursor(point, window.innerWidth, window.innerHeight);
    x.set(safe.x); y.set(safe.y);
    destination.current = safe;
  }, [stop, x, y]);
  const move = useCallback((point: CursorPoint) => {
    stop();
    const safe = clampCursor(point, window.innerWidth, window.innerHeight);
    destination.current = safe;
    const path = cursorTrajectory({ x: x.get(), y: y.get() }, safe, (Math.random() < 0.5 ? -1 : 1) * (0.65 + Math.random() * 0.35));
    if (reduce.current || !path.duration) { x.set(safe.x); y.set(safe.y); return 0; }
    const points = path.x.map((value, i) => clampCursor({ x: value, y: path.y[i] }, window.innerWidth, window.innerHeight));
    controls.current = [
      animate(x, points.map((point) => point.x), { duration: path.duration, ease: "linear" }),
      animate(y, points.map((point) => point.y), { duration: path.duration, ease: "linear" }),
    ];
    return Math.ceil(path.duration * 1000);
  }, [stop, x, y]);
  return { x, y, place, move, stop, reducedMotion: prefersReduced };
}
