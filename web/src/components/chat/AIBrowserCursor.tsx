"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CursorPos { x: number; y: number }
interface TargetDetail { selector?: string; text?: string; target?: string; label?: string }
interface MoveDetail extends TargetDetail { x?: number; y?: number }
type ClickDetail = TargetDetail;
interface NavDetail { href: string; label?: string }

function normText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Set an input/select/textarea value through the native setter so React's
 *  controlled-component tracking picks up the change. */
function setNativeValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype
    : el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value); else (el as { value: string }).value = value;
}

/** Find a specific form control inside (or as) the resolved element. */
function controlWithin<T extends Element>(el: HTMLElement, selector: string): T | null {
  return (el.matches?.(selector) ? (el as unknown as T) : (el.querySelector(selector) as T | null));
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

/** Unified target resolver: data-highlight-id → element id → CSS selector → visible text. */
function resolveTarget(detail: TargetDetail): HTMLElement | null {
  if (detail.target) {
    const t = detail.target;
    try { const el = document.querySelector(`[data-highlight-id="${t}"]`) as HTMLElement | null; if (el) return el; } catch { /* */ }
    const byId = document.getElementById(t); if (byId) return byId;
    const byText = findByText(t); if (byText) return byText;
  }
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
  const voiceBusyRef = useRef<"idle" | "preparing" | "speaking">("idle");

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }
  function at(ms: number, fn: () => void) { timers.current.push(setTimeout(fn, ms)); }

  function scheduleAutoHide() {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    if (voiceBusyRef.current !== "idle") return;
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
      const el = resolveTarget(detail);
      if (el) {
        const origin = chatOrigin();
        setPos(origin); setVisible(true); setLabel(detail.label ?? null);
        at(400, () => { const center = elementCenter(el); moveTo(center.x, center.y, detail.label); });
      } else if (detail.x !== undefined && detail.y !== undefined) {
        moveTo(detail.x, detail.y, detail.label);
      } else {
        moveTo(window.innerWidth / 2, window.innerHeight / 2, detail.label);
      }
    }

    function onClick(e: Event) {
      const detail = (e as CustomEvent<ClickDetail>).detail ?? {};
      clearTimers(); setClicking(false);
      at(200, () => {
        const el = resolveTarget(detail);
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

    function onType(e: Event) {
      const detail = (e as CustomEvent<{ text?: string; selector?: string; target?: string; typeText?: string; label?: string }>).detail ?? {};
      clearTimers(); setClicking(false);
      const resolved = resolveTarget(detail);
      if (!resolved) return;
      const el = controlWithin<HTMLElement>(resolved, "input, textarea") ?? resolved;
      const origin = chatOrigin();
      setPos(origin); setVisible(true); setLabel(detail.label ?? "Typing…");
      at(350, () => {
        const center = elementCenter(el);
        moveTo(center.x, center.y, detail.label ?? "Typing…");
        at(400, () => {
          setClicking(true);
          at(150, () => {
            try { el.focus(); (el as HTMLElement).click(); } catch { /* */ }
            setClicking(false);
          });
          const chars = (detail.typeText ?? "").split("");
          const field = el as HTMLInputElement | HTMLTextAreaElement;
          chars.forEach((char, i) => {
            at(600 + i * 55, () => {
              try {
                const newVal = (field.value ?? "") + char;
                setNativeValue(field, newVal);
                field.dispatchEvent(new Event("input", { bubbles: true }));
              } catch { /* */ }
            });
          });
          at(600 + chars.length * 55 + 600, () => { setVisible(false); setLabel(null); });
        });
      });
    }

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

    function onSlider(e: Event) {
      const detail = (e as CustomEvent<TargetDetail & { value?: number }>).detail ?? {};
      clearTimers(); setClicking(false);
      const el = resolveTarget(detail);
      if (!el) return;
      const pct = Math.max(0, Math.min(100, Number(detail.value ?? 50)));
      const center = elementCenter(el);
      moveTo(center.x, center.y, detail.label ?? "Adjusting…");
      at(420, () => {
        setClicking(true); at(400, () => setClicking(false));
        const range = controlWithin<HTMLInputElement>(el, 'input[type="range"]');
        if (range) {
          const min = parseFloat(range.min || "0");
          const max = parseFloat(range.max || "100");
          const val = min + (pct / 100) * (max - min);
          setNativeValue(range, String(val));
          range.dispatchEvent(new Event("input", { bubbles: true }));
          range.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          el.dispatchEvent(new CustomEvent("mdcran:before-after", { detail: { value: pct }, bubbles: true }));
        }
        at(900, () => { setVisible(false); setLabel(null); });
      });
    }

    function onCheck(e: Event) {
      const detail = (e as CustomEvent<TargetDetail & { checked?: boolean }>).detail ?? {};
      clearTimers(); setClicking(false);
      const el = resolveTarget(detail);
      if (!el) return;
      const box = controlWithin<HTMLInputElement>(el, 'input[type="checkbox"], input[type="radio"]');
      const center = elementCenter(box ?? el);
      moveTo(center.x, center.y, detail.label ?? "Selecting…");
      at(420, () => {
        setClicking(true);
        at(200, () => {
          try {
            if (box) { const want = detail.checked ?? !box.checked; if (box.checked !== want) box.click(); }
            else el.click();
          } catch { /* */ }
        });
        at(500, () => setClicking(false));
        at(1200, () => { setVisible(false); setLabel(null); });
      });
    }

    function onSelect(e: Event) {
      const detail = (e as CustomEvent<TargetDetail & { value?: string; optionText?: string }>).detail ?? {};
      clearTimers(); setClicking(false);
      const el = resolveTarget(detail);
      if (!el) return;
      const sel = controlWithin<HTMLSelectElement>(el, "select");
      const center = elementCenter(el);
      moveTo(center.x, center.y, detail.label ?? "Choosing…");
      at(420, () => {
        setClicking(true); at(400, () => setClicking(false));
        if (sel) {
          let val = detail.value;
          if (val == null && detail.optionText) {
            const want = normText(detail.optionText);
            const opt = Array.from(sel.options).find((o) => { const t = normText(o.textContent ?? ""); return t === want || t.includes(want); });
            if (opt) val = opt.value;
          }
          if (val != null) { setNativeValue(sel, val); sel.dispatchEvent(new Event("change", { bubbles: true })); }
        } else {
          try { el.click(); } catch { /* */ }
          if (detail.optionText) at(320, () => { try { findByText(detail.optionText!)?.click(); } catch { /* */ } });
        }
        at(1200, () => { setVisible(false); setLabel(null); });
      });
    }

    function onVoiceBusy(e: Event) {
      const state = (e as CustomEvent<{ state: "idle" | "preparing" | "speaking" }>).detail?.state ?? "idle";
      voiceBusyRef.current = state;
      if (state === "idle") {
        scheduleAutoHide();
      } else {
        if (autoHideTimer.current) { clearTimeout(autoHideTimer.current); autoHideTimer.current = null; }
      }
    }

    window.addEventListener("mdcran:cursor-move", onMove);
    window.addEventListener("mdcran:cursor-click", onClick);
    window.addEventListener("mdcran:cursor-hide", onHide);
    window.addEventListener("mdcran:cursor-nav", onNav);
    window.addEventListener("mdcran:cursor-type", onType);
    window.addEventListener("mdcran:cursor-slider", onSlider);
    window.addEventListener("mdcran:cursor-check", onCheck);
    window.addEventListener("mdcran:cursor-select", onSelect);
    window.addEventListener("mdcran:voice-busy", onVoiceBusy);
    return () => {
      window.removeEventListener("mdcran:cursor-move", onMove);
      window.removeEventListener("mdcran:cursor-click", onClick);
      window.removeEventListener("mdcran:cursor-hide", onHide);
      window.removeEventListener("mdcran:cursor-nav", onNav);
      window.removeEventListener("mdcran:cursor-type", onType);
      window.removeEventListener("mdcran:cursor-slider", onSlider);
      window.removeEventListener("mdcran:cursor-check", onCheck);
      window.removeEventListener("mdcran:cursor-select", onSelect);
      window.removeEventListener("mdcran:voice-busy", onVoiceBusy);
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
          exit={{ opacity: 0, scale: 0.5 }}
          transition={SPRING}
        >
          {/* Soft glow behind the cursor tip */}
          <div
            className="absolute"
            style={{
              top: -10, left: -10, width: 50, height: 50,
              background: "radial-gradient(circle at 20px 20px, rgba(239,66,66,0.38) 0%, transparent 70%)",
              filter: "blur(10px)",
            }}
          />

          {/* Cursor arrow SVG — tip is at (0,0) of the motion.div */}
          <motion.svg
            width="22" height="28" viewBox="0 0 22 28" fill="none"
            className="absolute"
            style={{ top: 0, left: 0 }}
            animate={{ scale: clicking ? 0.82 : 1 }}
            transition={clicking ? { duration: 0.1 } : { duration: 0.18 }}
          >
            {/* Drop shadow layer */}
            <path
              d="M2 2 L2 22 L7 17 L11 26 L15 24 L11 15 L19 15 Z"
              fill="rgba(0,0,0,0.45)"
              transform="translate(1.5,1.5)"
            />
            {/* Main arrow body */}
            <path
              d="M2 2 L2 22 L7 17 L11 26 L15 24 L11 15 L19 15 Z"
              fill="#ef4242"
              stroke="rgba(0,0,0,0.65)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Inner highlight — gives depth to the top face */}
            <path
              d="M4 4 L4 14 L7 11 Z"
              fill="rgba(255,255,255,0.22)"
            />
          </motion.svg>

          {/* "AI" badge — always shown while cursor is visible */}
          <div
            className="absolute flex items-center"
            style={{ top: -4, left: 18 }}
          >
            <div
              className="px-1.5 py-[2px] rounded-[3px] font-mono text-[9px] font-bold tracking-[0.15em] uppercase"
              style={{
                background: "rgba(6,6,8,0.90)",
                border: "1px solid rgba(239,66,66,0.55)",
                color: "#ef4242",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                boxShadow: "0 0 8px rgba(239,66,66,0.35)",
              }}
            >
              AI
            </div>
          </div>

          {/* Click ripple */}
          <AnimatePresence>
            {clicking && (
              <motion.div
                key="ripple"
                className="absolute rounded-full border-2"
                style={{ borderColor: "rgba(239,66,66,0.7)" }}
                initial={{ width: 6, height: 6, top: -3, left: -3, opacity: 1 }}
                animate={{ width: 48, height: 48, top: -24, left: -24, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.42, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* Optional action label — shown when a specific action label is set */}
          <AnimatePresence>
            {label && (
              <motion.div
                key="label"
                className="absolute whitespace-nowrap rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ top: 18, left: 18 }}
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  style={{
                    background: "rgba(4,4,6,0.88)",
                    border: "1px solid rgba(239,66,66,0.3)",
                    color: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
                    borderRadius: "2px",
                    padding: "2px 8px",
                  }}
                >
                  {label}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
