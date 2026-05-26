"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { X, Mic, Loader2, HelpCircle } from "lucide-react";
import { useTheme, THEMES, type ThemeName } from "@/lib/ThemeContext";
import { readVisitorMemory, getDaypart } from "@/lib/visitor-memory";

const TOGGLE_EVENT = "mdcran:toggle-voice";
const AGENT_NAME = "Michael";
const VOICE_TUTORIAL_KEY = "mdcran_voice_tutorial_done";

/* Example prompts the tutorial nudges first-time users to try. */
const TUTORIAL_PROMPTS = [
  "Tell me about yourself",
  "Who have you worked with?",
  "How many views do your projects have?",
  "Why should I hire you?",
];

type Phase = "connecting" | "listening" | "thinking" | "speaking" | "error";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

/* Minimal SpeechRecognition typing (not in standard DOM lib). */
interface SRAlternative { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlternative }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SpeechRec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Strip markdown + action markers so only natural speech is sent to TTS. */
function stripForSpeech(text: string): string {
  return text
    .replace(/__[A-Z]+:[^_]*__/g, " ")
    .replace(/__[A-Z]+__/g, " ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default function VoiceMode() {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [interim, setInterim] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [amplitude, setAmplitude] = useState(0); // 0..1 drives the reactive orb
  const [interrupted, setInterrupted] = useState(false); // brief "go ahead" indicator on barge-in
  const [showTips, setShowTips] = useState(false); // tutorial prompt suggestions
  const [captionWords, setCaptionWords] = useState<string[]>([]); // bottom-middle karaoke of the spoken reply
  const [captionIdx, setCaptionIdx] = useState(-1);
  const captionRafRef = useRef<number | null>(null);

  // Audio / recognition refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);        // mic analyser
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);     // assistant-voice analyser
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const ttsSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bargeFramesRef = useRef(0);       // consecutive frames of user speech during TTS
  const interruptTtsRef = useRef<(() => void) | null>(null); // stops current TTS playback

  const phaseRef = useRef<Phase>("connecting");
  const setPhaseSafe = useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;
  const pendingFinalRef = useRef("");
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(false);
  openRef.current = open;

  /* Toggle from the chat panel / bubble */
  useEffect(() => {
    const onToggle = () => setOpen((o) => !o);
    window.addEventListener(TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(TOGGLE_EVENT, onToggle);
  }, []);

  /* ── Drive the reactive orb amplitude; handle barge-in ── */
  const startMeter = useCallback(() => {
    const mic = analyserRef.current;
    if (!mic) return;
    const time = new Uint8Array(mic.fftSize);

    const tick = () => {
      // Amplitude drives the orb — read the assistant's voice while it speaks, else the mic.
      const speaking = phaseRef.current === "speaking";
      const ampAnalyser = speaking && ttsAnalyserRef.current ? ttsAnalyserRef.current : mic;
      const aData = new Uint8Array(ampAnalyser.frequencyBinCount);
      ampAnalyser.getByteFrequencyData(aData);
      let sum = 0;
      for (let i = 0; i < aData.length; i++) sum += aData[i];
      const avg = sum / aData.length / 255;
      setAmplitude((prev) => prev * 0.6 + avg * 0.4);

      // Mic RMS for barge-in detection.
      mic.getByteTimeDomainData(time);
      let rms = 0;
      for (let i = 0; i < time.length; i++) { const v = (time[i] - 128) / 128; rms += v * v; }
      rms = Math.sqrt(rms / time.length);

      // Barge-in: sustained mic energy while the assistant is speaking → user interrupted.
      if (speaking) {
        if (rms > 0.08) bargeFramesRef.current++;
        else bargeFramesRef.current = Math.max(0, bargeFramesRef.current - 1);
        if (bargeFramesRef.current > 8) {
          bargeFramesRef.current = 0;
          interruptTtsRef.current?.();
        }
      } else {
        bargeFramesRef.current = 0;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /* ── Speak a reply via ElevenLabs; circle reacts to the audio ── */
  const speak = useCallback(async (text: string): Promise<void> => {
    const clean = stripForSpeech(text);
    if (!clean) return;
    const capWords = clean.split(/\s+/);
    setCaptionWords(capWords);
    setCaptionIdx(0);
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audioElRef.current = audio;

      // Route TTS through its own analyser so the circle reacts to the agent's voice
      // (kept separate from the mic analyser so barge-in detection stays clean).
      const ctx = audioCtxRef.current;
      if (ctx && ttsAnalyserRef.current) {
        try {
          const src = ctx.createMediaElementSource(audio);
          ttsSourceRef.current = src;
          src.connect(ttsAnalyserRef.current);
          ttsAnalyserRef.current.connect(ctx.destination);
        } catch {
          /* fallback: just play */
        }
      }

      await new Promise<void>((resolve) => {
        let done = false;
        const stopKaraoke = () => { if (captionRafRef.current) cancelAnimationFrame(captionRafRef.current); captionRafRef.current = null; };
        const finish = () => { if (done) return; done = true; stopKaraoke(); interruptTtsRef.current = null; URL.revokeObjectURL(url); resolve(); };
        // Karaoke-highlight the caption words synced to the audio position.
        const karaoke = () => {
          const a = audioElRef.current;
          if (!a) return;
          const d = a.duration && isFinite(a.duration) ? a.duration : capWords.length * 0.34;
          setCaptionIdx(Math.min(capWords.length - 1, Math.floor((a.currentTime / Math.max(d, 0.1)) * capWords.length)));
          if (!a.ended) captionRafRef.current = requestAnimationFrame(karaoke);
        };
        // Allow barge-in to cut playback short.
        interruptTtsRef.current = () => {
        try { audio.pause(); } catch { /* */ }
        setInterrupted(true);
        setTimeout(() => setInterrupted(false), 1400);
        // Flip to listening immediately so the recognizer's results start flowing.
        setPhaseSafe("listening");
        finish();
      };
        audio.onended = () => { setCaptionIdx(capWords.length - 1); finish(); };
        audio.onerror = finish;
        audio.play().then(() => { captionRafRef.current = requestAnimationFrame(karaoke); }).catch(() => finish());
      });
    } catch {
      /* ignore */
    }
  }, [setPhaseSafe]);

  /* ── Parse action markers from a full reply and drive the UI ── */
  const runDirectives = useCallback((full: string): string => {
    let cleaned = full;
    const theme = cleaned.match(/__THEME:([\w-]+)__/);
    if (theme) {
      const id = theme[1] as ThemeName;
      if (THEMES.some((t) => t.id === id)) setTheme(id);
      cleaned = cleaned.replace(/\s*__THEME:[\w-]+__\s*/g, " ");
    }
    const nav = cleaned.match(/__NAV:(\/.+?)__/);
    if (nav) {
      const path = nav[1];
      cleaned = cleaned.replace(/\s*__NAV:\/.+?__\s*/g, " ");
      setTimeout(() => router.push(path.split("#")[0] || "/"), 500);
    }
    const zoom = cleaned.match(/__ZOOM:(.+?)__/);
    if (zoom) {
      cleaned = cleaned.replace(/\s*__ZOOM:.+?__\s*/g, " ");
      setTimeout(() => window.dispatchEvent(new CustomEvent("mdcran:zoom", { detail: zoom[1] })), 400);
    }
    const emph = cleaned.match(/__EMPHASIZE:(.+?)__/);
    if (emph) {
      cleaned = cleaned.replace(/\s*__EMPHASIZE:.+?__\s*/g, " ");
      setTimeout(() => window.dispatchEvent(new CustomEvent("mdcran:emphasize", { detail: emph[1] })), 400);
    }
    if (/__RESETZOOM__/.test(cleaned)) {
      cleaned = cleaned.replace(/\s*__RESETZOOM__\s*/g, " ");
      window.dispatchEvent(new CustomEvent("mdcran:resetzoom"));
    }
    const hl = cleaned.match(/__HIGHLIGHT:(.+?)__/);
    if (hl) {
      cleaned = cleaned.replace(/\s*__HIGHLIGHT:.+?__\s*/g, " ");
      setTimeout(() => window.dispatchEvent(new CustomEvent("mdcran:highlight", { detail: hl[1] })), 500);
    }
    return cleaned.replace(/\s+/g, " ").trim();
  }, [router, setTheme]);

  /* ── Send the transcript to Claude, then speak the reply ── */
  const sendToAgent = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    // Keep the recognizer running (results are ignored unless we're listening) so the
    // user can barge in over the assistant and be heard from the first word.
    setInterim("");
    setShowTips(false);
    setCaptionWords([]);
    setCaptionIdx(-1);
    setPhaseSafe("thinking");
    setTurns((prev) => [...prev, { role: "user", text: clean }]);

    const history = [...turnsRef.current, { role: "user" as const, text: clean }]
      .slice(-12)
      .map((t) => ({ role: t.role, content: t.text }));

    let accumulated = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, currentPage: pathname, agentName: AGENT_NAME, memory: (() => { try { const m = readVisitorMemory(); return { visits: m.visits, returning: m.returning, daysSinceLast: m.daysSinceLast, daypart: getDaypart(), topics: m.topics }; } catch { return undefined; } })(), tone: (() => { try { return localStorage.getItem("mdcran_ai_tone") || undefined; } catch { return undefined; } })() }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // Show a placeholder assistant turn we update as text streams in.
      setTurns((prev) => [...prev, { role: "assistant", text: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              accumulated += parsed.text;
              const shown = accumulated.replace(/__[A-Z]+:.+?__/g, "").replace(/__[A-Z]+__/g, "").trim();
              setTurns((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", text: shown };
                return next;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      accumulated = "Sorry, I had trouble responding just now.";
      setTurns((prev) => [...prev, { role: "assistant", text: accumulated }]);
    }

    // Behavior guard → end politely
    if (accumulated.trim().startsWith("__BEHAVIOR__")) {
      const msg = "Let's keep this about Michael's work. What would you like to know?";
      setTurns((prev) => { const n = [...prev]; n[n.length - 1] = { role: "assistant", text: msg }; return n; });
      setPhaseSafe("speaking");
      await speak(msg);
    } else {
      const cleaned = runDirectives(accumulated);
      setTurns((prev) => { const n = [...prev]; n[n.length - 1] = { role: "assistant", text: cleaned }; return n; });
      setPhaseSafe("speaking");
      await speak(cleaned);
    }

    // Tear down the TTS audio graph node so the next utterance can rebuild it.
    if (ttsSourceRef.current) { try { ttsSourceRef.current.disconnect(); } catch { /* */ } ttsSourceRef.current = null; }
    audioElRef.current = null;

    if (openRef.current) {
      setPhaseSafe("listening");
      try { recRef.current?.start(); } catch { /* already running */ }
    }
  }, [pathname, runDirectives, speak, setPhaseSafe]);

  /* ── Open: set up mic, analyser, recognition ── */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const SR = getSpeechRecognition();
    if (!SR) { setSupported(false); setPhaseSafe("error"); return; }

    setPhaseSafe("connecting");
    setTurns([]);
    setInterim("");

    (async () => {
      try {
        // Echo cancellation keeps the assistant's own voice out of the mic so barge-in is reliable.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        micStreamRef.current = stream;

        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
        analyserRef.current = analyser;
        const ttsAnalyser = ctx.createAnalyser();
        ttsAnalyser.fftSize = 256;
        ttsAnalyser.smoothingTimeConstant = 0.8;
        ttsAnalyserRef.current = ttsAnalyser;
        const micSource = ctx.createMediaStreamSource(stream);
        micSourceRef.current = micSource;
        micSource.connect(analyser); // not connected to destination → no mic feedback
        startMeter();

        // Speech recognition
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (e: SREvent) => {
          // Ignore everything unless we're actively listening (this discards any TTS
          // bleed during thinking/speaking; barge-in flips us to "listening" first).
          if (phaseRef.current !== "listening") return;
          let interimText = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            const txt = r[0]?.transcript ?? "";
            if (r.isFinal) {
              pendingFinalRef.current = (pendingFinalRef.current + " " + txt).trim();
            } else {
              interimText += txt;
            }
          }
          setInterim(interimText);
          // Debounce: send after a natural pause once we have final text.
          if (pendingFinalRef.current) {
            if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
            sendTimerRef.current = setTimeout(() => {
              const toSend = pendingFinalRef.current.trim();
              pendingFinalRef.current = "";
              if (toSend) void sendToAgent(toSend);
            }, 1100);
          }
        };
        rec.onerror = () => { /* transient (no-speech, aborted) — onend will restart */ };
        rec.onend = () => {
          // Keep the recognizer alive across listening/thinking/speaking so barge-in works;
          // only stays down when closed, connecting, or errored.
          if (openRef.current && phaseRef.current !== "connecting" && phaseRef.current !== "error") {
            try { rec.start(); } catch { /* */ }
          }
        };
        recRef.current = rec;
        setPhaseSafe("listening");
        try { rec.start(); } catch { /* */ }
        // First-time voice users get example prompts to try.
        try { if (!localStorage.getItem(VOICE_TUTORIAL_KEY)) { setShowTips(true); localStorage.setItem(VOICE_TUTORIAL_KEY, "1"); } } catch { /* */ }
      } catch {
        if (!cancelled) { setSupported(false); setPhaseSafe("error"); }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, startMeter, sendToAgent, setPhaseSafe]);

  /* ── Teardown on close ── */
  useEffect(() => {
    if (open) return;
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    pendingFinalRef.current = "";
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recRef.current) { try { recRef.current.abort(); } catch { /* */ } recRef.current = null; }
    if (audioElRef.current) { try { audioElRef.current.pause(); } catch { /* */ } audioElRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (audioCtxRef.current) { try { void audioCtxRef.current.close(); } catch { /* */ } audioCtxRef.current = null; }
    analyserRef.current = null;
    ttsAnalyserRef.current = null;
    micSourceRef.current = null;
    ttsSourceRef.current = null;
    interruptTtsRef.current = null;
    bargeFramesRef.current = 0;
    setAmplitude(0);
    setInterim("");
    setInterrupted(false);
    setShowTips(false);
    setCaptionWords([]);
    setCaptionIdx(-1);
    if (captionRafRef.current) { cancelAnimationFrame(captionRafRef.current); captionRafRef.current = null; }
  }, [open]);

  const close = () => setOpen(false);

  if (typeof document === "undefined") return null;

  const scale = 1 + Math.min(amplitude * 1.4, 0.7);
  const orbColor = phase === "speaking" ? "#ff7a7a" : "var(--theme-primary, #ef4242)";
  const shortLabel =
    phase === "connecting" ? "Connecting" :
    phase === "listening" ? "Listening" :
    phase === "thinking" ? "Thinking" :
    phase === "speaking" ? "Speaking" :
    "Voice";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Bottom-middle karaoke caption — what the assistant is saying */}
          <AnimatePresence>
            {captionWords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
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
                  {captionWords.map((word, i) => {
                    const isCurrent = i === captionIdx;
                    const spoken = i <= captionIdx;
                    return (
                      <span key={i} style={
                        isCurrent
                          ? { color: "#fff", fontWeight: 700, textShadow: "0 0 12px rgba(255,255,255,0.85), 0 0 22px color-mix(in srgb, var(--theme-primary, #ef4242) 60%, transparent)" }
                          : spoken ? { color: "rgba(255,255,255,0.82)" } : { color: "rgba(255,255,255,0.34)" }
                      }>
                        {word}{i < captionWords.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Example prompts (tutorial) — anchored above the widget */}
          <AnimatePresence>
            {showTips && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-28 right-6 z-[74] w-[min(92vw,22rem)] rounded-sm border border-white/12 bg-[#0c0c0e]/97 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#ef4242]">Try asking</span>
                  <button onClick={() => setShowTips(false)} className="text-white/35 hover:text-white" aria-label="Dismiss tips"><X size={13} /></button>
                </div>
                <p className="mb-3 text-[12px] leading-relaxed text-white/50">Speak naturally — or tap one to try it. I&apos;ll answer out loud and guide you around the site.</p>
                <div className="flex flex-wrap gap-2">
                  {TUTORIAL_PROMPTS.map((p) => (
                    <button key={p} onClick={() => { setShowTips(false); void sendToAgent(p); }} disabled={phase === "thinking"}
                      className="rounded-sm border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 transition-colors hover:border-[#ef4242]/40 hover:text-white disabled:opacity-40">
                      {p}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Siri-like floating widget — stays on while you browse */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-[73] flex flex-col items-end gap-2"
          >
            {/* Your live speech / status / error */}
            {(interim || phase === "error") && (
              <div
                className="max-w-[16rem] rounded-sm border px-3 py-2 text-right text-[12px] leading-snug font-jb"
                style={{ borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)", background: "rgba(8,8,10,0.92)", backdropFilter: "blur(8px)" }}
              >
                {phase === "error"
                  ? <span className="text-white/55">{supported ? "Allow mic access, then reopen voice mode." : "Live voice isn't available in this browser — use the chat mic instead."}</span>
                  : <span className="text-white/85">{interim}</span>}
              </div>
            )}

            {/* Controls row */}
            <div className="flex items-center gap-1.5">
              <span className="rounded-sm border border-[#ef4242]/25 bg-black/60 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-[#ef4242]/90 backdrop-blur-sm">{shortLabel}</span>
              <button onClick={() => setShowTips((s) => !s)} title="Example questions" aria-label="Example questions"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-black/50 text-white/55 hover:text-white hover:border-white/30 backdrop-blur-sm transition-colors">
                <HelpCircle size={13} />
              </button>
              <button onClick={close} title="Exit voice mode" aria-label="Exit voice mode"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-black/50 text-white/55 hover:text-white hover:border-white/30 backdrop-blur-sm transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* The orb (tap to interrupt while it's speaking) */}
            <button
              onClick={() => { if (phase === "speaking") interruptTtsRef.current?.(); }}
              aria-label={phase === "speaking" ? "Tap to interrupt" : "Voice assistant"}
              className="relative flex h-16 w-16 items-center justify-center rounded-full"
              style={{ boxShadow: `0 8px 28px rgba(0,0,0,0.45), 0 0 ${18 + amplitude * 60}px color-mix(in srgb, ${orbColor} 55%, transparent)` }}
            >
              {(phase === "listening" || phase === "speaking") && (
                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: `color-mix(in srgb, ${orbColor} 28%, transparent)` }} />
              )}
              <span className="absolute rounded-full" style={{ height: 50, width: 50, background: `radial-gradient(circle at 35% 30%, #fff, ${orbColor} 78%)`, transform: `scale(${scale})`, transition: "transform 80ms linear" }} />
              {interrupted && (
                <span className="absolute -top-7 right-0 whitespace-nowrap rounded-sm bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#ef4242]">Go ahead</span>
              )}
              <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/35">
                {phase === "thinking" ? <Loader2 size={15} className="text-white animate-spin" /> : <Mic size={15} className="text-white" />}
              </span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
