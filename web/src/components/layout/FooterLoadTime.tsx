"use client";

import { useEffect, useState } from "react";

const COOKIE = "mdcran_loadtimes";
const MAX = 20;

function readTimes(): number[] {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
    if (!m) return [];
    const arr = JSON.parse(decodeURIComponent(m[1]));
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch { return []; }
}
function writeTimes(arr: number[]) {
  try {
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(arr.slice(-MAX)))}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch { /* */ }
}

export default function FooterLoadTime() {
  const [state, setState] = useState<{ current: number; avg: number; count: number; dev: boolean } | null>(null);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    // In dev, Next compiles routes on-demand and the browser counts that as load time —
    // don't pollute the real cookie average or analytics with it.
    const isDev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local");

    const measure = () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const ms = nav ? Math.max(0, nav.loadEventEnd - nav.startTime) : performance.now();
      if (!ms || ms < 1) return;

      if (isDev) {
        setState({ current: ms, avg: ms, count: 1, dev: true });
        return;
      }

      const prev = readTimes();
      const next = [...prev, Math.round(ms)];
      writeTimes(next);
      const avg = next.reduce((a, b) => a + b, 0) / next.length;
      setState({ current: ms, avg, count: next.length, dev: false });
      // Feed analytics so the admin can aggregate average load time per page.
      try { window.mdcranTrack?.("page_load", { ms: Math.round(ms), path: window.location.pathname }); } catch { /* */ }
    };
    if (document.readyState === "complete") measure();
    else { window.addEventListener("load", measure, { once: true }); return () => window.removeEventListener("load", measure); }
  }, []);

  if (!state) return null;
  const s = (n: number) => (n / 1000).toFixed(2);
  if (state.dev) {
    return <span className="text-white/20">Loaded in {s(state.current)} s · dev build (not counted)</span>;
  }
  return (
    <span className="text-white/20">
      Loaded in {s(state.current)} s · avg {s(state.avg)} s over your last {state.count} visit{state.count === 1 ? "" : "s"}
    </span>
  );
}
