"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CursorPos { x: number; y: number }
interface MoveDetail { selector?: string; text?: string; x?: number; y?: number; label?: string }
interface ClickDetail { selector?: string; text?: string; label?: string }
interface NavDetail { href: string; label?: string }

function normText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function findByText(search: string): HTMLElement | null {
  const lower = normText(search);
  if (!lower) return null;

  const interactives = Array.from(
    document.querySelectorAll("a, button, [role='button'], label, [role='tab'], [role='menuitem']")
  ) as HTMLElement[];
  for (const el of interactives) {
    const text = normText(el.textContent ?? "");
    if (text === lower) return el;
  }
  for (const el of interactives) {
    const text = normText(el.textContent ?? "");
    if (text && (text.includes(lower) || lower.includes(text))) return el;
  }

  const navLinks = Array.from(document.querySelectorAll("nav a, header a")) as HTMLElement[];
  for (const el of navLinks) {
    const label = normText(el.getAttribute("aria-label") ?? el.getAttribute("title") ?? el.textContent ?? "");
    if (label && (label.includes(lower) || lower.includes(label))) return el;
  }

  const byHighlightId = document.querySelector(`[data-highlight-id="${search}"]`) as HTMLElement | null;
  if (byHighlightId) return byHighlightId;
  const byId = document.getElementById(search);
  if (byId) return byId;

  const listItems = Array.from(document.querySelectorAll("li, [role='listitem']")) as HTMLElement[];
  for (const el of listItems) {
    const text = normText(el.textContent ?? "");
    if (text && text.includes(lower)) return el;
  }

  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")) as HTMLElement[];
  for (const el of headings) {
    const text = normText(el.textContent ?? "");
    if (text && (text.includes(lower) || lower.includes(text))) return el;
  }

  const contentRoots = document.querySelectorAll("main, article");
  const searchIn = contentRoots.length > 0 ? contentRoots : [document.body];
  for (const root of searchIn) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeText = normText(node.textContent ?? "");
      if (!nodeText.includes(lower)) continue;
      let parent = node.parentElement;
      while (parent && parent !== document.body) {
        const tag = parent.tagName.toLowerCase();
        const isBlock = ["div","section","li","td","p","h1","h2","h3","h4","h5","h6","ul","ol","figure","article","a","button"].includes(tag);
        if (isBlock && (parent.textContent?.length ?? 0) < 600) return parent;
        parent = parent.parentElement;
      }
    }
  }
  return null;
}

function resolveElement(detail: { selector?: string; text?: string }): HTMLElement | null {
  if (detail.selector) {
    try { const el = document.querySelector(detail.selector) as HTMLElement | null; if (el) return el; } catch { /* */ }
  }
  if (detail.text) return findByText(detail.text);
  return null;
}

function elementCenter(el: HTMLElement): CursorPos {
  const r = el.getBoundingClientRect();
  return { x: r.left + Math.min(r.width / 2, 120), y: r.top + Math.min(r.height / 2, 32) };
}

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
const AUTO_HIDE_MS = 6000;

