"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { findTarget } from "@/lib/find-target";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function GhostCursor() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [clicking, setClicking] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

    const onDirective = (e: Event) => {
      const target = (e as CustomEvent).detail as string;
      if (!target) return;
      clear();
      // Start from the chat bubble (bottom-right).
      const start = { x: window.innerWidth - 44, y: window.innerHeight - 44 };
      setPos(start);
      setClicking(false);
      setVisible(true);

      // Let any scroll-into-view settle, then fly to the element and "click" it.
      at(620, () => {
        const el = findTarget(target);
        if (!el) { setVisible(false); return; }
        const r = el.getBoundingClientRect();
        setPos({ x: r.left + Math.min(r.width / 2, 80), y: r.top + Math.min(r.height / 2, 28) });
      });
      at(1650, () => setClicking(true));   // click ripple after arrival
      at(2050, () => setClicking(false));
      at(2700, () => setVisible(false));
    };

    window.addEventListener("mdcran:highlight", onDirective);
    window.addEventListener("mdcran:zoom", onDirective);
    window.addEventListener("mdcran:emphasize", onDirective);
    return () => {
      window.removeEventListener("mdcran:highlight", onDirective);
      window.removeEventListener("mdcran:zoom", onDirective);
      window.removeEventListener("mdcran:emphasize", onDirective);
      clear();
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ghost"
          className="fixed left-0 top-0 z-[140] pointer-events-none"
          initial={false}
          animate={{ x: pos.x, y: pos.y }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ duration: 1.0, ease: EASE }}
        >
          {/* trailing glow */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full blur-md" style={{ background: "radial-gradient(circle, rgba(239,66,66,0.55), transparent 70%)" }} />
          {/* core wisp */}
          <motion.div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            animate={{ scale: clicking ? 0.6 : [1, 1.18, 1] }}
            transition={clicking ? { duration: 0.15 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ height: 16, width: 16, background: "radial-gradient(circle at 35% 30%, #fff, #ef4242 70%)", boxShadow: "0 0 14px rgba(239,66,66,0.9)" }}
          />
          {/* click ripple */}
          <AnimatePresence>
            {clicking && (
              <motion.div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ borderColor: "rgba(239,66,66,0.7)" }}
                initial={{ height: 10, width: 10, opacity: 0.9 }}
                animate={{ height: 64, width: 64, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
