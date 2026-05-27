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
const FALLBACK_LOGO = assetUrl("/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_RED.png") || "/logo.svg";

// Boot-sequence log printed in the corner terminal. [tag, message]
const BOOT_LOG: [string, string][] = [
  ["net", "Resolving mdcran.com…"],
  ["net", "Connecting to content delivery network"],
  ["sec", "TLS handshake · secure session established"],
  ["cdn", "Edge node: warming cache"],
  ["img", "Preloading media & images…"],
  ["db", "Connecting to database cluster"],
  ["db", "Authenticated · pool ready"],
  ["api", "Fetching portfolio metrics"],
  ["api", "Loading projects · clients · articles"],
  ["data", "Hydrating “By the Numbers”"],
  ["geo", "Warming visitor analytics"],
  ["ai", "Booting assistant · voice engine"],
  ["ui", "Compiling your experience"],
  ["ok", "Ready."],
];

// Deterministic particle field (no Math.random → no SSR hydration mismatch).
const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37.6) % 100,
  top: (i * 53.3) % 100,
  size: 1.5 + (i % 4),
  delay: (i % 13) * 0.18,
  dur: 3 + (i % 5) * 0.7,
  drift: (i % 2 === 0 ? -1 : 1) * (10 + (i % 5) * 6),
}));

export default function HomeLoader() {
  // Always render on the first paint (SSR + first client render) so there's no
  // flash of the page underneath; useEffect decides whether to keep it.
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [logo, setLogo] = useState(FALLBACK_LOGO);
  const [status, setStatus] = useState("Connecting to the database");
  const [shownLines, setShownLines] = useState(0); // boot-log lines printed so far

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* */ }
    if (seen) { setShow(false); return; } // returning within the session — skip instantly
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* */ }

    let cancelled = false;
    let outTimer: ReturnType<typeof setTimeout>;
    let dataReady = false;
    let minHeld = false;
    let left = false;
    const beginLeave = () => { if (left || cancelled) return; left = true; setLeaving(true); outTimer = setTimeout(() => { if (!cancelled) setShow(false); }, 750); };
    const maybeLeave = () => { if (dataReady && minHeld) beginLeave(); };

    // Brand mark.
    fetch("/api/data/site-content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const u = d?.faviconUrl || d?.brandLogoUrl; if (!cancelled && u) setLogo(assetUrl(u) || FALLBACK_LOGO); })
      .catch(() => {});

    // Warm the data the "By the Numbers" / Stats section needs so it's ready on reveal.
    Promise.allSettled([
      fetch("/api/metrics").catch(() => {}),
      fetch("/api/data/site-content").catch(() => {}),
    ]).then(() => { if (cancelled) return; dataReady = true; setStatus("Loading your experience"); maybeLeave(); });

    // Eagerly preload the home page's images (incl. below-the-fold lazy ones) while the
    // loader is up — it renders behind, so the <img> tags are in the DOM to warm.
    const preloadImages = () => {
      try {
        const seenUrls = new Set<string>();
        document.querySelectorAll("img").forEach((img) => {
          const s = (img as HTMLImageElement).currentSrc || img.getAttribute("src");
          if (s && !s.startsWith("data:") && !seenUrls.has(s)) { seenUrls.add(s); const pre = new Image(); pre.src = s; }
        });
      } catch { /* */ }
    };
    const pl1 = setTimeout(preloadImages, 400);
    const pl2 = setTimeout(preloadImages, 1500);

    // Print the boot-log lines one by one in the corner terminal.
    const logTimer = setInterval(() => {
      setShownLines((n) => { if (n >= BOOT_LOG.length) { clearInterval(logTimer); return n; } return n + 1; });
    }, 230);

    // Hold the loader a minimum so it doesn't blink, and a hard cap so a slow/failed
    // fetch never traps the user.
    const minTimer = setTimeout(() => { minHeld = true; maybeLeave(); }, 2600);
    const capTimer = setTimeout(beginLeave, 4600);

    return () => { cancelled = true; clearTimeout(outTimer); clearTimeout(minTimer); clearTimeout(capTimer); clearTimeout(pl1); clearTimeout(pl2); clearInterval(logTimer); };
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

          {/* Floating particle field */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, background: i % 3 === 0 ? "var(--theme-primary, #ef4242)" : "rgba(255,255,255,0.7)", boxShadow: i % 3 === 0 ? "0 0 8px var(--theme-primary, #ef4242)" : "0 0 6px rgba(255,255,255,0.5)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0], y: [0, p.drift, 0], x: [0, p.drift * 0.4, 0] }}
                transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
              />
            ))}
          </div>

          {/* Content zooms in from afar (depth) */}
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ scale: 0.78, opacity: 0, filter: "blur(14px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
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

            {/* Live status — what it's doing (connecting, loading) with animated dots */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-7 flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-white/55 font-jb"
            >
              <span>{status}</span>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="inline-block" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}>.</motion.span>
              ))}
            </motion.p>

            {/* Thin progress bar */}
            <div className="mt-4 h-[2px] w-40 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--theme-primary, #ef4242)", boxShadow: "0 0 8px var(--theme-primary, #ef4242)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </motion.div>

          {/* Tactile boot terminal — bottom right */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute bottom-4 right-4 w-[min(86vw,340px)] rounded-sm border border-white/10 bg-black/60 backdrop-blur-md font-jb text-[10px] leading-relaxed overflow-hidden"
            style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 24px color-mix(in srgb, var(--theme-primary, #ef4242) 8%, transparent)" }}
          >
            <div className="flex items-center gap-1.5 border-b border-white/8 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ef4242]/70" />
              <span className="h-2 w-2 rounded-full bg-[#facc15]/70" />
              <span className="h-2 w-2 rounded-full bg-[#22c55e]/70" />
              <span className="ml-2 text-[9px] uppercase tracking-[0.2em] text-white/35">mdcran · boot</span>
            </div>
            <div className="px-3 py-2 space-y-0.5 h-[148px] overflow-hidden flex flex-col justify-end">
              {BOOT_LOG.slice(0, shownLines).map(([tag, msg], i) => {
                const isLast = i === shownLines - 1;
                const done = i < shownLines - 1 || tag === "ok";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span className="text-white/25">›</span>
                    <span className="uppercase tracking-wider" style={{ color: tag === "ok" ? "#22c55e" : "color-mix(in srgb, var(--theme-primary,#ef4242) 80%, white)" }}>[{tag}]</span>
                    <span className="text-white/65 truncate">{msg}</span>
                    <span className={done ? "text-emerald-400" : "text-white/30"}>{done ? "✓" : (isLast ? "" : "")}</span>
                    {isLast && !done && <span className="text-white/40">…</span>}
                    {isLast && <motion.span className="inline-block w-1.5 h-3 bg-[var(--theme-primary,#ef4242)]" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
