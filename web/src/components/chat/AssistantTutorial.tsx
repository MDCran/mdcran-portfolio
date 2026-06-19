"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const PAGE_TREE = [
  "mdcran.com/",
  "├─ resume",
  "├─ contact",
  "├─ work",
  "├─ articles/ …all posts",
  "├─ clients/ …every client",
  "├─ coding-projects/ …",
  "├─ code/ …",
  "├─ arts-and-entertainment/",
  "│  ├─ minecraft-maps/ …",
  "│  └─ events/ …",
  "├─ motion-and-graphics/",
  "│  ├─ thumbnail-design/ …",
  "│  ├─ video-editing/ …",
  "│  └─ web-dev-design/ …",
  "├─ coretv · terminal · status",
  "└─ visitor-map · publications · legal",
];

type Step =
  | { kind: "intro"; text: string }
  | { kind: "spot"; target: string; text: string; click?: boolean }
  | { kind: "tree"; text: string }
  | { kind: "return"; text: string };

const STEPS: Step[] = [
  { kind: "intro", text: "Hey — I'm Michael, your AI assistant, here to walk you through my portfolio. Let me give you the quick tour." },
  { kind: "spot", target: "about", text: "First up, this is where you can get to know me — a quick intro to who I am and what I do." },
  { kind: "spot", target: "featured", text: "These are some of my most renowned projects, the work I'm honestly proudest of." },
  { kind: "spot", target: "clients", text: "And here are the clients and creators I've gotten to work with over the years." },
  { kind: "spot", target: "nav-resume", text: "Want the full story? My resume lives right here — experience, skills, all of it. Let me show you.", click: true },
  { kind: "tree", text: "I can take you to any page on the site, just ask. Here's everything at a glance." },
  { kind: "return", text: "Ask me anything else about my work." },
];

function isVisible(el: HTMLElement | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1;
}

function findTarget(id: string): HTMLElement | null {
  const byId = document.getElementById(id) as HTMLElement | null;
  if (isVisible(byId)) return byId;
  const byAttr = document.querySelector(`[data-highlight-id="${id}"]`) as HTMLElement | null;
  if (isVisible(byAttr)) return byAttr;
  if (id === "nav-resume") {
    const links = Array.from(document.querySelectorAll('a[href="/resume"]')) as HTMLElement[];
    const vis = links.find(isVisible);
    if (vis) return vis;
  }
  return byId || byAttr || (id === "nav-resume" ? (document.querySelector('a[href="/resume"]') as HTMLElement | null) : null);
}

interface Rect { top: number; left: number; width: number; height: number }

