"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Settings2, Plus, Check, X } from "lucide-react";
import { haptic } from "@/lib/haptics";
import type { BarDrinkCategory } from "@/lib/types";

interface PoolItem { label: string; color: string; category: BarDrinkCategory }

const ROWS = 5;             // faces visible in the window
const CENTER = 2;           // centered (payline) row
const PREFS_KEY = "mdcran_bar_prefs_v1";
const CUSTOM_CAT: BarDrinkCategory = { id: "__custom", name: "Your Picks", color: "#a855f7", description: "Your own addition to the lineup — no take-backs.", options: [] };
const SPIN_EASE: [number, number, number, number] = [0.1, 0.6, 0.06, 1];

interface Prefs { selected: string[]; disabled: string[]; custom: string[] }

/** Lighten/darken a hex color by `amt` (-255..255). */
function shade(hex: string, amt: number): string {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

/** Cubic-bezier easing evaluator (so haptic/audio ticks track the spin's deceleration). */
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const fy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) { const e = fx(t) - x; if (Math.abs(e) < 1e-4) break; const d = dfx(t) || 1e-4; t -= e / d; }
    return fy(Math.max(0, Math.min(1, t)));
  };
}

/** Chasing marquee bulbs — speed scales with charge; flashes white at full power. */
function Bulbs({ className, durationMs, flash, vertical }: { className?: string; durationMs: number; flash?: boolean; vertical?: boolean }) {
  return (
    <div className={className}>
      {Array.from({ length: vertical ? 5 : 9 }).map((_, i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{ height: 6, width: 6, background: flash ? "#fff" : "#facc15", boxShadow: flash ? "0 0 12px #fff" : undefined }}
          animate={flash ? { opacity: 1 } : { opacity: [0.18, 1, 0.18], boxShadow: ["0 0 0px #facc15", "0 0 9px #facc15", "0 0 0px #facc15"] }}
          transition={flash ? { duration: 0.08 } : { duration: durationMs / 1000, repeat: Infinity, delay: i * (durationMs / 1000) * 0.11, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function BarWheelClient({ categories }: { categories: BarDrinkCategory[] }) {
  const allIds = useMemo(() => categories.map((c) => c.id), [categories]);
  const [prefs, setPrefs] = useState<Prefs>({ selected: allIds, disabled: [], custom: [] });
  const [loaded, setLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Prefs>;
        setPrefs({
          selected: Array.isArray(p.selected) ? p.selected.filter((id) => allIds.includes(id) || id === CUSTOM_CAT.id) : allIds,
          disabled: Array.isArray(p.disabled) ? p.disabled : [],
          custom: Array.isArray(p.custom) ? p.custom : [],
        });
      }
    } catch { /* */ }
    setLoaded(true);
  }, [allIds]);
  useEffect(() => { if (loaded) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* */ } } }, [prefs, loaded]);

  const catList = useMemo(() => {
    const base = [...categories];
    if (prefs.custom.length) base.push({ ...CUSTOM_CAT, options: prefs.custom });
    return base;
  }, [categories, prefs.custom]);

  const pool = useMemo<PoolItem[]>(() => {
    const out: PoolItem[] = [];
    for (const cat of catList) {
      if (!prefs.selected.includes(cat.id)) continue;
      for (const opt of cat.options) {
        if (prefs.disabled.includes(`${cat.id}::${opt}`)) continue;
        out.push({ label: opt, color: cat.color, category: cat });
      }
    }
    return out;
  }, [catList, prefs.selected, prefs.disabled]);

  // Drum
  const controls = useAnimationControls();
  const [faces, setFaces] = useState<PoolItem[]>([]);
  const rotRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<PoolItem | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  // Shorter faces → ~5 visible. Window stays tall (machine height unchanged).
  const [faceH, setFaceH] = useState(74);
  useEffect(() => {
    const calc = () => setFaceH(Math.round(Math.max(54, Math.min(86, window.innerHeight * 0.118))));
    calc(); window.addEventListener("resize", calc); return () => window.removeEventListener("resize", calc);
  }, []);
  const faceAngle = faces.length ? 360 / faces.length : 90;
  const radius = Math.round((faceH / 2) / Math.tan((Math.PI / 180) * (faceAngle / 2))) || faceH;
  const sceneH = ROWS * faceH;

  // Power meter + charge feedback
  const [power, setPower] = useState(0);
  const [charging, setCharging] = useState(false);
  const [chargeTier, setChargeTier] = useState(0);   // 0 idle, 1-3 escalating
  const [ledFlash, setLedFlash] = useState(false);
  const holdRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const cabinetRef = useRef<HTMLDivElement | null>(null);
  const barFillRef = useRef<HTMLDivElement | null>(null); // driven directly each frame
  const audioRef = useRef<AudioContext | null>(null);
  const tickTimersRef = useRef<number[]>([]);
  const winnerTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pool.length) { setFaces([]); return; }
    let s = [...pool];
    for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
    // The 3D drum needs enough faces to form a cylinder — with 1–2 drinks the geometry
    // collapses (faceAngle ≥ 180° → radius 0/NaN) and shows nothing. Repeat the pool to
    // a minimum so it always renders + spins (landing on a copy of the chosen drink).
    const MIN_FACES = 8;
    if (s.length < MIN_FACES) {
      const base = [...s];
      while (s.length < MIN_FACES) s = s.concat(base);
    }
    setFaces(s);
  }, [pool]);

  const clearTicks = useCallback(() => { tickTimersRef.current.forEach((t) => clearTimeout(t)); tickTimersRef.current = []; }, []);
  const stopCharge = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; if (cabinetRef.current) cabinetRef.current.style.transform = ""; }, []);
  useEffect(() => () => { stopCharge(); clearTicks(); if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current); }, [stopCharge, clearTicks]);

  const playClick = useCallback(() => {
    const ctx = audioRef.current; if (!ctx) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = 760 + Math.random() * 120;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.06);
    } catch { /* */ }
  }, []);

  const spin = useCallback(async (p: number) => {
    if (faces.length === 0 || spinning) return;
    if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current);
    setResult(null); setShowWinner(false); setLockedIndex(null); setCelebrate(false);
    setCharging(false);
    setSpinning(true);
    const N = faces.length, fa = 360 / N;
    const winner = Math.floor(Math.random() * N);
    const turns = 4 + Math.round(p * 8);
    const base = rotRef.current;
    const targetMod = ((-winner * fa) % 360 + 360) % 360;
    const currentMod = ((base % 360) + 360) % 360;
    let delta = targetMod - currentMod; if (delta < 0) delta += 360;
    const totalDeg = turns * 360 + delta;
    const target = base + totalDeg;
    rotRef.current = target;
    const duration = 3 + p * 4.5;

    // Schedule haptic + click "ticks" timed to the eased deceleration.
    clearTicks();
    const ease = cubicBezier(...SPIN_EASE);
    let lastBoundary = -1;
    for (let prog = 0; prog <= 1; prog += 0.004) {
      const deg = ease(prog) * totalDeg;
      const boundary = Math.floor(deg / fa);
      if (boundary !== lastBoundary) {
        lastBoundary = boundary;
        const at = prog * duration * 1000;
        tickTimersRef.current.push(window.setTimeout(() => { haptic(13); playClick(); }, at));
      }
    }

    await controls.start({ rotateX: target, transition: { duration, ease: SPIN_EASE } });
    // Lock → black out losers, celebrate, then pop the winner modal after a beat.
    setResult(faces[winner]);
    setLockedIndex(winner);
    setCelebrate(true);
    haptic([30, 40, 30]);
    setSpinning(false);
    setPower(0);
    window.setTimeout(() => setCelebrate(false), 1500);
    winnerTimerRef.current = window.setTimeout(() => setShowWinner(true), 2800);
  }, [faces, spinning, controls, clearTicks, playClick]);

  const beginCharge = useCallback(() => {
    if (spinning || faces.length === 0) return;
    setResult(null); setShowWinner(false); setLockedIndex(null);
    // Create / resume the audio context on this user gesture.
    if (!audioRef.current) { try { audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { /* */ } }
    audioRef.current?.resume?.().catch(() => {});
    setCharging(true);
    holdRef.current = performance.now();
    let flashed = false;
    let lastVibe = 0;
    haptic(12); // initial kick
    const tick = () => {
      const now = performance.now();
      const pw = Math.min(1, (now - holdRef.current) / 1400);
      setPower(pw);
      // Drive the fill width straight on the DOM so it grows smoothly during the hold,
      // independent of React's render timing on touch devices.
      if (barFillRef.current) barFillRef.current.style.width = `${pw * 100}%`;
      setChargeTier(pw < 0.33 ? 1 : pw < 0.66 ? 2 : 3);
      // Subtle cabinet shimmer that intensifies with charge.
      if (cabinetRef.current) { const mag = pw * 3.2; cabinetRef.current.style.transform = `translate(${(Math.random() - 0.5) * mag}px, ${(Math.random() - 0.5) * mag}px)`; }
      // Buzz the phone faster as the charge climbs (Android; iOS ignores vibrate).
      const interval = 170 - pw * 130; // 170ms → 40ms
      if (now - lastVibe > interval) { lastVibe = now; haptic(pw > 0.8 ? 16 : 9); }
      if (pw >= 0.99 && !flashed) { flashed = true; setLedFlash(true); haptic(35); window.setTimeout(() => setLedFlash(false), 120); }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [spinning, faces.length]);

  const releaseCharge = useCallback(() => {
    if (!charging) return;
    stopCharge();
    setChargeTier(0);
    const p = Math.max(0.08, power);
    if (barFillRef.current) barFillRef.current.style.width = "0%"; // empty the meter as the pull fires
    void spin(p);
  }, [charging, power, spin, stopCharge]);

  const toggleCat = (id: string) => setPrefs((p) => ({ ...p, selected: p.selected.includes(id) ? p.selected.filter((x) => x !== id) : [...p.selected, id] }));
  const toggleDrink = (catId: string, opt: string) => { const key = `${catId}::${opt}`; setPrefs((p) => ({ ...p, disabled: p.disabled.includes(key) ? p.disabled.filter((x) => x !== key) : [...p.disabled, key] })); };
  const addCustom = () => { const v = customInput.trim(); if (!v) return; setPrefs((p) => ({ ...p, custom: [...p.custom, v], selected: p.selected.includes(CUSTOM_CAT.id) ? p.selected : [...p.selected, CUSTOM_CAT.id] })); setCustomInput(""); };
  const removeCustom = (v: string) => setPrefs((p) => ({ ...p, custom: p.custom.filter((x) => x !== v) }));

  if (!loaded) return <main className="min-h-screen bg-[#080608]" />;

  const bulbDur = ledFlash ? 80 : chargeTier === 3 ? 280 : chargeTier === 2 ? 460 : chargeTier === 1 ? 680 : spinning ? 320 : 1000;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_22%,#1a1015,#0a0708_60%,#000)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(239,66,66,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(239,66,66,0.05) 1px,transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(circle at center,#000 25%,transparent 75%)", WebkitMaskImage: "radial-gradient(circle at center,#000 25%,transparent 75%)" }} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#ef4242]/80">MDCran Presents</p>
        <h1 className="mt-2 whitespace-nowrap text-center font-nord text-[clamp(1.9rem,9vw,3rem)] leading-none text-white" style={{ textShadow: "0 0 30px rgba(239,66,66,0.35)" }}>Bar Roulette</h1>

        {/* Category chips */}
        <div className="mt-5 w-full">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">On the slot</span>
            <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40 hover:text-white/70 transition-colors"><Settings2 size={13} /> Customize</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {catList.map((cat) => {
              const on = prefs.selected.includes(cat.id);
              return (
                <button key={cat.id} onClick={() => toggleCat(cat.id)} className="rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all" style={{ borderColor: on ? cat.color : "rgba(255,255,255,0.15)", background: on ? `${cat.color}22` : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.45)" }}>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: cat.color, opacity: on ? 1 : 0.4 }} />{cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot machine */}
        <div ref={cabinetRef} className="relative mt-5 w-full max-w-[340px]" style={{ willChange: "transform" }}>
          <div className="relative rounded-[26px] p-[3px]" style={{ background: "linear-gradient(160deg,#f9d976,#b8860b 30%,#3a2607 60%,#facc15 100%)", boxShadow: `0 0 ${spinning ? 80 : charging ? 46 : 30}px rgba(239,66,66,${spinning ? 0.5 : 0.22}), 0 26px 70px rgba(0,0,0,0.7)`, transition: "box-shadow 0.3s" }}>
            <div className="relative overflow-hidden rounded-[23px] px-6 py-4" style={{ background: "linear-gradient(160deg,#241015,#140a0d 55%,#080507)", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.12), inset 0 0 50px rgba(0,0,0,0.7)" }}>
              <div className="pointer-events-none absolute inset-0">
                <Bulbs className="absolute left-6 right-6 top-2 flex justify-between" durationMs={bulbDur} flash={ledFlash} />
                <Bulbs className="absolute left-6 right-6 bottom-2 flex justify-between" durationMs={bulbDur} flash={ledFlash} />
                <Bulbs vertical className="absolute left-2 top-9 bottom-9 flex flex-col justify-between" durationMs={bulbDur} flash={ledFlash} />
                <Bulbs vertical className="absolute right-2 top-9 bottom-9 flex flex-col justify-between" durationMs={bulbDur} flash={ledFlash} />
              </div>

              <motion.div className="mb-3 text-center font-nord text-[12px] uppercase tracking-[0.34em] text-[#facc15]" animate={celebrate ? { opacity: [1, 0.2, 1, 0.2, 1], color: ["#facc15", "#fff", "#facc15", "#fff", "#facc15"] } : { opacity: 1 }} transition={{ duration: 0.9, repeat: celebrate ? 1 : 0 }} style={{ textShadow: "0 0 14px #facc15aa" }}>★ Lucky Pour ★</motion.div>

              {/* drum scene */}
              <div className="relative overflow-hidden rounded-lg" style={{ height: sceneH, background: "radial-gradient(ellipse at 50% 40%,#1b1216,#060406)", boxShadow: "inset 0 0 44px rgba(0,0,0,0.95), inset 0 0 8px rgba(250,204,21,0.12)" }}>
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20" style={{ height: faceH * 1.6, background: "linear-gradient(#060406,transparent)" }} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20" style={{ height: faceH * 1.6, background: "linear-gradient(transparent,#060406)" }} />
                {/* payline */}
                <div className="pointer-events-none absolute inset-x-2 z-30" style={{ top: CENTER * faceH, height: faceH, borderTop: "2px solid #ef4242", borderBottom: "2px solid #ef4242", boxShadow: `0 0 ${spinning ? 40 : 22}px rgba(239,66,66,${spinning ? 0.65 : 0.35})`, borderRadius: 8, transition: "box-shadow 0.2s" }} />
                <div className="pointer-events-none absolute right-1 z-30 text-[#ef4242]" style={{ top: CENTER * faceH + faceH / 2 - 9, textShadow: "0 0 10px #ef4242" }}>◀</div>
                <div className="pointer-events-none absolute left-1 z-30 text-[#ef4242]" style={{ top: CENTER * faceH + faceH / 2 - 9, textShadow: "0 0 10px #ef4242" }}>▶</div>
                <div className="pointer-events-none absolute inset-0 z-30" style={{ background: "linear-gradient(100deg,rgba(255,255,255,0.12),transparent 38%), radial-gradient(ellipse at 50% 0%,rgba(255,255,255,0.08),transparent 55%)" }} />

                <div className="absolute inset-x-2" style={{ top: CENTER * faceH, height: faceH, perspective: 1300 }}>
                  {/* NOTE: never put a CSS `filter` on this element — filters flatten
                      transform-style:preserve-3d and the drum goes blank mid-spin. */}
                  <motion.div animate={controls} initial={{ rotateX: 0 }} style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
                    {faces.map((it, i) => {
                      const isWinner = lockedIndex === i;
                      const dimmed = lockedIndex !== null && !isWinner;
                      return (
                        <div key={i} className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center" style={{
                          height: faceH,
                          transform: `rotateX(${i * faceAngle}deg) translateZ(${radius}px)`,
                          backfaceVisibility: "hidden", borderRadius: 8,
                          background: `linear-gradient(150deg, ${shade(it.color, 30)}, ${it.color} 45%, ${shade(it.color, -70)})`,
                          boxShadow: isWinner ? `0 0 26px ${it.color}, inset 0 0 0 2px #fff` : "inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -10px 20px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.15)",
                          opacity: dimmed ? 0.12 : 1,
                          transition: "opacity 0.25s, box-shadow 0.25s",
                        }}>
                          <span className="font-nord text-[clamp(13px,4vw,18px)] uppercase tracking-wide leading-tight text-white" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.7)" }}>{it.label}</span>
                        </div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Confetti burst inside the cabinet */}
                <AnimatePresence>
                  {celebrate && (
                    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const ang = (i / 16) * Math.PI * 2;
                        const dist = 60 + Math.random() * 90;
                        const col = ["#facc15", "#ef4242", "#38bdf8", "#22c55e", "#a855f7"][i % 5];
                        return (
                          <motion.span key={i} className="absolute left-1/2 top-1/2 h-2 w-1.5 rounded-sm" style={{ background: col }}
                            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                            animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist + 30, opacity: 0, rotate: 360 }}
                            transition={{ duration: 1.1, ease: "easeOut" }} />
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          {pool.length === 0 && <p className="mt-2 text-center text-[11px] text-white/40">Select at least one category to load the slot.</p>}
        </div>

        {/* Power meter + lever */}
        <div className="mt-5 w-full max-w-[340px] select-none">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/40">
            <span>Pull Power</span>
            <span>{spinning ? "Rolling…" : charging ? `${Math.round(power * 100)}%` : "Hold to charge"}</span>
          </div>
          <div className="relative h-5 w-full overflow-hidden rounded-full border border-white/12 bg-white/5">
            <div ref={barFillRef} className="h-full rounded-full" style={{ width: `${power * 100}%`, background: "linear-gradient(90deg,#22c55e,#f59e0b 60%,#ef4242)" }} />
          </div>
          <button type="button" disabled={spinning || pool.length === 0}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => { e.preventDefault(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ } beginCharge(); }}
            onPointerUp={releaseCharge} onPointerCancel={() => { if (charging) releaseCharge(); }}
            className="mt-4 h-12 w-full touch-none select-none rounded-sm bg-[#ef4242] font-nord text-sm uppercase tracking-[0.2em] text-white transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{ boxShadow: charging ? `0 0 ${10 + power * 44}px rgba(239,66,66,${0.4 + power * 0.5})` : "0 4px 14px rgba(239,66,66,0.3)", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}>
            {spinning ? "Good luck…" : charging ? "Release to pull!" : "Hold to charge"}
          </button>
        </div>

        <Link href="/" className="mt-8 text-[11px] uppercase tracking-[0.18em] text-white/30 hover:text-white/60 transition-colors">← Back to MDCran.com</Link>
      </div>

      {/* Winner modal — pops in at the top after the celebration */}
      <AnimatePresence>
        {showWinner && result && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-5">
            <div className="relative w-full max-w-sm rounded-md border p-5 pt-6 text-center" style={{ borderColor: result.color, background: "rgba(12,8,9,0.95)", backdropFilter: "blur(10px)", boxShadow: `0 0 50px ${result.color}55, 0 20px 60px rgba(0,0,0,0.6)` }}>
              <button onClick={() => setShowWinner(false)} className="absolute right-3 top-3 text-white/40 hover:text-white" aria-label="Close"><X size={18} /></button>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#facc15]">★ Lucky Pour ★</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.24em]" style={{ color: result.color }}>{result.category.name}</p>
              <p className="mt-1.5 font-nord text-3xl uppercase text-white">{result.label}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/55">{result.category.description}</p>
              <button onClick={() => setShowWinner(false)} className="mt-4 h-10 w-full rounded-sm bg-[#ef4242] text-sm font-medium uppercase tracking-wider text-white">Got it — spin again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customize bottom sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-y-auto rounded-t-2xl border-t border-white/15 p-5"
              style={{ background: "rgba(16,12,14,0.9)", backdropFilter: "blur(18px)", boxShadow: "0 -20px 60px rgba(0,0,0,0.6)" }}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-3 flex items-center justify-between">
                <p className="font-nord text-base text-white">Customize the slot</p>
                <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                {catList.map((cat) => (
                  <div key={cat.id}>
                    <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em]" style={{ color: cat.color }}>{cat.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.options.map((opt) => {
                        const off = prefs.disabled.includes(`${cat.id}::${opt}`);
                        return (
                          <button key={opt} onClick={() => toggleDrink(cat.id, opt)} className="inline-flex items-center gap-1 rounded-sm border px-2.5 py-1.5 text-[12px] transition-colors" style={{ borderColor: off ? "rgba(255,255,255,0.12)" : `${cat.color}66`, color: off ? "rgba(255,255,255,0.3)" : "#fff", textDecoration: off ? "line-through" : "none" }}>
                            {!off && <Check size={11} style={{ color: cat.color }} />} {opt}
                            {cat.id === CUSTOM_CAT.id && <X size={11} className="ml-0.5 text-white/40 hover:text-[#ef4242]" onClick={(e) => { e.stopPropagation(); removeCustom(opt); }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <input value={customInput} onChange={(e) => setCustomInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }} placeholder="Add your own drink…" className="h-10 flex-1 rounded-sm border border-white/12 bg-white/5 px-3.5 text-[13px] text-white outline-none focus:border-white/30 placeholder:text-white/25" />
                  <button onClick={addCustom} className="inline-flex h-10 items-center gap-1 rounded-sm bg-[#ef4242] px-3.5 text-[12px] font-medium text-white"><Plus size={14} /> Add</button>
                </div>
                <button onClick={() => setShowSettings(false)} className="mt-1 h-11 w-full rounded-sm border border-white/15 text-sm text-white/70">Done</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
