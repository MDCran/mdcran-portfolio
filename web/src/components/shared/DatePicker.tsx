"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Reusable date / date-time picker.

   - `value`  : native-input-compatible string.
                date mode      → "YYYY-MM-DD"
                datetime mode  → "YYYY-MM-DDTHH:mm"
   - `onChange`: emits the same string format, so this is a drop-in replacement
                 for <input type="date"> / <input type="datetime-local">.
   - `withTime`: show an hour/minute/AM-PM picker.
   ────────────────────────────────────────────────────────────────────────── */

type Props = {
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  className?: string;
  placeholder?: string;
  /** Inclusive bounds, as YYYY-MM-DD. */
  min?: string;
  max?: string;
  disabled?: boolean;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string, withTime: boolean): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], withTime ? +(m[4] ?? 0) : 0, withTime ? +(m[5] ?? 0) : 0);
  return isNaN(d.getTime()) ? null : d;
}

function fmtValue(d: Date, withTime: boolean): string {
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${base}T${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}

function fmtLabel(d: Date, withTime: boolean): string {
  const base = `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
  if (!withTime) return base;
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${base} · ${h}:${pad(d.getMinutes())} ${ampm}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DatePicker({ value, onChange, withTime = false, className = "", placeholder = "Select date", min, max, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const selected = useMemo(() => parse(value, withTime), [value, withTime]);
  // The month currently shown in the grid.
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const d = selected ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => setMounted(true), []);

  // Re-sync the viewed month when the value changes externally.
  useEffect(() => {
    if (selected) setView({ y: selected.getFullYear(), m: selected.getMonth() });
  }, [selected]);

  // Position the popover under the trigger.
  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 280;
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    setCoords({ top: r.bottom + 6, left: Math.max(8, left), width });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onResize = () => place();
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    document.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      document.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const minD = useMemo(() => parse(min ?? "", false), [min]);
  const maxD = useMemo(() => parse(max ?? "", false), [max]);

  const emit = (next: Date) => {
    // Keep the existing time when in time mode and only the day changed.
    onChange(fmtValue(next, withTime));
  };

  const pickDay = (day: number) => {
    const base = selected ?? new Date(view.y, view.m, day, 12, 0);
    const next = new Date(view.y, view.m, day, withTime ? base.getHours() : 0, withTime ? base.getMinutes() : 0);
    emit(next);
    if (!withTime) setOpen(false);
  };

  const setTime = (h: number, min2: number) => {
    const base = selected ?? new Date(view.y, view.m, 1);
    emit(new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, min2));
  };

  const stepMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  // Build calendar grid (leading blanks + days).
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const today = new Date();
  const years = useMemo(() => {
    const minY = minD ? minD.getFullYear() : view.y - 80;
    const maxY = maxD ? maxD.getFullYear() : view.y + 10;
    const arr: number[] = [];
    for (let y = maxY; y >= minY; y--) arr.push(y);
    return arr;
  }, [minD, maxD, view.y]);

  const dayDisabled = (day: number) => {
    const d = new Date(view.y, view.m, day);
    if (minD && d < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate())) return true;
    if (maxD && d > new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate())) return true;
    return false;
  };

  const hour12 = selected ? (selected.getHours() % 12 || 12) : 12;
  const isPM = selected ? selected.getHours() >= 12 : false;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={className || "flex h-9 w-full items-center gap-2 rounded-sm border border-white/10 bg-white/[0.04] px-2.5 text-xs text-white outline-none transition-colors hover:border-white/20 focus:border-[var(--cranberry,#ef4242)] disabled:opacity-50"}
      >
        <CalendarIcon size={13} className="shrink-0 text-white/40" />
        <span className={selected ? "text-white" : "text-white/35"}>
          {selected ? fmtLabel(selected, withTime) : placeholder}
        </span>
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={popRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="fixed z-[220] rounded-sm border border-white/12 bg-[#0a0a0c]/98 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              style={{ top: coords.top, left: coords.left, width: coords.width }}
            >
              {/* Header: month nav + month/year selects */}
              <div className="mb-2 flex items-center gap-1.5">
                <button type="button" onClick={() => stepMonth(-1)} aria-label="Previous month" className="flex h-7 w-7 items-center justify-center rounded-sm text-white/55 hover:bg-white/10 hover:text-white">
                  <ChevronLeft size={15} />
                </button>
                <select
                  value={view.m}
                  onChange={(e) => setView((v) => ({ ...v, m: +e.target.value }))}
                  className="h-7 flex-1 rounded-sm border border-white/10 bg-white/[0.05] px-1.5 text-xs text-white outline-none focus:border-[var(--cranberry,#ef4242)]"
                >
                  {MONTHS.map((mo, i) => <option key={mo} value={i} className="bg-[#0a0a0c]">{mo}</option>)}
                </select>
                <select
                  value={view.y}
                  onChange={(e) => setView((v) => ({ ...v, y: +e.target.value }))}
                  className="h-7 w-[72px] rounded-sm border border-white/10 bg-white/[0.05] px-1.5 text-xs text-white outline-none focus:border-[var(--cranberry,#ef4242)]"
                >
                  {years.map((y) => <option key={y} value={y} className="bg-[#0a0a0c]">{y}</option>)}
                </select>
                <button type="button" onClick={() => stepMonth(1)} aria-label="Next month" className="flex h-7 w-7 items-center justify-center rounded-sm text-white/55 hover:bg-white/10 hover:text-white">
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Day-of-week labels */}
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-white/30">
                {DOW.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`b${i}`} />;
                  const cellDate = new Date(view.y, view.m, day);
                  const isSel = selected && sameDay(cellDate, selected);
                  const isToday = sameDay(cellDate, today);
                  const dis = dayDisabled(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={dis}
                      onClick={() => pickDay(day)}
                      className="relative flex h-8 items-center justify-center rounded-sm text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-25"
                      style={
                        isSel
                          ? { backgroundColor: "var(--theme-primary, #ef4242)", color: "var(--on-accent, #fff)", fontWeight: 600 }
                          : { color: "rgba(255,255,255,0.8)" }
                      }
                      onMouseEnter={(e) => { if (!isSel && !dis) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                      onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      {day}
                      {isToday && !isSel && <span className="absolute bottom-1 h-1 w-1 rounded-full" style={{ backgroundColor: "var(--theme-primary, #ef4242)" }} />}
                    </button>
                  );
                })}
              </div>

              {/* Time picker */}
              {withTime && (
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/8 pt-2.5">
                  <Clock size={13} className="text-white/40" />
                  <select
                    value={hour12}
                    onChange={(e) => { const h12 = +e.target.value; const h24 = (h12 % 12) + (isPM ? 12 : 0); setTime(h24, selected?.getMinutes() ?? 0); }}
                    className="h-7 rounded-sm border border-white/10 bg-white/[0.05] px-1 text-xs text-white outline-none focus:border-[var(--cranberry,#ef4242)]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h} className="bg-[#0a0a0c]">{pad(h)}</option>)}
                  </select>
                  <span className="text-white/40">:</span>
                  <select
                    value={selected?.getMinutes() ?? 0}
                    onChange={(e) => setTime(selected?.getHours() ?? 0, +e.target.value)}
                    className="h-7 rounded-sm border border-white/10 bg-white/[0.05] px-1 text-xs text-white outline-none focus:border-[var(--cranberry,#ef4242)]"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((mn) => <option key={mn} value={mn} className="bg-[#0a0a0c]">{pad(mn)}</option>)}
                  </select>
                  <div className="ml-auto flex overflow-hidden rounded-sm border border-white/10">
                    {(["AM", "PM"] as const).map((p) => {
                      const active = (p === "PM") === isPM;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { const h12 = hour12; const h24 = (h12 % 12) + (p === "PM" ? 12 : 0); setTime(h24, selected?.getMinutes() ?? 0); }}
                          className="px-2 py-1 text-[11px] font-medium transition-colors"
                          style={active ? { backgroundColor: "var(--theme-primary, #ef4242)", color: "var(--on-accent, #fff)" } : { color: "rgba(255,255,255,0.6)" }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="mt-2.5 flex items-center justify-between border-t border-white/8 pt-2.5">
                <button
                  type="button"
                  onClick={() => { const n = new Date(); emit(withTime ? n : new Date(n.getFullYear(), n.getMonth(), n.getDate())); if (!withTime) setOpen(false); }}
                  className="text-[11px] text-white/55 hover:text-white"
                >
                  Today
                </button>
                <div className="flex items-center gap-2">
                  {value && (
                    <button
                      type="button"
                      onClick={() => { onChange(""); setOpen(false); }}
                      className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white"
                    >
                      <X size={11} /> Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-sm px-2.5 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: "var(--theme-primary, #ef4242)", color: "var(--on-accent, #fff)" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
