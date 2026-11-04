"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./presentation.module.css";

// Public portfolio snapshot, 3 November 2026. Each entry is the sum of the
// project's video views, in portfolio order. This is not a time-series forecast.
const projectViews = [0, 0, 0, 0, 0, 0, 980, 44268, 0, 0, 0, 517, 14035, 1211513, 567633, 1930247, 0, 3053797, 217, 45282832, 512043, 24261, 1747784, 5469, 5839, 2879792, 0, 2429047, 0, 1354812, 193646, 1943780, 3944954, 1902871, 3758, 517, 0, 120943, 0, 0, 287361, 0, 408, 0, 3208, 658158, 1701947, 2559, 0, 0, 0, 2129, 1794023, 1883, 52495];
const total = projectViews.reduce((sum, views) => sum + views, 0);
const left = 14, right = 480, top = 48, bottom = 520;
const graphY = (views: number) => bottom - views / total * (bottom - top);
let runningTotal = 0;
const points = [{ x: left, y: bottom }, ...projectViews.map((views, index) => {
  runningTotal += views;
  return { x: left + (index + 1) / projectViews.length * (right - left), y: graphY(runningTotal) };
})];
const curve = points.map((point, index) => {
  if (index === 0) return `M${point.x},${point.y}`;
  const previous = points[index - 1];
  const middle = (previous.x + point.x) / 2;
  return `C${middle},${previous.y} ${middle},${point.y} ${point.x},${point.y}`;
}).join(" ");

export function ViewsBackdrop({ paused }: { paused: boolean }) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const revealRef = useRef<SVGRectElement>(null);
  const areaRef = useRef<SVGGElement>(null);
  const tipRef = useRef<SVGGElement>(null);
  const clock = useRef({ elapsed: 0, painted: false });

  useEffect(() => {
    const root = rootRef.current, line = lineRef.current;
    if (!root || !line) return;
    const delay = 1200, duration = 5200, end = delay + duration;
    const state = clock.current;
    const length = line.getTotalLength();
    // A paused first view still shows the complete chart. Later pauses hold its position.
    if (paused && !state.painted) state.elapsed = end;
    let frame = 0;
    let started: number | null = null;
    let segmentElapsed = state.elapsed;
    const paint = () => {
      const time = Math.max(0, Math.min(1, (state.elapsed - delay) / duration));
      const progress = time * time * (3 - 2 * time);
      const point = line.getPointAtLength(length * progress);
      // Trace, fill and highlight share the same position along the actual curve.
      root.style.setProperty("--views-trace", String(1 - progress));
      revealRef.current?.setAttribute("width", String(Math.max(0, point.x - left)));
      areaRef.current?.setAttribute("opacity", String(.3 + progress * .7));
      tipRef.current?.setAttribute("transform", `translate(${point.x} ${point.y})`);
      tipRef.current?.setAttribute("opacity", String(Math.min(1, progress * 16)));
      root.dataset.graphState = state.elapsed >= end ? "settled" : paused || document.hidden ? "paused" : state.elapsed < delay ? "waiting" : "drawing";
      state.painted = true;
    };
    const freeze = () => {
      if (started !== null) state.elapsed = Math.min(end, segmentElapsed + performance.now() - started);
      started = null;
      cancelAnimationFrame(frame);
      paint();
    };
    const tick = (now: number) => {
      if (started === null) return;
      state.elapsed = Math.min(end, segmentElapsed + now - started);
      paint();
      if (state.elapsed < end) frame = requestAnimationFrame(tick);
      else started = null;
    };
    const resume = () => {
      if (paused || document.hidden || state.elapsed >= end || started !== null) return;
      segmentElapsed = state.elapsed;
      started = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const visibilityChange = () => { if (document.hidden) freeze(); else resume(); };
    paint();
    resume();
    document.addEventListener("visibilitychange", visibilityChange);
    return () => { freeze(); document.removeEventListener("visibilitychange", visibilityChange); };
  }, [paused]);

  return <div ref={rootRef} className={styles.viewsBackdrop} data-paused={paused} aria-hidden="true">
    <svg viewBox="0 0 500 562.5" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${id}-area`} x1="0" y1={top} x2="0" y2={bottom} gradientUnits="userSpaceOnUse"><stop stopColor="#91c6de" stopOpacity=".23" /><stop offset=".5" stopColor="#6aaccb" stopOpacity=".1" /><stop offset="1" stopColor="#426b8c" stopOpacity="0" /></linearGradient>
        <linearGradient id={`${id}-line`}><stop stopColor="#6593aa" stopOpacity=".25" /><stop offset="1" stopColor="#b1e0f0" stopOpacity=".85" /></linearGradient>
        <clipPath id={`${id}-reveal`}><rect ref={revealRef} x={left} y="0" width="0" height="562.5" /></clipPath>
      </defs>
      <g className={styles.viewsGrid}>
        {[0, 20_000_000, 40_000_000, 60_000_000].map((views) => <g key={views}><line x1="0" x2="500" y1={graphY(views)} y2={graphY(views)} /><text x="9" y={graphY(views) - 5}>{views / 1_000_000}M</text></g>)}
        {[100, 200, 300, 400].map((x) => <line key={x} x1={x} x2={x} y1="20" y2="535" />)}
      </g>
      <g ref={areaRef} clipPath={`url(#${id}-reveal)`}><path className={styles.viewsArea} d={`${curve} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#${id}-area)`} /></g>
      <path className={`${styles.viewsLine} ${styles.viewsLineGlow}`} d={curve} pathLength="1" fill="none" stroke="#94cde5" strokeWidth="5" strokeLinecap="round" />
      <path ref={lineRef} className={styles.viewsLine} d={curve} pathLength="1" fill="none" stroke={`url(#${id}-line)`} strokeWidth="1.5" strokeLinecap="round" />
      <g ref={tipRef} opacity="0" transform={`translate(${left} ${bottom})`}><circle className={styles.viewsHalo} r="8" fill="#a4d3e2" fillOpacity=".13" /><circle r="2.4" fill="#c6ecf6" /></g>
    </svg>
  </div>;
}