export default function AssistantTutorial() {
  const router = useRouter();
  const [showTree, setShowTree] = useState(false);
  const [spot, setSpot] = useState<Rect | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [wordIdx, setWordIdx] = useState(-1);
  const [running, setRunning] = useState(false);

  const runIdRef = useRef(0);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mdcran:tour-active", { detail: { active: running } }));
  }, [running]);
  const targetElRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  /* Keep the spotlight box glued to the target element as the page settles/scrolls. */
  useEffect(() => {
    const tick = () => {
      const el = targetElRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        setSpot({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  /* Narrate one step: show the caption, speak it aloud (from cached tour API), and
     karaoke-highlight words. Falls back to a timed word cadence if audio is unavailable. */
  const narrate = useCallback((text: string, myRun: number) => new Promise<void>((resolve) => {
    const w = text.split(/\s+/);
    setCaption(text);
    setWords(w);
    setWordIdx(0);

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } }
      resolve();
    };

    const timedFallback = () => {
      let i = 0;
      const iv = setInterval(() => {
        if (myRun !== runIdRef.current) { clearInterval(iv); return done(); }
        i++;
        if (i >= w.length) { clearInterval(iv); setWordIdx(w.length - 1); setTimeout(done, 600); }
        else setWordIdx(i);
      }, 260);
    };

    const playUrl = (url: string, revoke: boolean, onFail: () => void) => {
      if (myRun !== runIdRef.current) { if (revoke) URL.revokeObjectURL(url); return done(); }
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      const cleanupUrl = () => { if (revoke) { try { URL.revokeObjectURL(url); } catch { /* */ } } };
      const sync = () => {
        if (myRun !== runIdRef.current || audioRef.current !== audio) return;
        const d = audio.duration && isFinite(audio.duration) ? audio.duration : w.length * 0.34;
        const p = d > 0 ? audio.currentTime / d : 0;
        setWordIdx(Math.min(w.length - 1, Math.floor(p * w.length)));
        if (!audio.ended) requestAnimationFrame(sync);
      };
      audio.onended = () => { setWordIdx(w.length - 1); cleanupUrl(); done(); };
      audio.onerror = () => { cleanupUrl(); onFail(); };
      try { audio.pause(); } catch { /* */ }
      audio.src = url;
      try { audio.currentTime = 0; } catch { /* */ }
      audio.play().then(() => requestAnimationFrame(sync)).catch(() => { cleanupUrl(); onFail(); });
    };

    fetch(`/api/voice/tour?text=${encodeURIComponent(text)}`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (myRun !== runIdRef.current) return done();
        if (!blob) return timedFallback();
        playUrl(URL.createObjectURL(blob), true, timedFallback);
      })
      .catch(() => timedFallback());
  }), []);

  useEffect(() => {
    const run = async () => {
      const myRun = ++runIdRef.current;
      const startY = window.scrollY;
      const startPath = window.location.pathname;
      setRunning(true);
      window.dispatchEvent(new CustomEvent("mdcran:chat-close"));

      for (let si = 0; si < STEPS.length; si++) {
        const step = STEPS[si];
        if (myRun !== runIdRef.current) break;

        if (step.kind === "intro") {
          targetElRef.current = null;
          setSpot(null);
          setShowTree(false);
        } else if (step.kind === "spot") {
          setShowTree(false);
          const isNav = step.target === "nav-resume";
          const mobile = typeof window !== "undefined" && window.innerWidth < 768;
          if (isNav && mobile) {
            window.dispatchEvent(new CustomEvent("mdcran:open-nav"));
            await wait(500);
          }
          let el = findTarget(step.target);
          if (isNav && mobile) {
            for (let tries = 0; tries < 8 && !isVisible(el); tries++) {
              await wait(120);
              if (myRun !== runIdRef.current) break;
              el = findTarget(step.target);
            }
          }
          if (el) {
            const centerInBand = (node: HTMLElement) => {
              const r = node.getBoundingClientRect();
              const vh = window.innerHeight;
              const topInset = 76;
              let targetY: number;
              if (mobile) {
                targetY = window.scrollY + r.top - topInset;
              } else {
                const bottomInset = 180;
                const avail = Math.max(120, vh - topInset - bottomInset);
                targetY = r.height >= avail
                  ? window.scrollY + r.top - topInset
                  : window.scrollY + r.top - topInset - (avail - r.height) / 2;
              }
              window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
            };
            const isPan = step.target === "featured" || step.target === "clients";
            if (!isNav) {
              centerInBand(el);
              await wait(450);
              if (myRun !== runIdRef.current) break;
              if (!isPan) { centerInBand(el); await wait(350); } else { await wait(150); }
            } else {
              await wait(250);
            }
            if (myRun !== runIdRef.current) break;
            targetElRef.current = el;
            if (isPan) {
              const node = el;
              const r0 = node.getBoundingClientRect();
              const panStartY = Math.max(0, window.scrollY + r0.top - 76);
              const panEndY = Math.max(panStartY, window.scrollY + r0.top + r0.height - window.innerHeight + 48);
              const t0 = performance.now();
              const PAN_MS = 5200;
              const panStep = () => {
                if (myRun !== runIdRef.current) return;
                const p = Math.min(1, (performance.now() - t0) / PAN_MS);
                const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                window.scrollTo({ top: panStartY + (panEndY - panStartY) * eased });
                if (p < 1) requestAnimationFrame(panStep);
              };
              if (panEndY - panStartY > 40) { window.scrollTo({ top: panStartY }); setTimeout(() => { if (myRun === runIdRef.current) requestAnimationFrame(panStep); }, 400); }
            }
          } else {
            targetElRef.current = null;
            setSpot(null);
          }

          await narrate(step.text, myRun);

          // Nav-resume with click: move AI cursor to the link, click it, navigate to /resume, return home.
          let didClickNav = false;
          if (step.target === "nav-resume" && step.click && el) {
            didClickNav = true;
            const r = el.getBoundingClientRect();
            window.dispatchEvent(new CustomEvent("mdcran:cursor-move", {
              detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
            }));
            await wait(600);
            if (myRun !== runIdRef.current) break;
            window.dispatchEvent(new CustomEvent("mdcran:cursor-click", { detail: { text: "resume" } }));
            await wait(350);
            if (myRun !== runIdRef.current) break;
            targetElRef.current = null;
            setSpot(null);
            router.push("/resume");
            await wait(2600);
            if (myRun !== runIdRef.current) break;
            await wait(1800); // show resume briefly
            if (myRun !== runIdRef.current) break;
            window.dispatchEvent(new CustomEvent("mdcran:cursor-hide"));
            router.push("/");
            await wait(1200);
            if (myRun !== runIdRef.current) break;
            window.scrollTo({ top: startY, behavior: "smooth" });
          }

          if (isNav && mobile && !didClickNav) window.dispatchEvent(new CustomEvent("mdcran:close-nav"));
          if (myRun !== runIdRef.current) break;
          await wait(350);
          continue;
        } else if (step.kind === "tree") {
          targetElRef.current = null;
          setSpot(null);
          setShowTree(true);
        } else {
          // return step — navigate back to where the tour started if needed.
          targetElRef.current = null;
          setSpot(null);
          setShowTree(false);
          if (window.location.pathname !== startPath) {
            router.push(startPath);
            await wait(1000);
            if (myRun !== runIdRef.current) break;
          }
          window.scrollTo({ top: startY, behavior: "smooth" });
        }

        await narrate(step.text, myRun);
        if (myRun !== runIdRef.current) break;
        await wait(350);
      }

      if (myRun === runIdRef.current) {
        targetElRef.current = null;
        setSpot(null);
        setShowTree(false);
        setCaption(null);
        setWordIdx(-1);
        setRunning(false);
        window.dispatchEvent(new CustomEvent("mdcran:chat-open"));
      }
    };

    const onRun = () => { void run(); };
    window.addEventListener("mdcran:run-tutorial", onRun);
    return () => {
      window.removeEventListener("mdcran:run-tutorial", onRun);
      runIdRef.current++;
      if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } }
    };
  }, [narrate, router]);

  const endTour = () => {
    runIdRef.current++;
    if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } audioRef.current = null; }
    targetElRef.current = null;
    setSpot(null);
    setShowTree(false);
    setCaption(null);
    setWordIdx(-1);
    setRunning(false);
    window.dispatchEvent(new CustomEvent("mdcran:chat-open"));
  };

  const pad = 14;
  const box = spot
    ? {
        top: Math.max(0, spot.top - pad),
        left: Math.max(0, spot.left - pad),
        width: Math.min(window.innerWidth, spot.width + pad * 2),
        height: Math.min(window.innerHeight, spot.height + pad * 2),
      }
    : null;
  const blurStyle: React.CSSProperties = {
    position: "fixed",
    background: "rgba(4,4,6,0.55)",
    backdropFilter: "blur(5px)",
    WebkitBackdropFilter: "blur(5px)",
    transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
  };

  return (
    <>
      {/* End-tour button */}
      <AnimatePresence>
        {running && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={endTour}
            className="fixed top-5 left-5 z-[75] inline-flex items-center gap-1.5 rounded-sm border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-md hover:text-white hover:border-white/40 transition-colors"
            aria-label="End tour"
          >
            End tour
          </motion.button>
        )}
      </AnimatePresence>

      {/* Spotlight — four blurred panels leave the target sharp */}
      <AnimatePresence>
        {box && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] pointer-events-none">
            <div style={{ ...blurStyle, top: 0, left: 0, width: "100%", height: box.top }} />
            <div style={{ ...blurStyle, top: box.top + box.height, left: 0, width: "100%", bottom: 0 }} />
            <div style={{ ...blurStyle, top: box.top, left: 0, width: box.left, height: box.height }} />
            <div style={{ ...blurStyle, top: box.top, left: box.left + box.width, right: 0, height: box.height }} />
            <div
              className="fixed rounded-sm"
              style={{
                top: box.top, left: box.left, width: box.width, height: box.height,
                border: "1.5px solid var(--theme-primary, #ef4242)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 0 28px color-mix(in srgb, var(--theme-primary, #ef4242) 45%, transparent), inset 0 0 22px color-mix(in srgb, var(--theme-primary, #ef4242) 12%, transparent)",
                transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page index tree — cinematic site-map reveal */}
      <AnimatePresence>
        {showTree && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(10,4,4,0.88), rgba(3,3,5,0.97))", backdropFilter: "blur(8px)" }}
          >
            {/* CRT scanlines */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(239,66,66,0.012) 3px, rgba(239,66,66,0.012) 4px)" }} />

            <motion.div
              initial={{ scale: 0.86, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.55 }}
              className="relative rounded-sm border border-[#ef4242]/30 bg-[#060606]/98 px-8 py-7 font-jb text-[13px] leading-relaxed shadow-[0_32px_100px_rgba(0,0,0,0.75),0_0_60px_rgba(239,66,66,0.18)]"
              style={{ minWidth: "min(420px, 88vw)" }}
            >
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 h-7 w-7 border-l-2 border-t-2 border-[#ef4242]/65" />
              <div className="absolute top-0 right-0 h-7 w-7 border-r-2 border-t-2 border-[#ef4242]/65" />
              <div className="absolute bottom-0 left-0 h-7 w-7 border-l-2 border-b-2 border-[#ef4242]/38" />
              <div className="absolute bottom-0 right-0 h-7 w-7 border-r-2 border-b-2 border-[#ef4242]/38" />

              {/* Scanning header */}
              <div className="flex items-center gap-2.5 mb-3">
                <motion.span
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.75, repeat: Infinity }}
                  className="inline-block w-2 h-2 rounded-full bg-[#ef4242] shrink-0"
                />
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#ef4242] font-medium">Scanning Site Map</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#ef4242]/45 to-transparent" />
              </div>

              {/* Progress bar */}
              <motion.div
                className="h-px mb-4 origin-left"
                style={{ background: "linear-gradient(90deg, #ef4242, rgba(239,66,66,0.2))" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.6, ease: "easeOut", delay: 0.15 }}
              />

              {/* Tree lines */}
              <div className="space-y-0.5">
                {PAGE_TREE.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.04, duration: 0.18, ease: "easeOut" }}
                    className={i === 0 ? "text-white" : "text-white/50"}
                    style={i === 0 ? { textShadow: "0 0 18px rgba(255,255,255,0.25)" } : {}}
                  >
                    {line}
                  </motion.div>
                ))}
              </div>

              {/* Pulsing scan line */}
              <motion.div
                className="mt-4 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(239,66,66,0.6), transparent)" }}
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live karaoke caption — bottom middle */}
      <AnimatePresence>
        {caption && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-8 left-1/2 z-[65] -translate-x-1/2 w-[min(92vw,46rem)] pointer-events-none px-4"
          >
            <div
              className="rounded-sm border px-5 py-3.5 text-center text-[15px] sm:text-base leading-relaxed font-jb"
              style={{
                borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent)",
                background: "rgba(6,6,8,0.82)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 16px 50px rgba(0,0,0,0.55)",
              }}
            >
              {words.map((word, i) => {
                const isCurrent = i === wordIdx;
                const spoken = i <= wordIdx;
                return (
                  <span
                    key={i}
                    style={
                      isCurrent
                        ? { color: "#fff", fontWeight: 700, textShadow: "0 0 12px rgba(255,255,255,0.85), 0 0 22px color-mix(in srgb, var(--theme-primary, #ef4242) 60%, transparent)" }
                        : spoken
                          ? { color: "rgba(255,255,255,0.82)" }
                          : { color: "rgba(255,255,255,0.34)" }
                    }
                  >
                    {word}{i < words.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
