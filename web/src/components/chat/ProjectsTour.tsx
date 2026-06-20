"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* A guided, multi-page walkthrough of Michael's work. Triggered by the AI
   (marker __PROJECTTOUR__ → "mdcran:run-projects-tour"). Starts and ends on the
   home page's featured section, sweeping through each gallery in between. */
interface Stop { path: string; text: string; highlight?: string }

const STOPS: Stop[] = [
  { path: "/", text: "Let's start where it all comes together — these are my featured projects, the work I'm proudest of.", highlight: "featured" },
  { path: "/arts-and-entertainment/minecraft-maps", text: "First stop: my Minecraft maps — some of the largest and most detailed builds out there." },
  { path: "/arts-and-entertainment/events", text: "Next, the online events I've designed and run for massive communities." },
  { path: "/motion-and-graphics/thumbnail-design", text: "Here's my thumbnail design — click-worthy art made for creators." },
  { path: "/motion-and-graphics/video-editing", text: "My video editing — pacing, motion, and storytelling that keeps people watching." },
  { path: "/motion-and-graphics/web-dev-design", text: "Web development and design — the sites and interfaces I've built." },
  { path: "/code", text: "My coding projects — the engineering side of what I do." },
  { path: "/articles", text: "And a few articles I've written about my creations and process." },
  { path: "/", text: "And that brings us back to the highlights. Want to dive into any one of these?", highlight: "featured" },
];

export default function ProjectsTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [wordIdx, setWordIdx] = useState(-1);

  const runIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langRef = useRef<string>("en-US");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mdcran_language");
      if (stored) langRef.current = stored;
    } catch { /* */ }
    const onLang = (e: Event) => {
      const code = (e as CustomEvent).detail?.code;
      if (typeof code === "string") langRef.current = code;
    };
    window.addEventListener("mdcran:language-change", onLang);
    return () => window.removeEventListener("mdcran:language-change", onLang);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mdcran:tour-active", { detail: { active: running } }));
  }, [running]);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  /* Speak a line aloud with karaoke captions; timed fallback if TTS is unavailable. */
  const narrate = useCallback((text: string, myRun: number): Promise<void> => {
    const lang = langRef.current;
    const langBase = lang.split("-")[0];

    const speakText = (narrationText: string): Promise<void> => new Promise((resolve) => {
      if (myRun !== runIdRef.current) { resolve(); return; }
      const w = narrationText.split(/\s+/);
      setCaption(narrationText); setWords(w); setWordIdx(0);
      let finished = false;
      const done = () => {
        if (finished) return; finished = true;
        if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } audioRef.current = null; }
        resolve();
      };
      const timed = () => {
        let i = 0;
        const iv = setInterval(() => {
          if (myRun !== runIdRef.current) { clearInterval(iv); return done(); }
          i++;
          if (i >= w.length) { clearInterval(iv); setWordIdx(w.length - 1); setTimeout(done, 600); }
          else setWordIdx(i);
        }, 230);
      };
      fetch(`/api/voice/tour?text=${encodeURIComponent(narrationText)}&lang=${langBase}`)
        .then((r) => (r.ok ? r.blob() : null))
        .then((blob) => {
          if (myRun !== runIdRef.current) return done();
          if (!blob) return timed();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url); audioRef.current = audio;
          const sync = () => {
            if (myRun !== runIdRef.current) return;
            const d = audio.duration && isFinite(audio.duration) ? audio.duration : w.length * 0.34;
            setWordIdx(Math.min(w.length - 1, Math.floor((audio.currentTime / Math.max(d, 0.1)) * w.length)));
            if (!audio.ended) requestAnimationFrame(sync);
          };
          audio.onended = () => { setWordIdx(w.length - 1); URL.revokeObjectURL(url); done(); };
          audio.onerror = () => { URL.revokeObjectURL(url); timed(); };
          audio.play().then(() => requestAnimationFrame(sync)).catch(() => { URL.revokeObjectURL(url); timed(); });
        })
        .catch(() => timed());
    });

    if (langBase === "en") return speakText(text);

    return fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: "en", target: langBase }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { translatedText?: string } | null) =>
        speakText(typeof data?.translatedText === "string" ? data.translatedText : text)
      )
      .catch(() => speakText(text));
  }, []);

  useEffect(() => {
    const run = async () => {
      const myRun = ++runIdRef.current;
      setRunning(true);
      window.dispatchEvent(new CustomEvent("mdcran:chat-close"));

      for (let i = 0; i < STOPS.length; i++) {
        const stop = STOPS[i];
        if (myRun !== runIdRef.current) break;
        // Navigate if we're not already there; prefetch the following stop.
        if (pathRef.current !== stop.path) {
          try { router.prefetch(stop.path); } catch { /* */ }
          router.push(stop.path);
          await wait(1100); // let the page mount + settle
        } else {
          await wait(200);
        }
        if (myRun !== runIdRef.current) break;
        const next = STOPS[i + 1];
        if (next) { try { router.prefetch(next.path); } catch { /* */ } }
        if (stop.highlight) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => window.dispatchEvent(new CustomEvent("mdcran:highlight", { detail: stop.highlight })), 400);
        }
        await narrate(stop.text, myRun);
        if (myRun !== runIdRef.current) break;
        await wait(500);
      }

      if (myRun === runIdRef.current) {
        setCaption(null); setWordIdx(-1); setRunning(false);
        window.dispatchEvent(new CustomEvent("mdcran:chat-open"));
      }
    };
    const onRun = () => { void run(); };
    window.addEventListener("mdcran:run-projects-tour", onRun);
    return () => {
      window.removeEventListener("mdcran:run-projects-tour", onRun);
      runIdRef.current++;
      if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } }
    };
  }, [narrate, router]);

  const stop = () => {
    runIdRef.current++;
    if (audioRef.current) { try { audioRef.current.pause(); } catch { /* */ } audioRef.current = null; }
    setCaption(null); setWordIdx(-1); setRunning(false);
    window.dispatchEvent(new CustomEvent("mdcran:chat-open"));
  };

  return (
    <>
      <AnimatePresence>
        {running && (
          <motion.button
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            onClick={stop}
            className="fixed top-5 right-5 z-[75] inline-flex items-center gap-1.5 rounded-sm border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-md hover:text-white hover:border-white/40 transition-colors"
            aria-label="Stop the walkthrough"
          >
            Stop walkthrough
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {caption && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-8 left-1/2 z-[71] -translate-x-1/2 w-[min(92vw,46rem)] px-4 pointer-events-none"
          >
            <div
              className="rounded-sm border px-5 py-3.5 text-center text-[15px] sm:text-base leading-relaxed font-jb"
              style={{
                borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent)",
                background: "rgba(6,6,8,0.9)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 16px 50px rgba(0,0,0,0.55)",
              }}
            >
              {words.map((word, i) => {
                const isCurrent = i === wordIdx; const spoken = i <= wordIdx;
                return (
                  <span key={i} style={
                    isCurrent
                      ? { color: "#fff", fontWeight: 700, textShadow: "0 0 12px rgba(255,255,255,0.85), 0 0 22px color-mix(in srgb, var(--theme-primary, #ef4242) 60%, transparent)" }
                      : spoken ? { color: "rgba(255,255,255,0.82)" } : { color: "rgba(255,255,255,0.34)" }
                  }>{word}{i < words.length - 1 ? " " : ""}</span>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
