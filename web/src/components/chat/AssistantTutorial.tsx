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

function isVisible(el: HTMLElement | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1;
}

function findTarget(id: string): HTMLElement | null {
  // Prefer a VISIBLE match. The desktop nav resume link carries
  // data-highlight-id="nav-resume" but is hidden on mobile (rect collapses to the
  // top-left corner) — returning it would spotlight the wrong spot. So we skip
  // hidden matches and look for the on-screen element (e.g. the mobile menu link).
  const byId = document.getElementById(id) as HTMLElement | null;
  if (isVisible(byId)) return byId;
  const byAttr = document.querySelector(`[data-highlight-id="${id}"]`) as HTMLElement | null;
  if (isVisible(byAttr)) return byAttr;
  if (id === "nav-resume") {
    const links = Array.from(document.querySelectorAll('a[href="/resume"]')) as HTMLElement[];
    const vis = links.find(isVisible);
    if (vis) return vis;
  }
  // Fall back to any match even if not yet laid out (the caller retries until visible).
  return byId || byAttr || (id === "nav-resume" ? (document.querySelector('a[href="/resume"]') as HTMLElement | null) : null);
}

interface Rect { top: number; left: number; width: number; height: number }

export default function AssistantTutorial() {
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

  /* Narrate one step: show the caption, speak it aloud, and karaoke-highlight words.
     `audioSrc` is an optional PRERECORDED clip — the tour script is fixed, so we serve
     a static MP3 (zero ElevenLabs tokens). If it's missing/fails we fall back to live TTS,
     and if that fails too, to a timed word cadence. Live TTS is reserved for real Q&A. */
  const narrate = useCallback((text: string, myRun: number, audioSrc?: string) => new Promise<void>((resolve) => {
    const w = text.split(/\s+/);
    setCaption(text);
    setWords(w);
    setWordIdx(0);

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      // Pause but KEEP the element — reusing one unlocked <audio> lets later steps
      // play on mobile (a fresh Audio() created after an await is blocked by autoplay).
      if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } }
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

    // Play an audio URL with karaoke sync; onFail handles a missing/broken source.
    // Reuse ONE <audio> element so it stays "unlocked" after the first gesture-driven
    // play — otherwise mobile blocks every step after the intro and it goes silent.
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

    // Live ElevenLabs synthesis (used only when no prerecorded clip is available).
    const fetchTts = () => {
      fetch("/api/voice/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
        .then((r) => (r.ok ? r.blob() : null))
        .then((blob) => {
          if (myRun !== runIdRef.current) return done();
          if (!blob) return timedFallback();
          playUrl(URL.createObjectURL(blob), true, timedFallback);
        })
        .catch(() => timedFallback());
    };

    // Prefer the prerecorded clip; fall back to live TTS, then to a timed cadence.
    if (audioSrc) playUrl(audioSrc, false, fetchTts);
    else fetchTts();
  }), []);

  useEffect(() => {
    const run = async () => {
      const myRun = ++runIdRef.current;
      const startY = window.scrollY;
      setRunning(true);
      // Minimize the chat so the spotlight + captions take the stage.
      window.dispatchEvent(new CustomEvent("mdcran:chat-close"));

      for (let si = 0; si < STEPS.length; si++) {
        const step = STEPS[si];
        const stepAudio = `/tour-audio/step-${si}.mp3`;
        if (myRun !== runIdRef.current) break;

        if (step.kind === "intro") {
          targetElRef.current = null;
          setSpot(null);
          setShowTree(false);
        } else if (step.kind === "spot") {
          setShowTree(false);
          const isNav = step.target === "nav-resume";
          const mobile = typeof window !== "undefined" && window.innerWidth < 768;
          // On mobile, the Resume link lives inside the collapsed menu — open it first.
          if (isNav && mobile) {
            window.dispatchEvent(new CustomEvent("mdcran:open-nav"));
            await wait(500);
          }
          let el = findTarget(step.target);
          // Mobile menu animates in — wait until the resume link is actually visible
          // (otherwise we'd box a 0×0 hidden element and no highlight appears).
          if (isNav && mobile) {
            for (let tries = 0; tries < 8 && !isVisible(el); tries++) {
              await wait(120);
              if (myRun !== runIdRef.current) break;
              el = findTarget(step.target);
            }
          }
          if (el) {
            // Center the section in the band BETWEEN the top nav and the bottom caption
            // so it's fully visible and never hidden behind the caption. (Plain
            // scrollIntoView centers in the whole viewport, which on mobile tucks the
            // lower half under the caption.) Re-run after a beat to correct for any
            // layout shift as images/content settle.
            const centerInBand = (node: HTMLElement) => {
              const r = node.getBoundingClientRect();
              const vh = window.innerHeight;
              const topInset = 76; // nav clearance
              let targetY: number;
              if (mobile) {
                // On phones, bring the section's TOP (its title) just under the nav so
                // the section reads top-down and isn't hidden behind the caption.
                targetY = window.scrollY + r.top - topInset;
              } else {
                const bottomInset = 180; // caption + breathing room
                const avail = Math.max(120, vh - topInset - bottomInset);
                targetY = r.height >= avail
                  ? window.scrollY + r.top - topInset
                  : window.scrollY + r.top - topInset - (avail - r.height) / 2;
              }
              window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
            };
            // Featured projects + clients get a gentle pan through their items.
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
              // Smooth-scroll from the top of the section to the bottom while narrating,
              // so all the projects / clients glide past inside the spotlight.
              const node = el;
              const r0 = node.getBoundingClientRect();
              const startY = Math.max(0, window.scrollY + r0.top - 76);
              const endY = Math.max(startY, window.scrollY + r0.top + r0.height - window.innerHeight + 48);
              const t0 = performance.now();
              const PAN_MS = 5200;
              const panStep = () => {
                if (myRun !== runIdRef.current) return;
                const p = Math.min(1, (performance.now() - t0) / PAN_MS);
                const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                window.scrollTo({ top: startY + (endY - startY) * eased });
                if (p < 1) requestAnimationFrame(panStep);
              };
              if (endY - startY > 40) { window.scrollTo({ top: startY }); setTimeout(() => { if (myRun === runIdRef.current) requestAnimationFrame(panStep); }, 400); }
            }
          } else {
            targetElRef.current = null;
            setSpot(null);
          }
          await narrate(step.text, myRun, stepAudio);
          if (isNav && mobile) window.dispatchEvent(new CustomEvent("mdcran:close-nav"));
          if (myRun !== runIdRef.current) break;
          await wait(350);
          continue;
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

        await narrate(step.text, myRun, stepAudio);
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
        setRunning(false);
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

  const endTour = () => {
    runIdRef.current++; // cancel the in-flight run loop
    if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } audioRef.current = null; }
    targetElRef.current = null;
    setSpot(null);
    setShowTree(false);
    setCaption(null);
    setWordIdx(-1);
    setRunning(false);
    window.dispatchEvent(new CustomEvent("mdcran:chat-open"));
  };

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
