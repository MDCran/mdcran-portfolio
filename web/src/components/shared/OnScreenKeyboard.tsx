"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";

const ROWS: string[][] = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
  ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
  ["Space"],
];

const SHIFT_MAP: Record<string, string> = {
  "`":"~", "1":"!", "2":"@", "3":"#", "4":"$", "5":"%", "6":"^", "7":"&", "8":"*", "9":"(", "0":")",
  "-":"_", "=":"+", "[":"{", "]":"}", "\\":"|", ";":":", "'":'"', ",":"<", ".":">", "/":"?",
};

const WIDE_KEYS = new Set(["Backspace", "Tab", "Caps", "Enter", "Shift", "Space"]);

const LABELS: Record<string, string> = {
  Backspace: "⌫", Tab: "⇥", Caps: "⇪", Enter: "↵", Shift: "⇧", Space: "Space",
};

function fireOnElement(key: string, shift: boolean, caps: boolean) {
  const el = document.activeElement;
  if (!el) return;

  let char = key;
  if (key.length === 1) {
    if (shift || caps) char = SHIFT_MAP[key] ?? key.toUpperCase();
  }
  if (key === "Space") char = " ";

  const opts: KeyboardEventInit = { key: char, code: `Key${key.toUpperCase()}`, bubbles: true, cancelable: true };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new KeyboardEvent("keyup", { ...opts, cancelable: false }));

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    if (key === "Backspace") {
      el.value = el.value.slice(0, Math.max(0, s - 1)) + el.value.slice(e);
      el.selectionStart = el.selectionEnd = Math.max(0, s - 1);
    } else if (key !== "Enter" && key !== "Tab" && key !== "Caps") {
      el.value = el.value.slice(0, s) + char + el.value.slice(e);
      el.selectionStart = el.selectionEnd = s + char.length;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function OnScreenKeyboard({ open, onClose }: Props) {
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const suppressCount = useRef(0);

  useEffect(() => {
    function adjust(active: boolean) {
      suppressCount.current = Math.max(0, suppressCount.current + (active ? 1 : -1));
      setSuppressed(suppressCount.current > 0);
    }
    function onAiBusy(e: Event) { adjust((e as CustomEvent<{ active: boolean }>).detail?.active ?? false); }
    function onTourActive(e: Event) { adjust((e as CustomEvent<{ active: boolean }>).detail?.active ?? false); }
    window.addEventListener("mdcran:ai-busy", onAiBusy);
    window.addEventListener("mdcran:tour-active", onTourActive);
    return () => {
      window.removeEventListener("mdcran:ai-busy", onAiBusy);
      window.removeEventListener("mdcran:tour-active", onTourActive);
    };
  }, []);

  const press = useCallback(
    (key: string) => {
      if (key === "Shift") { setShift((s) => !s); return; }
      if (key === "Caps") { setCaps((c) => !c); return; }
      fireOnElement(key, shift, caps);
      if (shift && key.length === 1) setShift(false);
    },
    [shift, caps]
  );

  const visible = open && !suppressed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed bottom-[6.5rem] left-1/2 z-[70] -translate-x-1/2 w-[min(calc(100vw-1rem),900px)] rounded-md border border-white/15 bg-[#111]/97 backdrop-blur-2xl shadow-[0_-12px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
          style={{ padding: "clamp(8px,1.5vw,16px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
              <Keyboard size={12} /> On-screen keyboard
            </span>
            <button onClick={onClose} className="text-white/35 hover:text-white cursor-pointer transition-colors p-1">
              <X size={14} />
            </button>
          </div>

          {/* Keys */}
          <div className="space-y-[clamp(3px,0.5vw,6px)]">
            {ROWS.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-[clamp(2px,0.4vw,5px)]">
                {row.map((key, ki) => {
                  const isWide = WIDE_KEYS.has(key);
                  const isShiftActive = key === "Shift" && shift;
                  const isCapsActive = key === "Caps" && caps;
                  const displayLabel =
                    LABELS[key] ??
                    (key.length === 1 && (shift || caps) ? (SHIFT_MAP[key] ?? key.toUpperCase()) : key);

                  return (
                    <button
                      key={`${key}-${ki}`}
                      onMouseDown={(e) => { e.preventDefault(); press(key); }}
                      className={[
                        "rounded-sm border font-mono transition-all cursor-pointer select-none active:scale-[0.93]",
                        "text-[clamp(10px,1.3vw,14px)]",
                        "h-[clamp(32px,4.5vw,46px)]",
                        isShiftActive || isCapsActive
                          ? "border-[var(--cranberry)]/60 bg-[var(--cranberry)]/15 text-[var(--cranberry)] shadow-[0_0_8px_rgba(239,66,66,0.2)]"
                          : "border-white/12 bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white hover:border-white/22",
                        key === "Space"
                          ? "flex-1"
                          : isWide
                          ? "px-[clamp(6px,1.2vw,14px)] min-w-[clamp(40px,5.5vw,64px)]"
                          : "w-[clamp(28px,3.8vw,46px)]",
                      ].join(" ")}
                      style={{ boxShadow: "0 2px 0 rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset" }}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
