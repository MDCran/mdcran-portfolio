"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Settings2, Plus, Check, X } from "lucide-react";
import type { BarDrinkCategory } from "@/lib/types";

interface PoolItem { label: string; color: string; category: BarDrinkCategory }

const ITEM_H = 66;          // px per reel row
const ROWS = 5;             // visible rows
const CENTER = 2;           // centered row index
const PREFS_KEY = "mdcran_bar_prefs_v1";
const CUSTOM_CAT: BarDrinkCategory = { id: "__custom", name: "Your Picks", color: "#a855f7", description: "Your own addition to the lineup — no take-backs.", options: [] };

interface Prefs { selected: string[]; disabled: string[]; custom: string[] }

export default function BarWheelClient({ categories }: { categories: BarDrinkCategory[] }) {
  const allIds = useMemo(() => categories.map((c) => c.id), [categories]);
  const [prefs, setPrefs] = useState<Prefs>({ selected: allIds, disabled: [], custom: [] });
  const [loaded, setLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // Load / persist player prefs so the lineup sticks.
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

  // The active drink pool from selected categories minus disabled drinks.
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

  // Slot reel
  const controls = useAnimationControls();
  const [reel, setReel] = useState<PoolItem[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<PoolItem | null>(null);

  // Power meter
  const [power, setPower] = useState(0);
  const [charging, setCharging] = useState(false);
  const holdRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => { if (pool.length && reel.length === 0) setReel(pool.slice(0, ROWS + 2)); }, [pool, reel.length]);

  const stopCharge = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; }, []);
  useEffect(() => () => stopCharge(), [stopCharge]);

  const spin = useCallback(async (p: number) => {
    if (pool.length === 0 || spinning) return;
    setResult(null);
    setCharging(false);
    setSpinning(true);
    // Build a long sequence of random drinks ending on the winner.
    const len = 22 + Math.round(p * 46);
    const seq: PoolItem[] = [];
    for (let i = 0; i < len - 1; i++) seq.push(pool[Math.floor(Math.random() * pool.length)]);
    const winner = pool[Math.floor(Math.random() * pool.length)];
    seq.push(winner);
    setReel(seq);

    const winnerIndex = seq.length - 1;
    const duration = 3 + p * 4.5;
    await controls.set({ y: CENTER * ITEM_H });          // start with item 0 centered
    await controls.start({ y: (CENTER - winnerIndex) * ITEM_H, transition: { duration, ease: [0.12, 0.62, 0.08, 1] } });
    setResult(winner);
    setSpinning(false);
    setPower(0);
  }, [pool, spinning, controls]);

  const beginCharge = useCallback(() => {
    if (spinning || pool.length === 0) return;
    setResult(null);
    setCharging(true);
    holdRef.current = performance.now();
    const tick = () => { setPower(Math.min(1, (performance.now() - holdRef.current) / 1400)); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }, [spinning, pool.length]);
  const releaseCharge = useCallback(() => { if (!charging) return; stopCharge(); void spin(Math.max(0.08, power)); }, [charging, power, spin, stopCharge]);

  const toggleCat = (id: string) => setPrefs((p) => ({ ...p, selected: p.selected.includes(id) ? p.selected.filter((x) => x !== id) : [...p.selected, id] }));
  const toggleDrink = (catId: string, opt: string) => { const key = `${catId}::${opt}`; setPrefs((p) => ({ ...p, disabled: p.disabled.includes(key) ? p.disabled.filter((x) => x !== key) : [...p.disabled, key] })); };
  const addCustom = () => { const v = customInput.trim(); if (!v) return; setPrefs((p) => ({ ...p, custom: [...p.custom, v], selected: p.selected.includes(CUSTOM_CAT.id) ? p.selected : [...p.selected, CUSTOM_CAT.id] })); setCustomInput(""); };
  const removeCustom = (v: string) => setPrefs((p) => ({ ...p, custom: p.custom.filter((x) => x !== v) }));

  if (!loaded) return <main className="min-h-screen bg-[#080608]" />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_25%,#1a1015,#0a0708_60%,#000)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(239,66,66,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(239,66,66,0.05) 1px,transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(circle at center,#000 25%,transparent 75%)", WebkitMaskImage: "radial-gradient(circle at center,#000 25%,transparent 75%)" }} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#ef4242]/80">MDCran Presents</p>
        <h1 className="mt-2 font-nord text-4xl sm:text-5xl text-white" style={{ textShadow: "0 0 30px rgba(239,66,66,0.35)" }}>The Bar</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-white/50">Pick your lineup, then pull the lever — hold to charge and let the slot decide your fate.</p>

        {/* Category multi-select */}
        <div className="mt-6 w-full">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">On the slot</span>
            <button onClick={() => setShowSettings((s) => !s)} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40 hover:text-white/70 transition-colors">
              <Settings2 size={13} /> Customize
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {catList.map((cat) => {
              const on = prefs.selected.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCat(cat.id)}
                  className="rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all"
                  style={{ borderColor: on ? cat.color : "rgba(255,255,255,0.15)", background: on ? `${cat.color}22` : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.45)" }}
                >
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: cat.color, opacity: on ? 1 : 0.4 }} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings: per-drink toggles + add your own */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 w-full overflow-hidden"
            >
              <div className="rounded-sm border border-white/10 bg-white/[0.03] p-3 space-y-3">
                {catList.map((cat) => (
                  <div key={cat.id}>
                    <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em]" style={{ color: cat.color }}>{cat.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.options.map((opt) => {
                        const off = prefs.disabled.includes(`${cat.id}::${opt}`);
                        return (
                          <button key={opt} onClick={() => toggleDrink(cat.id, opt)} className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] transition-colors" style={{ borderColor: off ? "rgba(255,255,255,0.12)" : `${cat.color}66`, color: off ? "rgba(255,255,255,0.3)" : "#fff", textDecoration: off ? "line-through" : "none" }}>
                            {!off && <Check size={10} style={{ color: cat.color }} />} {opt}
                            {cat.id === CUSTOM_CAT.id && <X size={10} className="ml-0.5 text-white/40 hover:text-[#ef4242]" onClick={(e) => { e.stopPropagation(); removeCustom(opt); }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <input value={customInput} onChange={(e) => setCustomInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }} placeholder="Add your own drink…" className="h-9 flex-1 rounded-sm border border-white/12 bg-white/5 px-3 text-[12px] text-white outline-none focus:border-white/30 placeholder:text-white/25" />
                  <button onClick={addCustom} className="inline-flex h-9 items-center gap-1 rounded-sm bg-[#ef4242] px-3 text-[11px] font-medium text-white"><Plus size={13} /> Add</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slot machine */}
        <div className="relative mt-7 w-full max-w-[300px]">
          <div className="rounded-md border-2 p-3" style={{ borderColor: "#ef424255", background: "linear-gradient(#140e11,#0a0708)", boxShadow: "0 0 50px rgba(239,66,66,0.15), inset 0 0 30px rgba(0,0,0,0.6)" }}>
            <div className="relative overflow-hidden rounded-sm bg-black/60" style={{ height: ROWS * ITEM_H }}>
              {/* Payline window */}
              <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: CENTER * ITEM_H, height: ITEM_H, borderTop: "2px solid #ef4242", borderBottom: "2px solid #ef4242", background: "rgba(239,66,66,0.08)", boxShadow: "0 0 24px rgba(239,66,66,0.3)" }} />
              {/* Fade top/bottom */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[88px]" style={{ background: "linear-gradient(#0a0708,transparent)" }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[88px]" style={{ background: "linear-gradient(transparent,#0a0708)" }} />
              {/* Reel strip */}
              <motion.div animate={controls} initial={{ y: CENTER * ITEM_H }} className="absolute inset-x-0 top-0" style={{ filter: spinning ? "blur(1.2px)" : "none" }}>
                {reel.map((it, i) => (
                  <div key={i} className="flex items-center justify-center px-3 text-center" style={{ height: ITEM_H }}>
                    <span className="font-nord text-[15px] leading-tight" style={{ color: it.color, textShadow: `0 0 14px ${it.color}55` }}>{it.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
          {pool.length === 0 && <p className="mt-2 text-center text-[11px] text-white/40">Select at least one category to load the slot.</p>}
        </div>

        {/* Power meter + lever */}
        <div className="mt-7 w-full max-w-[300px] select-none">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/40">
            <span>Pull Power</span>
            <span>{spinning ? "Rolling…" : charging ? `${Math.round(power * 100)}%` : "Hold to charge"}</span>
          </div>
          <div className="relative h-5 w-full overflow-hidden rounded-full border border-white/12 bg-white/5">
            <div className="h-full rounded-full transition-[width] duration-75" style={{ width: `${power * 100}%`, background: "linear-gradient(90deg,#22c55e,#f59e0b 60%,#ef4242)" }} />
          </div>
          <button
            type="button"
            disabled={spinning || pool.length === 0}
            onPointerDown={(e) => { e.preventDefault(); beginCharge(); }}
            onPointerUp={releaseCharge}
            onPointerLeave={() => { if (charging) releaseCharge(); }}
            onPointerCancel={() => { if (charging) releaseCharge(); }}
            className="mt-4 h-12 w-full rounded-sm bg-[#ef4242] font-nord text-sm uppercase tracking-[0.2em] text-white transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{ boxShadow: charging ? `0 0 ${10 + power * 44}px rgba(239,66,66,${0.4 + power * 0.5})` : "0 4px 14px rgba(239,66,66,0.3)" }}
          >
            {spinning ? "Good luck…" : charging ? "Release to pull!" : "Hold to charge"}
          </button>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && !spinning && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 w-full max-w-[320px] rounded-sm border p-5 text-center"
              style={{ borderColor: result.color, background: "rgba(10,7,8,0.85)", boxShadow: `0 0 40px ${result.color}33` }}
            >
              <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: result.color }}>{result.category.name}</p>
              <p className="mt-1.5 font-nord text-2xl text-white">{result.label}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/55">{result.category.description}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Link href="/" className="mt-10 text-[11px] uppercase tracking-[0.18em] text-white/30 hover:text-white/60 transition-colors">← Back to MDCran.com</Link>
      </div>
    </main>
  );
}
