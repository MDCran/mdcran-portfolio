"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { BarDrinkCategory } from "@/lib/types";

interface Segment { label: string; color: string; category: BarDrinkCategory }

const SIZE = 360;
const R = SIZE / 2;
const CX = R;
const CY = R;

/** Point on the wheel at `angleDeg` (clockwise from top) and radius `radius`. */
function pt(angleDeg: number, radius: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

/** Slightly darken/lighten a hex color so multiple options in one category differ. */
function shade(hex: string, amt: number): string {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  g = Math.max(0, Math.min(255, Math.round(g + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function BarWheelClient({ categories }: { categories: BarDrinkCategory[] }) {
  // Flatten categories into individual wheel segments (each drink = one slice).
  const segments = useMemo<Segment[]>(() => {
    const out: Segment[] = [];
    for (const cat of categories) {
      cat.options.forEach((opt, i) => {
        out.push({ label: opt, color: shade(cat.color, (i - 1) * 16), category: cat });
      });
    }
    return out;
  }, [categories]);

  const n = segments.length;
  const seg = n > 0 ? 360 / n : 360;

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinMs, setSpinMs] = useState(4000);
  const [winner, setWinner] = useState<Segment | null>(null);

  // Power meter
  const [power, setPower] = useState(0);    // 0..1
  const [charging, setCharging] = useState(false);
  const holdStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const stopCharge = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const launch = useCallback((p: number) => {
    if (n === 0) return;
    setWinner(null);
    setCharging(false);
    // More power → more turns + a longer, slower-settling spin.
    const turns = 4 + p * 9;                    // 4–13 full rotations
    const extra = Math.random() * 360;          // random landing
    const target = rotation + turns * 360 + extra;
    const duration = 3000 + p * 4500;           // 3–7.5s
    setSpinMs(duration);
    setSpinning(true);
    setRotation(target);
    window.setTimeout(() => {
      // Which segment sits under the top pointer after the final rotation?
      const mod = ((target % 360) + 360) % 360;
      const winAngle = (360 - mod) % 360;       // segment center now at top
      const idx = Math.floor(winAngle / seg) % n;
      setWinner(segments[idx]);
      setSpinning(false);
      setPower(0);
    }, duration + 60);
  }, [n, rotation, seg, segments]);

  const beginCharge = useCallback(() => {
    if (spinning) return;
    setWinner(null);
    setCharging(true);
    holdStartRef.current = performance.now();
    const tick = () => {
      const held = performance.now() - holdStartRef.current;
      // Fill to full over 1.4s, then gently pulse so holding longer caps out.
      const p = Math.min(1, held / 1400);
      setPower(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [spinning]);

  const releaseCharge = useCallback(() => {
    if (!charging) return;
    stopCharge();
    const p = Math.max(0.08, power); // a tap still spins a little
    launch(p);
  }, [charging, power, launch, stopCharge]);

  useEffect(() => () => stopCharge(), [stopCharge]);

  if (n === 0) {
    return (
      <main className="min-h-screen bg-[#080608] flex items-center justify-center text-white/50 font-jb">
        The bar is being restocked — check back soon.
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_30%,#15101a,#080608_60%,#000)] text-white">
      {/* Ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(239,66,66,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(239,66,66,0.05) 1px,transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(circle at center,#000 30%,transparent 75%)", WebkitMaskImage: "radial-gradient(circle at center,#000 30%,transparent 75%)" }} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-12">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#ef4242]/80">MDCran Presents</p>
        <h1 className="mt-2 font-nord text-4xl sm:text-5xl text-white text-center" style={{ textShadow: "0 0 30px rgba(239,66,66,0.35)" }}>The Bar</h1>
        <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-white/50">
          Can&apos;t decide what to drink? Hold the launcher to charge it up, let go, and let the wheel pick your fate.
        </p>

        {/* Wheel */}
        <div className="relative mt-8" style={{ width: SIZE, maxWidth: "92vw" }}>
          {/* Pointer */}
          <div className="absolute left-1/2 -top-1 z-20 -translate-x-1/2" aria-hidden>
            <div style={{ width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: "22px solid #fff", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
          </div>

          <div className="relative mx-auto aspect-square w-full">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="h-full w-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? `transform ${spinMs}ms cubic-bezier(0.12,0.7,0.1,1)` : "none",
                filter: "drop-shadow(0 18px 50px rgba(0,0,0,0.6))",
              }}
            >
              <circle cx={CX} cy={CY} r={R - 1} fill="#0a0a0a" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              {segments.map((s, i) => {
                const a0 = i * seg, a1 = (i + 1) * seg;
                const [x0, y0] = pt(a0, R - 6);
                const [x1, y1] = pt(a1, R - 6);
                const large = seg > 180 ? 1 : 0;
                const [lx, ly] = pt((a0 + a1) / 2, (R - 6) * 0.62);
                return (
                  <g key={i}>
                    <path d={`M ${CX} ${CY} L ${x0} ${y0} A ${R - 6} ${R - 6} 0 ${large} 1 ${x1} ${y1} Z`} fill={s.color} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
                    <text
                      x={lx} y={ly}
                      fill="#0a0a0a"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${(a0 + a1) / 2} ${lx} ${ly})`}
                      style={{ pointerEvents: "none" }}
                    >
                      {s.label.length > 20 ? s.label.slice(0, 19) + "…" : s.label}
                    </text>
                  </g>
                );
              })}
              <circle cx={CX} cy={CY} r="26" fill="#0a0a0a" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              <circle cx={CX} cy={CY} r="8" fill="#ef4242" />
            </svg>
          </div>
        </div>

        {/* Power meter launcher */}
        <div className="mt-9 w-full max-w-sm select-none">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/40">
            <span>Launch Power</span>
            <span>{spinning ? "Spinning…" : charging ? `${Math.round(power * 100)}%` : "Hold to charge"}</span>
          </div>
          <div className="relative h-5 w-full overflow-hidden rounded-full border border-white/12 bg-white/5">
            <div
              className="h-full rounded-full transition-[width] duration-75"
              style={{ width: `${power * 100}%`, background: "linear-gradient(90deg,#22c55e,#f59e0b 60%,#ef4242)" }}
            />
          </div>
          <button
            type="button"
            disabled={spinning}
            onPointerDown={(e) => { e.preventDefault(); beginCharge(); }}
            onPointerUp={releaseCharge}
            onPointerLeave={() => { if (charging) releaseCharge(); }}
            onPointerCancel={() => { if (charging) releaseCharge(); }}
            className="mt-4 h-12 w-full rounded-sm bg-[#ef4242] font-nord text-sm uppercase tracking-[0.2em] text-white transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{ boxShadow: charging ? `0 0 ${10 + power * 40}px rgba(239,66,66,${0.4 + power * 0.5})` : "0 4px 14px rgba(239,66,66,0.3)" }}
          >
            {spinning ? "Good luck…" : charging ? "Release to spin!" : "Hold to charge"}
          </button>
        </div>

        {/* Result */}
        <AnimatePresence>
          {winner && !spinning && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 w-full max-w-md rounded-sm border p-5 text-center"
              style={{ borderColor: winner.category.color, background: "rgba(8,8,10,0.85)", boxShadow: `0 0 40px ${winner.category.color}33` }}
            >
              <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: winner.category.color }}>{winner.category.name}</p>
              <p className="mt-1.5 font-nord text-2xl text-white">{winner.label}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/55">{winner.category.description}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="mt-10 grid w-full max-w-md grid-cols-2 gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-[11px] text-white/45">
              <span className="h-3 w-3 flex-none rounded-sm" style={{ background: c.color }} />
              {c.name}
            </div>
          ))}
        </div>

        <Link href="/" className="mt-10 text-[11px] uppercase tracking-[0.18em] text-white/30 hover:text-white/60 transition-colors">← Back to MDCran.com</Link>
      </div>
    </main>
  );
}
