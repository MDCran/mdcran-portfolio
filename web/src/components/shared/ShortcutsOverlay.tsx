"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, RotateCcw, X, Pencil } from "lucide-react";
import { ALL_SHORTCUTS, loadDisabled, saveDisabled, loadCustom, saveCustom, resetAll } from "@/lib/shortcuts-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

function KeyPill({ label, active, editing, onClick }: { label: string; active?: boolean; editing?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={onClick ? 0 : -1}
      className={[
        "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-sm px-1.5 text-[10px] uppercase tracking-[0.06em] border transition-all select-none",
        onClick ? "cursor-pointer hover:border-[var(--cranberry)]/60 hover:text-[var(--cranberry)]" : "cursor-default",
        editing
          ? "border-[var(--cranberry)] text-[var(--cranberry)] bg-[var(--cranberry)]/10 animate-pulse"
          : active === false
          ? "border-white/6 bg-transparent text-white/25 line-through"
          : "border-white/12 bg-white/5 text-white/60",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function ShortcutsOverlay({ open, onClose }: Props) {
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null); // shortcut id being remapped
  const captureRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  useEffect(() => {
    if (open) {
      setDisabled(loadDisabled());
      setCustom(loadCustom());
      setEditing(null);
    }
  }, [open]);

  // Capture next keypress when remapping
  useEffect(() => {
    if (!editing) {
      if (captureRef.current) window.removeEventListener("keydown", captureRef.current, true);
      captureRef.current = null;
      return;
    }
    const capture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const k = e.key;
      // Ignore modifier-only presses
      if (["Shift","Control","Alt","Meta","CapsLock","Tab","Escape"].includes(k)) {
        if (k === "Escape") setEditing(null);
        return;
      }
      const newKey = k.length === 1 ? k.toLowerCase() : k.toLowerCase().replace(/^arrow/, "");
      setCustom((prev) => {
        const next = { ...prev, [editing!]: newKey };
        saveCustom(next);
        return next;
      });
      setEditing(null);
    };
    captureRef.current = capture;
    window.addEventListener("keydown", capture, true);
    return () => { if (captureRef.current) window.removeEventListener("keydown", captureRef.current, true); };
  }, [editing]);

  function toggleDisabled(id: string) {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveDisabled(next);
      return next;
    });
  }

  function clearCustomKey(id: string) {
    setCustom((prev) => {
      const next = { ...prev };
      delete next[id];
      saveCustom(next);
      return next;
    });
  }

  function handleReset() {
    resetAll();
    setDisabled(new Set());
    setCustom({});
    setEditing(null);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="kb-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
            onClick={() => { setEditing(null); onClose(); }}
          />
          <motion.div
            key="kb-panel"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2 w-[min(calc(100vw-2rem),480px)] max-h-[85vh] overflow-y-auto rounded-sm border border-white/12 bg-[#0b0b0b]/97 backdrop-blur-xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-nord text-sm text-white flex items-center gap-2">
                <Keyboard size={15} className="text-[var(--cranberry)]" /> Keyboard Shortcuts
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  title="Reset all shortcuts to default"
                  className="text-white/40 hover:text-white cursor-pointer transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => { setEditing(null); onClose(); }} className="text-white/40 hover:text-white cursor-pointer transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {editing && (
              <div className="mb-3 rounded-sm border border-[var(--cranberry)]/40 bg-[var(--cranberry)]/8 px-3 py-2 text-[11px] text-[var(--cranberry)]">
                Press any key to remap — Esc to cancel
              </div>
            )}

            <p className="text-[10px] text-white/30 mb-3 leading-snug">
              Click a key pill to remap it. Toggle on/off to enable or disable. Saves via cookie.
            </p>

            <div className="space-y-1">
              {ALL_SHORTCUTS.map((s) => {
                const on = !disabled.has(s.id);
                const isEditing = editing === s.id;
                const customKey = custom[s.id];

                // Build displayed keys: for remappable shortcuts, swap in custom key
                const displayKeys = s.keys.map((k, i) => {
                  if (s.remappable && i === s.keys.length - 1) {
                    return customKey ? customKey.toUpperCase() : k;
                  }
                  return k;
                });

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-sm px-3 py-2 border transition-all ${
                      on ? "border-white/8 bg-white/[0.02]" : "border-white/4 opacity-45"
                    }`}
                  >
                    {/* Keys */}
                    <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                      {s.keys.length > 1 && displayKeys.slice(0, -1).map((k, i) => (
                        <span key={i} className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-sm px-1.5 text-[10px] uppercase tracking-[0.06em] border border-white/12 bg-white/5 text-white/40">
                          {k}
                        </span>
                      ))}
                      {s.keys.length > 1 && (
                        <span className="text-white/20 text-[10px]">+</span>
                      )}
                      <KeyPill
                        label={isEditing ? "…" : displayKeys[displayKeys.length - 1]}
                        active={on}
                        editing={isEditing}
                        onClick={s.remappable ? () => setEditing(isEditing ? null : s.id) : undefined}
                      />
                      {s.remappable && (
                        isEditing ? null : (
                          <button
                            type="button"
                            onClick={() => setEditing(s.id)}
                            className="text-white/20 hover:text-[var(--cranberry)] cursor-pointer transition-colors"
                            title="Remap this shortcut"
                          >
                            <Pencil size={10} />
                          </button>
                        )
                      )}
                      {customKey && !isEditing && (
                        <button
                          type="button"
                          onClick={() => clearCustomKey(s.id)}
                          className="text-white/20 hover:text-white/60 cursor-pointer transition-colors"
                          title="Reset to default key"
                        >
                          <RotateCcw size={10} />
                        </button>
                      )}
                    </div>

                    {/* Label */}
                    <span className="text-[11px] text-white/50 shrink-0 max-w-[120px] truncate">{s.label}</span>

                    {/* On/Off button */}
                    <button
                      onClick={() => toggleDisabled(s.id)}
                      className={`shrink-0 px-2.5 py-1 rounded-sm text-[11px] border transition-colors cursor-pointer ${
                        on
                          ? "border-[var(--cranberry)]/40 text-[var(--cranberry)] bg-[var(--cranberry)]/10 hover:bg-[var(--cranberry)]/15"
                          : "border-white/10 text-white/35 hover:text-white/60"
                      }`}
                    >
                      {on ? "On" : "Off"}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
