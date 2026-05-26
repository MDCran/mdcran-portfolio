"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { assetUrl } from "@/lib/utils";

/* Premium first-load intro for the home page — an "unboxing"-style reveal:
   the logo settles in with a soft glow inside a sweeping ring, a tagline
   types its spacing open, a thin progress bar fills, then the whole panel
   peels away (scale + blur + fade) to reveal the page.

   Shows ONCE per browser session (sessionStorage) so navigating back to the
   home page from elsewhere is instant — no loader, no flash. */
const SESSION_KEY = "mdcran_home_intro_shown";
const FALLBACK_LOGO = assetUrl("/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png") || "/logo.svg";

export default function HomeLoader() {
  // Always render on the first paint (SSR + first client render) so there's no
  // flash of the page underneath; useEffect decides whether to keep it.
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [logo, setLogo] = useState(FALLBACK_LOGO);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* */ }
    if (seen) { setShow(false); return; } // returning within the session — skip instantly
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* */ }

    // Swap in the real favicon/brand mark if configured (non-blocking).
    fetch("/api/data/site-content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const u = d?.faviconUrl || d?.brandLogoUrl; if (u) setLogo(assetUrl(u) || FALLBACK_LOGO); })
      .catch(() => {});

    // Hold for the reveal, then peel away. Cut short once the window fully loads.
    let outTimer: ReturnType<typeof setTimeout>;
    const beginLeave = () => { setLeaving(true); outTimer = setTimeout(() => setShow(false), 750); };
    const holdTimer = setTimeout(beginLeave, 2200);
    const onLoad = () => { /* keep a minimum so it doesn't blink */ };
    window.addEventListener("load", onLoad);
    return () => { clearTimeout(holdTimer); clearTimeout(outTimer); window.removeEventListener("load", onLoad); };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="home-loader"
          aria-hidden
          initial={{ opacity: 1 }}
          animate={leaving
            ? { opacity: 0, scale: 1.12, y: -10, filter: "blur(18px)" }
            : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: leaving ? 0.85 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          style={{ background: "radial-gradient(circle at 50% 45%, #0e0e12 0%, #060608 55%, #000 100%)" }}
        >
          {/* Bloom that expands outward as we step into the site */}
          <AnimatePresence>
            {leaving && (
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{ width: 200, height: 200, background: "radial-gradient(circle, color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent) 0%, transparent 70%)" }}
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 9, opacity: 0 }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </AnimatePresence>
          {/* Faint grid + glow for depth */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.5]"
            style={{
              backgroundImage:
                "linear-gradient(color-mix(in srgb, var(--theme-primary, #ef4242) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--theme-primary, #ef4242) 5%, transparent) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(circle at center, #000 30%, transparent 72%)",
              WebkitMaskImage: "radial-gradient(circle at center, #000 30%, transparent 72%)",
            }}
          />

          <div className="relative flex flex-col items-center">
            {/* Ring + logo */}
            <div className="relative flex items-center justify-center" style={{ width: 132, height: 132 }}>
              {/* Soft breathing glow */}
              <motion.div
                className="absolute rounded-full"
                style={{ width: 132, height: 132, background: "radial-gradient(circle, color-mix(in srgb, var(--theme-primary, #ef4242) 45%, transparent) 0%, transparent 70%)" }}
                animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.92, 1.05, 0.92] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Sweeping progress ring */}
              <svg width="132" height="132" viewBox="0 0 132 132" className="absolute -rotate-90">
                <circle cx="66" cy="66" r="60" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />
                <motion.circle
                  cx="66" cy="66" r="60" fill="none" stroke="var(--theme-primary, #ef4242)" strokeWidth="2" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 60}
                  initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 2.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--theme-primary, #ef4242) 70%, transparent))" }}
                />
              </svg>
              {/* Logo mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="" width={64} height={64} className="rounded-sm" style={{ filter: "drop-shadow(0 0 18px rgba(0,0,0,0.6))" }} />
              </motion.div>
            </div>

            {/* Tagline — spacing opens up as it settles */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.05em", y: 8 }}
              animate={{ opacity: 1, letterSpacing: "0.42em", y: 0 }}
              transition={{ delay: 0.5, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 text-[10px] sm:text-[11px] uppercase text-white/55 font-jb pl-[0.42em]"
            >
              Shaping the experience
            </motion.p>

            {/* Thin progress bar */}
            <div className="mt-4 h-[2px] w-40 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--theme-primary, #ef4242)", boxShadow: "0 0 8px var(--theme-primary, #ef4242)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.1, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
