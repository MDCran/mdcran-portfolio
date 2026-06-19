"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { loadDisabled, loadCustom, type ShortcutCustomMap } from "@/lib/shortcuts-store";

type ShortcutItem = {
  keys: string[];
  label: string;
};

const DISPLAY_SHORTCUTS: ShortcutItem[] = [
  { keys: ["Ctrl", "Alt", "T"], label: "Terminal" },
  { keys: ["Shift", "Alt"], label: "Themes" },
  { keys: ["G", "H"], label: "Home" },
  { keys: ["G", "E"], label: "Arts & Entertainment" },
  { keys: ["G", "M"], label: "Motion & Graphics" },
  { keys: ["G", "C"], label: "Code" },
  { keys: ["G", "A"], label: "Articles" },
  { keys: ["G", "S"], label: "Spotify" },
  { keys: ["G", "R"], label: "Resume" },
  { keys: ["S"], label: "Search" },
  { keys: ["C"], label: "Contact" },
];

const SEQUENCE_ROUTES: Record<string, string> = {
  h: "/",
  e: "/arts-and-entertainment",
  m: "/motion-and-graphics",
  g: "/motion-and-graphics",
  c: "/code",
  a: "/articles",
  r: "/resume",
};

const SEQUENCE_TIMEOUT_MS = 1400;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

function KeyPill({ value }: { value: string }) {
  return (
    <span
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-sm px-2 text-center text-[10px] uppercase tracking-[0.08em] leading-none"
      style={{
        border: '1px solid color-mix(in srgb, var(--theme-text, #fff) 10%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 4%, transparent)',
        color: 'color-mix(in srgb, var(--theme-text, #fff) 70%, transparent)',
      }}
    >
      {value}
    </span>
  );
}

