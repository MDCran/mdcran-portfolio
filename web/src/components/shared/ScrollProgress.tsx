"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, Check } from "lucide-react";

const R = 18;
const C = 2 * Math.PI * R;
const READ_THRESHOLD = 96; // % scrolled to count a page as "read"
const READ_SET_KEY = "mdcran_read_paths_v1";

/* Per-session set of paths already marked read (so the checkmark + event fire only once). */
function getReadSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(READ_SET_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function markPathRead(path: string) {
  try {
    const set = getReadSet();
    set.add(path);
    sessionStorage.setItem(READ_SET_KEY, JSON.stringify(Array.from(set).slice(-200)));
  } catch { /* */ }
}

export default function ScrollProgress() {
  const pathname = usePathname();
  const [pct, setPct] = useState(0);
  const [read, setRead] = useState(false); // showing the "read" checkmark
  const markedRef = useRef(false);

  // Reset when the route changes. If this path was already read this session,
  // pre-mark it so we don't replay the checkmark or re-fire the event.
  useEffect(() => {
    setPct(0);
    setRead(false);
    markedRef.current = getReadSet().has(pathname);
  }, [pathname]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const p = total > 6 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
      setPct(p);
      if (p >= READ_THRESHOLD && !markedRef.current) {
        markedRef.current = true;
        const path = window.location.pathname;
        markPathRead(path);
        setRead(true); // flash the green checkmark, then revert to the arrow
        try { window.mdcranTrack?.("page_read", { path }); } catch { /* */ }
        window.setTimeout(() => setRead(false), 1800);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The page height grows as lazy/below-the-fold content mounts — recompute the
    // progress whenever the document size changes so the ring stays accurate.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => onScroll());
      ro.observe(document.body);
    }
    // A couple of early re-checks cover image decode / font / data settling.
    const t1 = window.setTimeout(update, 600);
    const t2 = window.setTimeout(update, 1800);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (ro) ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const visible = pct > 4;
  const offset = C * (1 - pct / 100);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-6 left-1/2 z-40 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 cursor-pointer"
      style={{
        borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent)",
        background: "rgba(8,8,8,0.7)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(-50%) scale(1)" : "translateX(-50%) scale(0.7)",
        pointerEvents: visible ? "auto" : "none",
        boxShadow: read ? "0 0 18px rgba(239,66,66,0.5)" : "0 6px 20px rgba(0,0,0,0.4)",
      }}
    >
      <svg viewBox="0 0 44 44" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
        <circle
          cx="22"
          cy="22"
          r={R}
          fill="none"
          stroke="var(--theme-primary, #ef4242)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.15s linear" }}
        />
      </svg>
      <span
        className="relative flex items-center justify-center transition-transform duration-300"
        style={{ color: "var(--theme-primary, #ef4242)", transform: read ? "scale(1.15)" : "scale(1)" }}
      >
        {read ? <Check size={16} /> : <ArrowUp size={15} />}
      </span>
    </button>
  );
}
