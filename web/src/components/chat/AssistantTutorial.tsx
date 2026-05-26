"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  | { kind: "spot"; target: string; text: string }
  | { kind: "tree"; text: string }
  | { kind: "return"; text: string };

const STEPS: Step[] = [
  { kind: "intro", text: "Hey — I'm Michael, your AI assistant, here to walk you through my portfolio. Let me give you the quick tour." },
  { kind: "spot", target: "about", text: "First up, this is where you can get to know me — a quick intro to who I am and what I do." },
  { kind: "spot", target: "featured", text: "These are some of my most renowned projects, the work I'm honestly proudest of." },
  { kind: "spot", target: "clients", text: "And here are the clients and creators I've gotten to work with over the years." },
  { kind: "spot", target: "nav-resume", text: "Want the full story? My resume lives right up here — experience, skills, all of it." },
  { kind: "tree", text: "I can take you to any page on the site, just ask. Here's everything at a glance." },
  { kind: "return", text: "And that's the quick tour! Ask me anything, and I'll show you around." },
];

function findTarget(id: string): HTMLElement | null {
  return (
    document.getElementById(id) ||
    (document.querySelector(`[data-highlight-id="${id}"]`) as HTMLElement | null) ||
    (id === "nav-resume" ? (document.querySelector('a[href="/resume"]') as HTMLElement | null) : null)
  );
}

interface Rect { top: number; left: number; width: number; height: number }

export default function AssistantTutorial() {
  const [showTree, setShowTree] = useState(false);
  const [spot, setSpot] = useState<Rect | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [wordIdx, setWordIdx] = useState(-1);

  const runIdRef = useRef(0);
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

  const voiceAllowed = () => {
    try { return localStorage.getItem("mdcran_voice_on") !== "0"; } catch { return true; }
  };

  /* Narrate one step: show the caption, speak it (if voice on), and karaoke-highlight words. */
  const narrate = useCallback((text: string, myRun: number) => new Promise<void>((resolve) => {
    const w = text.split(/\s+/);
    setCaption(text);
    setWords(w);
    setWordIdx(0);

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } audioRef.current = null; }
      resolve();
    };

    // Timed fallback if no audio: advance words on a steady cadence.
    const timedFallback = () => {
      let i = 0;
      const iv = setInterval(() => {
        if (myRun !== runIdRef.current) { clearInterval(iv); return done(); }
        i++;
        if (i >= w.length) { clearInterval(iv); setWordIdx(w.length - 1); setTimeout(done, 600); }
        else setWordIdx(i);
      }, 260);
    };

    if (!voiceAllowed()) { timedFallback(); return; }

    fetch("/api/voice/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (myRun !== runIdRef.current) return done();
        if (!blob) return timedFallback();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        const sync = () => {
          if (myRun !== runIdRef.current) return;
          const d = audio.duration && isFinite(audio.duration) ? audio.duration : w.length * 0.34;
          const p = d > 0 ? audio.currentTime / d : 0;
          setWordIdx(Math.min(w.length - 1, Math.floor(p * w.length)));
          if (!audio.ended) requestAnimationFrame(sync);
        };
        audio.onended = () => { setWordIdx(w.length - 1); URL.revokeObjectURL(url); done(); };
        audio.onerror = () => { URL.revokeObjectURL(url); timedFallback(); };
        audio.play().then(() => requestAnimationFrame(sync)).catch(() => { URL.revokeObjectURL(url); timedFallback(); });
      })
      .catch(() => timedFallback());
  }), []);

  useEffect(() => {
    const run = async () => {
      const myRun = ++runIdRef.current;
      const startY = window.scrollY;
      // Minimize the chat so the spotlight + captions take the stage.
      window.dispatchEvent(new CustomEvent("mdcran:chat-close"));

      for (const step of STEPS) {
        if (myRun !== runIdRef.current) break;

        if (step.kind === "intro") {
          targetElRef.current = null;
          setSpot(null);
          setShowTree(false);
        } else if (step.kind === "spot") {
          setShowTree(false);
          const el = findTarget(step.target);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            await wait(750);
            if (myRun !== runIdRef.current) break;
            targetElRef.current = el;
          } else {
            targetElRef.current = null;
            setSpot(null);
          }
        } else if (step.kind === "tree") {
          targetElRef.current = null;
          setSpot(null);
          setShowTree(true);
        } else {
          targetElRef.current = null;
          setSpot(null);
          setShowTree(false);
          window.scrollTo({ top: startY, behavior: "smooth" });
        }

        await narrate(step.text, myRun);
        if (myRun !== runIdRef.current) break;
        await wait(350);
      }

      // Done — only clear if this is still the active run.
      if (myRun === runIdRef.current) {
        targetElRef.current = null;
        setSpot(null);
        setShowTree(false);
        setCaption(null);
        setWordIdx(-1);
        // Reopen the chat now that the tour has wrapped up.
        window.dispatchEvent(new CustomEvent("mdcran:chat-open"));
      }
    };

    const onRun = () => { void run(); };
    window.addEventListener("mdcran:run-tutorial", onRun);
    return () => {
      window.removeEventListener("mdcran:run-tutorial", onRun);
      runIdRef.current++; // cancel any in-flight run
      if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } }
    };
  }, [narrate]);

  // Padded spotlight rect, clamped to the viewport.
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
      {/* Spotlight — four blurred panels leave the target sharp (z below the chat) */}
      <AnimatePresence>
        {box && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] pointer-events-none">
            <div style={{ ...blurStyle, top: 0, left: 0, width: "100%", height: box.top }} />
            <div style={{ ...blurStyle, top: box.top + box.height, left: 0, width: "100%", bottom: 0 }} />
            <div style={{ ...blurStyle, top: box.top, left: 0, width: box.left, height: box.height }} />
            <div style={{ ...blurStyle, top: box.top, left: box.left + box.width, right: 0, height: box.height }} />
            {/* Glowing focus frame */}
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

      {/* Page index tree */}
      <AnimatePresence>
        {showTree && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
            style={{ background: "radial-gradient(circle at center, rgba(8,4,4,0.72), rgba(4,4,4,0.88))", backdropFilter: "blur(6px)" }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              className="relative rounded-sm border border-[#ef4242]/25 bg-[#080808]/95 px-7 py-6 font-jb text-[13px] leading-relaxed shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(239,66,66,0.12)]"
            >
              <div className="absolute top-0 left-0 h-6 w-6 border-l border-t border-[#ef4242]/55" />
              <div className="absolute top-0 right-0 h-6 w-6 border-r border-t border-[#ef4242]/55" />
              <div className="absolute bottom-0 left-0 h-6 w-6 border-l border-b border-[#ef4242]/35" />
              <div className="absolute bottom-0 right-0 h-6 w-6 border-r border-b border-[#ef4242]/35" />
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#ef4242]/80 mb-3">Indexing every page…</div>
              <div className="space-y-0.5">
                {PAGE_TREE.map((line, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.25 }} className={i === 0 ? "text-white/90" : "text-white/55"}>
                    {line}
                  </motion.div>
                ))}
              </div>
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
