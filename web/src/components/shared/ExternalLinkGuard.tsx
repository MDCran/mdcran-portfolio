"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ShieldAlert, X } from "lucide-react";

const COUNTDOWN_SECONDS = 5;
const R = 26;
const CIRC = 2 * Math.PI * R;

/* Hosts we own / trust — never guarded. */
function isInternalHost(host: string): boolean {
  if (!host) return true;
  if (host === window.location.hostname) return true;
  const own = window.location.hostname.replace(/^www\./, "");
  const h = host.replace(/^www\./, "");
  return h === own || h.endsWith("." + own);
}

export default function ExternalLinkGuard() {
  const [target, setTarget] = useState<{ href: string; host: string } | null>(null);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Intercept clicks on external links (capture phase, before navigation). */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Honour modifier-clicks / non-primary buttons — let the browser do its thing.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.dataset.noGuard !== undefined || anchor.hasAttribute("download")) return;

      const raw = anchor.getAttribute("href") || "";
      if (!raw || raw.startsWith("#")) return;
      // Only guard real web links to other origins.
      if (!/^https?:\/\//i.test(raw) && !/^\/\//.test(raw)) return;

      let url: URL;
      try { url = new URL(anchor.href, window.location.href); } catch { return; }
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (isInternalHost(url.hostname)) return;

      // It's an external link — take over.
      e.preventDefault();
      e.stopPropagation();
      setTarget({ href: url.href, host: url.hostname.replace(/^www\./, "") });
      setRemaining(COUNTDOWN_SECONDS);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  /* Run the countdown while the modal is open. */
  useEffect(() => {
    if (!target) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [target]);

  const proceed = (href: string) => {
    try { window.mdcranTrack?.("external_link_open", { href }); } catch { /* */ }
    window.open(href, "_blank", "noopener,noreferrer");
    setTarget(null);
  };

  /* When the countdown hits zero, open automatically (best-effort; user gesture
     opened the modal, so this is usually allowed). */
  useEffect(() => {
    if (target && remaining === 0) {
      const t = setTimeout(() => proceed(target.href), 150);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, target]);

  const cancel = () => setTarget(null);

  /* Esc cancels. */
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target]);

  const progress = target ? (COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS : 0;
  const dashOffset = CIRC * (1 - progress);

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={cancel}
          style={{ background: "rgba(4,4,6,0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Leaving this site"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm rounded-sm border bg-[#0a0a0c]/95 p-6 text-center"
            style={{
              borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 28%, transparent)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
          >
            <button
              type="button"
              onClick={cancel}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-sm text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={15} />
            </button>

            {/* Countdown ring with shield */}
            <div className="relative mx-auto mb-4 flex h-[68px] w-[68px] items-center justify-center">
              <svg width="68" height="68" viewBox="0 0 68 68" className="absolute inset-0 -rotate-90">
                <circle cx="34" cy="34" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle
                  cx="34" cy="34" r={R} fill="none"
                  stroke="var(--theme-primary, #ef4242)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={CIRC} strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <ShieldAlert size={26} style={{ color: "var(--theme-primary, #ef4242)" }} />
              <span className="absolute -bottom-1 right-0 flex h-5 min-w-[20px] items-center justify-center rounded-sm bg-[var(--theme-primary,#ef4242)] px-1 text-[11px] font-bold tabular-nums" style={{ color: "var(--on-accent, #fff)" }}>
                {remaining}
              </span>
            </div>

            <h2 className="font-nord text-base text-white">Leaving this site</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-white/55">
              You&apos;re about to open an external website in a new tab:
            </p>
            <div className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-sm border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/80">
              <ExternalLink size={13} className="shrink-0 text-white/40" />
              <span className="truncate">{target.host}</span>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={cancel}
                className="flex-1 rounded-sm border border-white/15 px-4 py-2 text-[12px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => proceed(target.href)}
                className="flex-1 rounded-sm px-4 py-2 text-[12px] font-semibold transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: "var(--theme-primary, #ef4242)", color: "var(--on-accent, #fff)" }}
              >
                Continue now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
