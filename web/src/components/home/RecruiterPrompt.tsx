"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Compass, X } from "lucide-react";
import { getConsent } from "@/components/shared/CookieConsent";

const STORAGE_KEY = "mdcran_recruiter_prompt_seen_v1";
const SHOW_DELAY_MS = 1400;

function markSeen() {
  try { window.localStorage.setItem(STORAGE_KEY, "true"); } catch { /* */ }
}

export default function RecruiterPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "true") return;
    } catch { /* */ }

    // If cookies consent is already decided, show after normal delay.
    // If not, wait for the consent event so we don't stack on top of the cookie banner.
    if (getConsent()) {
      const t = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => window.clearTimeout(t);
    }

    let timer: number | null = null;
    const onConsent = () => {
      timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };
    window.addEventListener("mdcran:consent", onConsent);
    return () => {
      window.removeEventListener("mdcran:consent", onConsent);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    markSeen();
    setVisible(false);
  };

  const handleTour = () => {
    dismiss();
    // mark the chat tour as seen so it doesn't also pop
    try { document.cookie = `mdcran_toured=1; path=/; max-age=${60 * 60 * 24 * 365}`; } catch { /* */ }
    window.dispatchEvent(new CustomEvent("mdcran:run-tutorial"));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.94, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 18, scale: 0.95, filter: "blur(6px)" }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 z-[130] -translate-x-1/2 w-[min(calc(100vw-2rem),26rem)]"
          role="dialog"
          aria-label="Recruiter prompt"
        >
          <div
            data-force-dark=""
            className="relative overflow-hidden rounded-sm border border-[var(--cranberry)]/20 bg-[#080808]/95 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_24px_rgba(185,28,28,0.06)] backdrop-blur-xl"
          >
            {/* corner brackets */}
            <div className="pointer-events-none absolute left-0 top-0 h-5 w-5 border-l border-t border-[var(--cranberry)]/40" />
            <div className="pointer-events-none absolute right-0 top-0 h-5 w-5 border-r border-t border-[var(--cranberry)]/40" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 border-b border-l border-[var(--cranberry)]/25" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b border-r border-[var(--cranberry)]/25" />

            {/* subtle radial glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(185,28,28,0.12) 0%, transparent 70%)",
              }}
            />

            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-3 top-3 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-black/30 text-white/30 transition-colors hover:border-[var(--cranberry)]/30 hover:text-[var(--cranberry)]"
            >
              <X size={12} />
            </button>

            <div className="relative z-10 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[var(--cranberry)]/20 bg-[var(--cranberry)]/8">
                <Briefcase size={14} className="text-[var(--cranberry)]" />
              </div>

              <div className="min-w-0 flex-1 pr-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">
                  Hiring?
                </p>
                <p className="mt-0.5 text-[15px] font-medium leading-snug text-white/90">
                  Are you a recruiter?
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                  Jump straight to my resume or let Michael walk you through the portfolio.
                </p>

                <div className="mt-3 flex gap-2">
                  <Link
                    href="/resume"
                    onClick={dismiss}
                    className="group flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-[var(--cranberry)]/30 bg-[var(--cranberry)]/10 px-3 text-[11px] uppercase tracking-[0.16em] text-[var(--cranberry)] transition-all duration-200 hover:border-[var(--cranberry)]/55 hover:bg-[var(--cranberry)]/18"
                  >
                    <Briefcase size={11} />
                    View Resume
                  </Link>

                  <button
                    type="button"
                    onClick={handleTour}
                    className="group flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-white/10 bg-white/4 px-3 text-[11px] uppercase tracking-[0.16em] text-white/65 transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-white/90"
                  >
                    <Compass size={11} />
                    Take Tour
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