export default function KeyboardShortcuts() {
  const pathname = usePathname();
  const router = useRouter();
  const [showOnCtrl, setShowOnCtrl] = React.useState(false);
  const pendingSequenceRef = React.useRef<"g" | null>(null);
  const sequenceTimerRef = React.useRef<number | null>(null);
  const disabledRef = React.useRef<Set<string>>(new Set());
  const customRef = React.useRef<ShortcutCustomMap>({});

  // Helper: get the active key for a shortcut (custom override or default)
  const getKey = React.useCallback((id: string, defaultKey: string) =>
    (customRef.current[id] ?? defaultKey).toLowerCase(), []);

  React.useEffect(() => {
    disabledRef.current = loadDisabled();
    customRef.current = loadCustom();
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<{ disabled?: string[]; custom?: ShortcutCustomMap }>).detail ?? {};
      if (detail.disabled) disabledRef.current = new Set(detail.disabled);
      if (detail.custom) customRef.current = detail.custom;
    }
    window.addEventListener("mdcran:shortcuts-updated", onUpdate);
    return () => window.removeEventListener("mdcran:shortcuts-updated", onUpdate);
  }, []);

  React.useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const clearSequence = () => {
      pendingSequenceRef.current = null;
      if (sequenceTimerRef.current) {
        window.clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = null;
      }
    };

    const beginSequence = () => {
      clearSequence();
      pendingSequenceRef.current = "g";
      sequenceTimerRef.current = window.setTimeout(() => {
        clearSequence();
      }, SEQUENCE_TIMEOUT_MS);
    };

    const goTo = (href: string) => {
      clearSequence();
      router.push(href);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setShowOnCtrl(true);
        return;
      }
      if (
        event.ctrlKey &&
        event.altKey &&
        !event.metaKey &&
        event.key.toLowerCase() === getKey("terminal", "t") &&
        !isTypingTarget(event.target)
      ) {
        if (!disabledRef.current.has("terminal")) {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent("mdcran:open-terminal"));
        }
        return;
      }
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (pendingSequenceRef.current === "g") {
        if (key === getKey("go-spotify", "s") && !disabledRef.current.has("go-spotify")) {
          event.preventDefault();
          clearSequence();
          window.dispatchEvent(new CustomEvent("mdcran:open-spotify"));
          return;
        }
        const seqMap: Array<{ id: string; key: string; path: string }> = [
          { id: "go-home",     key: getKey("go-home",     "h"), path: "/"                       },
          { id: "go-ae",       key: getKey("go-ae",       "e"), path: "/arts-and-entertainment" },
          { id: "go-motion",   key: getKey("go-motion",   "m"), path: "/motion-and-graphics"   },
          { id: "go-code",     key: getKey("go-code",     "c"), path: "/code"                  },
          { id: "go-articles", key: getKey("go-articles", "a"), path: "/articles"              },
          { id: "go-resume",   key: getKey("go-resume",   "r"), path: "/resume"                },
        ];
        const match = seqMap.find((s) => s.key === key && !disabledRef.current.has(s.id));
        if (match) {
          event.preventDefault();
          goTo(match.path);
          return;
        }
        clearSequence();
      }

      const goIds = ["go-home","go-ae","go-motion","go-code","go-articles","go-spotify","go-resume"];
      const noGo = goIds.every((id) => disabledRef.current.has(id));
      if (key === "g" && !noGo) {
        event.preventDefault();
        beginSequence();
        return;
      }

      if (key === getKey("search", "s") && !disabledRef.current.has("search")) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("mdcran:open-search"));
        return;
      }

      if (key === getKey("contact", "c") && !disabledRef.current.has("contact")) {
        event.preventDefault();
        goTo("/contact");
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setShowOnCtrl(false);
      }
    };

    const clearHeldShortcutState = () => {
      setShowOnCtrl(false);
      clearSequence();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearHeldShortcutState();
      }
    };

    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        clearHeldShortcutState();
      }
    };

    const onPointerLeaveDocument = () => {
      clearHeldShortcutState();
    };

    const onFocus = () => {
      clearHeldShortcutState();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearHeldShortcutState);
    window.addEventListener("focus", onFocus);
    document.addEventListener("mouseout", onMouseOut);
    document.documentElement.addEventListener("pointerleave", onPointerLeaveDocument);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearSequence();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearHeldShortcutState);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("mouseout", onMouseOut);
      document.documentElement.removeEventListener("pointerleave", onPointerLeaveDocument);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname, router]);

  if (pathname.startsWith("/admin")) return null;

  const shouldShowPanel = showOnCtrl;

  return (
    <>
      <AnimatePresence>
        {shouldShowPanel ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-6 top-6 z-[9999] w-[min(332px,calc(100vw-3rem))] rounded-sm p-4 backdrop-blur-xl relative overflow-hidden"
            style={{
              border: '1px solid color-mix(in srgb, var(--theme-primary, #ef4242) 22%, transparent)',
              backgroundColor: 'color-mix(in srgb, #080808 92%, var(--theme-primary, #ef4242))',
              boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 30px color-mix(in srgb, var(--theme-primary, #ef4242) 8%, transparent)',
            }}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-80"
              style={{
                backgroundImage:
                  "linear-gradient(color-mix(in srgb, var(--theme-primary, #ef4242) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--theme-primary, #ef4242) 5%, transparent) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            {/* Radial glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at top right, color-mix(in srgb, var(--theme-primary, #ef4242) 16%, transparent) 0%, transparent 60%)" }} />
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 h-6 w-6 border-l border-t pointer-events-none" style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 55%, transparent)' }} />
            <div className="absolute top-0 right-0 h-6 w-6 border-r border-t pointer-events-none" style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 55%, transparent)' }} />
            <div className="absolute bottom-0 left-0 h-6 w-6 border-l border-b pointer-events-none" style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 35%, transparent)' }} />
            <div className="absolute bottom-0 right-0 h-6 w-6 border-r border-b pointer-events-none" style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 35%, transparent)' }} />

            <div
              className="relative z-10 mb-3 text-[11px] uppercase tracking-[0.22em]"
              style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 55%, transparent)' }}
            >
              Keyboard Shortcuts
            </div>
            <div className="relative z-10 grid grid-cols-1 gap-2">
              {DISPLAY_SHORTCUTS.map((shortcut) => (
                <div
                  key={`${shortcut.label}-${shortcut.keys.join("-")}`}
                  className="flex items-center justify-between gap-4 rounded-sm px-3 py-2"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 2%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {shortcut.keys.map((keyValue, index) => (
                      <React.Fragment key={`${shortcut.label}-${keyValue}`}>
                        <KeyPill value={keyValue} />
                        {index < shortcut.keys.length - 1 ? (
                          <span
                            className="text-[10px] uppercase tracking-[0.14em]"
                            style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 28%, transparent)' }}
                          >
                            +
                          </span>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                  <span
                    className="whitespace-nowrap text-[10px] uppercase tracking-[0.15em] text-right"
                    style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 35%, transparent)' }}
                  >
                    {shortcut.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </>
  );
}