export default function AIBrowserCursor() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<CursorPos>({ x: 0, y: 0 });
  const [clicking, setClicking] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }
  function at(ms: number, fn: () => void) { timers.current.push(setTimeout(fn, ms)); }

  function scheduleAutoHide() {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    autoHideTimer.current = setTimeout(() => { setVisible(false); setLabel(null); }, AUTO_HIDE_MS);
  }

  function moveTo(x: number, y: number, lbl?: string | null) {
    setPos({ x, y }); setVisible(true);
    if (lbl !== undefined) setLabel(lbl ?? null);
    scheduleAutoHide();
  }

  function chatOrigin(): CursorPos {
    return { x: window.innerWidth - 52, y: window.innerHeight - 52 };
  }

  useEffect(() => {
    function onMove(e: Event) {
      const detail = (e as CustomEvent<MoveDetail>).detail ?? {};
      clearTimers(); setClicking(false);
      const el = resolveElement(detail);
      if (el) {
        const origin = chatOrigin();
        setPos(origin); setVisible(true); setLabel(detail.label ?? null);
        at(400, () => { const center = elementCenter(el); moveTo(center.x, center.y, detail.label); });
      } else if (detail.x !== undefined && detail.y !== undefined) {
        moveTo(detail.x * window.innerWidth, detail.y * window.innerHeight, detail.label);
      } else {
        moveTo(window.innerWidth / 2, window.innerHeight / 2, detail.label);
      }
    }

    function onClick(e: Event) {
      const detail = (e as CustomEvent<ClickDetail>).detail ?? {};
      clearTimers(); setClicking(false);
      at(200, () => {
        const el = resolveElement(detail);
        if (!el) return;
        const center = elementCenter(el);
        moveTo(center.x, center.y, detail.label);
        setVisible(true);
        at(360, () => {
          setClicking(true);
          at(200, () => { try { el.click(); } catch { /* */ } });
          at(500, () => setClicking(false));
          at(1200, () => { setVisible(false); setLabel(null); });
        });
      });
    }

    function onHide() { clearTimers(); setVisible(false); setClicking(false); setLabel(null); }

    function onNav(e: Event) {
      const detail = (e as CustomEvent<NavDetail>).detail ?? {};
      clearTimers(); setClicking(false);
      const origin = chatOrigin();
      setPos(origin); setVisible(true); setLabel(detail.label ?? "Navigating…");
      at(350, () => {
        if (!detail.href) { setVisible(false); setLabel(null); return; }
        let navEl: HTMLElement | null = null;
        const links = Array.from(document.querySelectorAll("nav a, header a")) as HTMLAnchorElement[];
        for (const link of links) {
          try {
            const url = new URL(link.href, window.location.origin);
            if (url.pathname === detail.href || link.getAttribute("href") === detail.href) { navEl = link; break; }
          } catch { /* */ }
        }
        const center = navEl ? elementCenter(navEl) : { x: window.innerWidth / 2, y: 40 };
        moveTo(center.x, center.y, detail.label ?? `Navigating to ${detail.href}`);
        at(600, () => { setClicking(true); at(500, () => setClicking(false)); at(1000, () => { setVisible(false); setLabel(null); }); });
      });
    }

    window.addEventListener("mdcran:cursor-move", onMove);
    window.addEventListener("mdcran:cursor-click", onClick);
    window.addEventListener("mdcran:cursor-hide", onHide);
    window.addEventListener("mdcran:cursor-nav", onNav);
    return () => {
      window.removeEventListener("mdcran:cursor-move", onMove);
      window.removeEventListener("mdcran:cursor-click", onClick);
      window.removeEventListener("mdcran:cursor-hide", onHide);
      window.removeEventListener("mdcran:cursor-nav", onNav);
      clearTimers();
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ai-cursor"
          className="fixed left-0 top-0 z-[150] pointer-events-none select-none"
          initial={false}
          animate={{ x: pos.x, y: pos.y }}
          exit={{ opacity: 0, scale: 0.3 }}
          transition={SPRING}
        >
          <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 36, height: 36, background: "radial-gradient(circle, rgba(239,66,66,0.45) 0%, transparent 70%)", filter: "blur(6px)" }} />
          <motion.div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ width: 18, height: 18, borderColor: "rgba(239,66,66,0.55)" }}
            animate={{ scale: clicking ? 0.5 : [1, 1.35, 1], opacity: clicking ? 0 : [0.55, 0.2, 0.55] }}
            transition={clicking ? { duration: 0.15 } : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            animate={{ scale: clicking ? 0.65 : 1 }}
            transition={clicking ? { duration: 0.12 } : { duration: 0.2 }}
            style={{ width: 8, height: 8, background: "radial-gradient(circle at 35% 30%, #fff 0%, #ef4242 60%)", boxShadow: "0 0 0 1.5px rgba(239,66,66,0.6), 0 0 10px rgba(239,66,66,0.85)" }}
          />
          <AnimatePresence>
            {clicking && (
              <motion.div
                key="ripple"
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ borderColor: "rgba(239,66,66,0.75)" }}
                initial={{ width: 8, height: 8, opacity: 1 }}
                animate={{ width: 56, height: 56, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {label && (
              <motion.div
                key="label"
                className="absolute left-4 top-4 whitespace-nowrap rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                style={{ background: "rgba(4,4,6,0.88)", border: "1px solid rgba(239,66,66,0.3)", color: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
              >
                {label}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
