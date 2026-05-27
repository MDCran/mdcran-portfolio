"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Settings2, Plus, Check, X } from "lucide-react";
import type { BarDrinkCategory } from "@/lib/types";

interface PoolItem { label: string; color: string; category: BarDrinkCategory }

const ITEM_H = 66;          // px per drum face
const PREFS_KEY = "mdcran_bar_prefs_v1";
const CUSTOM_CAT: BarDrinkCategory = { id: "__custom", name: "Your Picks", color: "#a855f7", description: "Your own addition to the lineup — no take-backs.", options: [] };

interface Prefs { selected: string[]; disabled: string[]; custom: string[] }

/** Lighten/darken a hex color by `amt` (-255..255) for gradient depth. */
function shade(hex: string, amt: number): string {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

/** A chasing row of marquee bulbs (gold), faster while spinning. */
function Bulbs({ className, fast }: { className?: string; fast?: boolean }) {
  return (
    <div className={className}>
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "#facc15" }}
          animate={{ opacity: [0.2, 1, 0.2], boxShadow: ["0 0 0px #facc15", "0 0 8px #facc15", "0 0 0px #facc15"] }}
          transition={{ duration: fast ? 0.5 : 1, repeat: Infinity, delay: i * (fast ? 0.05 : 0.12), ease: "easeInOut" }}
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

  // 3D slot drum
  const controls = useAnimationControls();
  const [faces, setFaces] = useState<PoolItem[]>([]);
  const rotRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<PoolItem | null>(null);
  const faceAngle = faces.length ? 360 / faces.length : 90;
  const radius = Math.round((ITEM_H / 2) / Math.tan((Math.PI / 180) * (faceAngle / 2))) || ITEM_H;

  // Power meter
  const [power, setPower] = useState(0);
  const [charging, setCharging] = useState(false);
  const holdRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // (Re)build the drum faces in a shuffled order whenever the pool changes.
  useEffect(() => {
    if (!pool.length) { setFaces([]); return; }
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    setFaces(shuffled);
  }, [pool]);

  const stopCharge = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; }, []);
  useEffect(() => () => stopCharge(), [stopCharge]);

  const spin = useCallback(async (p: number) => {
    if (faces.length === 0 || spinning) return;
    setResult(null);
    setCharging(false);
    setSpinning(true);
    const N = faces.length;
    const fa = 360 / N;
    const winner = Math.floor(Math.random() * N);
    const turns = 4 + Math.round(p * 8);
    // Land face `winner` at the front (net rotation ≡ 0): rot ≡ -winner*fa.
    const base = rotRef.current;
    const targetMod = ((-winner * fa) % 360 + 360) % 360;
    const currentMod = ((base % 360) + 360) % 360;
    let delta = targetMod - currentMod; if (delta < 0) delta += 360;
    const target = base + turns * 360 + delta;
    rotRef.current = target;
    const duration = 3 + p * 4.5;
    await controls.start({ rotateX: target, transition: { duration, ease: [0.1, 0.6, 0.06, 1] } });
    setResult(faces[winner]);
    setSpinning(false);
    setPower(0);
  }, [faces, spinning, controls]);

  const beginCharge = useCallback(() => {
    if (spinning || faces.length === 0) return;
    setResult(null);
    setCharging(true);
    holdRef.current = performance.now();
    const tick = () => { setPower(Math.min(1, (performance.now() - holdRef.current) / 1400)); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }, [spinning, faces.length]);
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
        <h1 className="mt-2 whitespace-nowrap text-center font-nord text-[clamp(1.9rem,9vw,3rem)] leading-none text-white" style={{ textShadow: "0 0 30px rgba(239,66,66,0.35)" }}>Bar Roulette</h1>
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

        {/* Slot machine — 3D drum cabinet */}
        <div className="relative mt-7 w-full max-w-[310px]">
          {/* Cabinet */}
          <div
            className="relative rounded-2xl p-4"
            style={{
              background: "linear-gradient(160deg,#2a1216,#160b0e 55%,#0a0608)",
              border: "2px solid #facc1555",
              boxShadow: `0 0 ${spinning ? 70 : charging ? 40 : 28}px rgba(239,66,66,${spinning ? 0.45 : 0.22}), inset 0 0 40px rgba(0,0,0,0.7), 0 20px 60px rgba(0,0,0,0.6)`,
              transition: "box-shadow 0.3s",
            }}
          >
            {/* Marquee bulbs */}
            <div className="pointer-events-none absolute inset-0">
              <Bulbs className="absolute left-5 right-5 top-1.5 flex justify-between" fast={spinning} />
              <Bulbs className="absolute left-5 right-5 bottom-1.5 flex justify-between" fast={spinning} />
            </div>

            <div className="mb-2 text-center font-nord text-[11px] uppercase tracking-[0.3em] text-[#facc15]" style={{ textShadow: "0 0 10px #facc1577" }}>★ Lucky Pour ★</div>

            {/* 3D drum scene */}
            <div className="relative overflow-hidden rounded-md" style={{ height: ITEM_H * 3, background: "radial-gradient(circle at 50% 50%,#161013,#070506)", boxShadow: "inset 0 0 30px rgba(0,0,0,0.9)" }}>
              {/* edge fades */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[72px]" style={{ background: "linear-gradient(#070506,transparent)" }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[72px]" style={{ background: "linear-gradient(transparent,#070506)" }} />
              {/* payline */}
              <div className="pointer-events-none absolute inset-x-2 z-30" style={{ top: ITEM_H, height: ITEM_H, borderTop: "2px solid #ef4242", borderBottom: "2px solid #ef4242", boxShadow: `0 0 ${spinning ? 34 : 20}px rgba(239,66,66,${spinning ? 0.6 : 0.35})`, borderRadius: 6, transition: "box-shadow 0.2s" }} />
              {/* glass glare */}
              <div className="pointer-events-none absolute inset-0 z-30" style={{ background: "linear-gradient(105deg,rgba(255,255,255,0.08),transparent 40%)" }} />

              <div className="absolute inset-x-2" style={{ top: ITEM_H, height: ITEM_H, perspective: 1000 }}>
                <motion.div animate={controls} initial={{ rotateX: 0 }} style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
                  {faces.map((it, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 flex items-center justify-center px-3 text-center"
                      style={{
                        height: ITEM_H,
                        transform: `rotateX(${i * faceAngle}deg) translateZ(${radius}px)`,
                        backfaceVisibility: "hidden",
                        borderRadius: 6,
                        background: `linear-gradient(135deg, ${it.color}, ${shade(it.color, -60)})`,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -6px 14px rgba(0,0,0,0.35)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <span className="font-nord text-[14px] leading-tight text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{it.label}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
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
