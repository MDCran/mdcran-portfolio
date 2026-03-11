"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Palette } from "lucide-react";
import { useTheme, THEMES, type ThemeName } from "@/lib/ThemeContext";

export default function ThemeOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme, themeInfo } = useTheme();

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  /* Listen for programmatic toggle from theme button */
  useEffect(() => {
    const onToggleEvent = () => toggle();
    window.addEventListener("mdcran:toggle-theme", onToggleEvent);
    return () => window.removeEventListener("mdcran:toggle-theme", onToggleEvent);
  }, [toggle]);

  useEffect(() => {
    let shiftDown = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
      }

      if (e.key === "Shift") shiftDown = true;

      if (e.key === "Alt" && shiftDown) {
        e.preventDefault();
        toggle();
      }

      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDown = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [toggle, isOpen]);

  const handleSelect = (id: ThemeName) => {
    setTheme(id);
    setIsOpen(false);
  };

  const p = themeInfo.primary;
  const bg = themeInfo.background;
  const txt = themeInfo.text;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 34, scale: 0.92, filter: "blur(10px)" }}
            animate={{
              opacity: [0.18, 1, 0.82, 1],
              y: [24, -4, 2, 0],
              scale: [0.96, 1.02, 0.995, 1],
              filter: ["blur(8px)", "blur(0px)", "blur(1px)", "blur(0px)"],
            }}
            exit={{
              opacity: [1, 0.76, 0.92, 0],
              y: [0, 2, -3, 26],
              scale: [1, 1.01, 0.98, 0.92],
              filter: ["blur(0px)", "blur(1px)", "blur(0px)", "blur(7px)"],
            }}
            transition={{ duration: 0.48, times: [0, 0.42, 0.7, 1], ease: "easeOut" }}
            className="w-full max-w-lg relative"
          >
            <div
              className="relative overflow-hidden rounded-sm backdrop-blur-xl"
              style={{
                background: `color-mix(in srgb, ${bg} 95%, transparent)`,
                border: `1px solid color-mix(in srgb, ${p} 25%, transparent)`,
                boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 30px color-mix(in srgb, ${p} 8%, transparent)`,
              }}
            >
              {/* Grid overlay */}
              <div
                className="absolute inset-0 opacity-80 pointer-events-none"
                style={{
                  backgroundImage:
                    `linear-gradient(color-mix(in srgb, ${p} 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, ${p} 5%, transparent) 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />
              {/* Radial glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    `radial-gradient(circle at top right, color-mix(in srgb, ${p} 18%, transparent) 0%, color-mix(in srgb, ${p} 4%, transparent) 28%, transparent 62%)`,
                }}
              />

              {/* Corner brackets */}
              <div className="absolute top-0 left-0 h-8 w-8 border-l border-t pointer-events-none" style={{ borderColor: `color-mix(in srgb, ${p} 55%, transparent)` }} />
              <div className="absolute top-0 right-0 h-8 w-8 border-r border-t pointer-events-none" style={{ borderColor: `color-mix(in srgb, ${p} 55%, transparent)` }} />
              <div className="absolute bottom-0 left-0 h-8 w-8 border-l border-b pointer-events-none" style={{ borderColor: `color-mix(in srgb, ${p} 35%, transparent)` }} />
              <div className="absolute bottom-0 right-0 h-8 w-8 border-r border-b pointer-events-none" style={{ borderColor: `color-mix(in srgb, ${p} 35%, transparent)` }} />

              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-sm transition-colors cursor-pointer"
                style={{
                  border: `1px solid color-mix(in srgb, ${txt} 10%, transparent)`,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  color: `color-mix(in srgb, ${txt} 35%, transparent)`,
                }}
                aria-label="Close theme selector"
              >
                <X size={14} />
              </button>

              {/* Header */}
              <div
                className="relative z-10 px-5 pt-5 pb-3"
                style={{ borderBottom: `1px solid color-mix(in srgb, ${p} 12%, transparent)` }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="inline-flex items-center gap-2 rounded-sm px-3 py-1.5"
                    style={{
                      border: `1px solid color-mix(in srgb, ${p} 18%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${p} 6%, transparent)`,
                    }}
                  >
                    <Palette size={11} style={{ color: `color-mix(in srgb, ${p} 85%, transparent)` }} />
                    <span
                      className="text-[10px] uppercase tracking-[0.22em]"
                      style={{ color: `color-mix(in srgb, ${p} 80%, transparent)` }}
                    >
                      Appearance
                    </span>
                  </div>
                </div>
                <h2 className="font-nord pr-10 text-lg leading-tight tracking-wide" style={{ color: txt }}>
                  Select a Theme
                </h2>
              </div>

              {/* Theme Grid */}
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 p-5">
                {THEMES.map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelect(t.id)}
                      className="relative flex flex-col items-start gap-2 rounded-sm border transition-colors text-left overflow-hidden cursor-pointer"
                      style={{
                        background: t.background,
                        borderColor: isActive
                          ? `color-mix(in srgb, ${p} 40%, transparent)`
                          : `color-mix(in srgb, ${t.text} 12%, transparent)`,
                      }}
                    >
                      <div className="relative z-10 w-full p-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ background: t.primary, boxShadow: `0 0 8px ${t.primary}44` }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ background: t.background, borderColor: `${t.text}25` }}
                          />
                        </div>
                        <div className="text-sm font-medium" style={{ color: t.text }}>
                          {t.name}
                        </div>
                      </div>

                      {isActive && (
                        <div className="absolute top-2 right-2 z-10">
                          <Check size={14} style={{ color: t.primary }} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="relative z-10 px-5 py-3"
                style={{ borderTop: `1px solid color-mix(in srgb, ${p} 12%, transparent)` }}
              >
                <div
                  className="text-center text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: `color-mix(in srgb, ${txt} 24%, transparent)` }}
                >
                  Press Shift+Alt to toggle this overlay
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
