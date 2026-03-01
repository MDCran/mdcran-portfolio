"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";

type ShortcutItem = {
  keys: string[];
  label: string;
};

const DISPLAY_SHORTCUTS: ShortcutItem[] = [
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

const HINT_STORAGE_KEY = "mdcran_keyboard_shortcuts_seen";
const SEQUENCE_TIMEOUT_MS = 1400;
const REMINDER_DURATION_MS = 12000;

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
    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-sm border border-white/10 bg-white/[0.04] px-2 text-center text-[10px] uppercase tracking-[0.08em] text-white/70 leading-none">
      {value}
    </span>
  );
}

export default function KeyboardShortcuts() {
  const pathname = usePathname();
  const router = useRouter();
  const [showOnCtrl, setShowOnCtrl] = React.useState(false);
  const [showReminder, setShowReminder] = React.useState(false);
  const pendingSequenceRef = React.useRef<"g" | null>(null);
  const sequenceTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const hasSeenHint = window.localStorage.getItem(HINT_STORAGE_KEY) === "1";
    if (hasSeenHint) return;

    const openTimer = window.setTimeout(() => {
      setShowReminder(true);
    }, 900);

    const closeTimer = window.setTimeout(() => {
      setShowReminder(false);
      window.localStorage.setItem(HINT_STORAGE_KEY, "1");
    }, 900 + REMINDER_DURATION_MS);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
  }, [pathname]);

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
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (pendingSequenceRef.current === "g") {
        if (key === "s") {
          event.preventDefault();
          clearSequence();
          window.dispatchEvent(new CustomEvent("mdcran:open-spotify"));
          return;
        }
        const targetRoute = SEQUENCE_ROUTES[key];
        if (targetRoute) {
          event.preventDefault();
          goTo(targetRoute);
          return;
        }
        clearSequence();
      }

      if (key === "g") {
        event.preventDefault();
        beginSequence();
        return;
      }

      if (key === "s") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("mdcran:open-search"));
        return;
      }

      if (key === "c") {
        event.preventDefault();
        goTo("/contact");
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setShowOnCtrl(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      clearSequence();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
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
            className="fixed left-6 top-6 z-[9999] w-[min(332px,calc(100vw-3rem))] rounded-sm border border-white/10 bg-[#0d0d0d]/92 p-4 shadow-[0_8px_36px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-white/55">
              Keyboard Shortcuts
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DISPLAY_SHORTCUTS.map((shortcut) => (
                <div
                  key={`${shortcut.label}-${shortcut.keys.join("-")}`}
                  className="flex items-center justify-between gap-4 rounded-sm border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex items-center gap-1.5">
                    {shortcut.keys.map((keyValue, index) => (
                      <React.Fragment key={`${shortcut.label}-${keyValue}`}>
                        <KeyPill value={keyValue} />
                        {index < shortcut.keys.length - 1 ? (
                          <span className="text-[10px] uppercase tracking-[0.14em] text-white/28">
                            +
                          </span>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.15em] text-white/35 text-right">
                    {shortcut.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!shouldShowPanel && showReminder ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-6 top-6 z-[9999] max-w-[calc(100vw-3rem)] overflow-hidden rounded-sm border border-white/10 bg-[#0d0d0d]/88 px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <Info size={13} className="shrink-0 text-white/45" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                Hold
              </span>
              <KeyPill value="CTRL" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                to view Keyboard Shortcuts
              </span>
            </div>
            <motion.div
              className="absolute bottom-0 left-0 h-px bg-[#ef4242]"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: REMINDER_DURATION_MS / 1000, ease: "linear" }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
