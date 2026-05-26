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
  const [amplitude, setAmplitude] = useState(0); // 0..1 drives the reactive circle
  const [wave, setWave] = useState<number[]>(() => new Array(48).fill(0)); // mic time-domain bars
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

  /* ── Drive the reactive circle + mic waveform; handle barge-in ── */
  const startMeter = useCallback(() => {
    const mic = analyserRef.current;
    if (!mic) return;
    const freq = new Uint8Array(mic.frequencyBinCount);
    const time = new Uint8Array(mic.fftSize);
    const WAVE_BARS = 48;

    const tick = () => {
      // Amplitude drives the metaball — read the assistant's voice while it speaks, else the mic.
      const speaking = phaseRef.current === "speaking";
      const ampAnalyser = speaking && ttsAnalyserRef.current ? ttsAnalyserRef.current : mic;
      const aData = new Uint8Array(ampAnalyser.frequencyBinCount);
      ampAnalyser.getByteFrequencyData(aData);
      let sum = 0;
      for (let i = 0; i < aData.length; i++) sum += aData[i];
      const avg = sum / aData.length / 255;
      setAmplitude((prev) => prev * 0.6 + avg * 0.4);

      // Mic time-domain → sine-wave bars (only meaningful while listening / barging in).
      mic.getByteTimeDomainData(time);
      let rms = 0;
      const bars: number[] = new Array(WAVE_BARS);
      const step = Math.floor(time.length / WAVE_BARS);
      for (let b = 0; b < WAVE_BARS; b++) {
        const v = (time[b * step] - 128) / 128; // -1..1
        bars[b] = Math.abs(v);
      }
      for (let i = 0; i < time.length; i++) { const v = (time[i] - 128) / 128; rms += v * v; }
      rms = Math.sqrt(rms / time.length);
      if (phaseRef.current === "listening" || speaking) setWave(bars);

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
    setWave(new Array(48).fill(0));
    setInterrupted(false);
    setShowTips(false);
    setCaptionWords([]);
    setCaptionIdx(-1);
    if (captionRafRef.current) { cancelAnimationFrame(captionRafRef.current); captionRafRef.current = null; }
  }, [open]);

  const close = () => setOpen(false);

  if (typeof document === "undefined") return null;

  const scale = 1 + Math.min(amplitude * 1.4, 0.7);
  const glow = 30 + amplitude * 120;
  const phaseLabel =
    phase === "connecting" ? "Connecting…" :
    phase === "listening" ? "Listening…" :
    phase === "thinking" ? "Thinking…" :
    phase === "speaking" ? `${AGENT_NAME} is speaking…` :
    "Voice unavailable";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
          style={{ background: "radial-gradient(circle at 50% 40%, rgba(20,8,8,0.96), rgba(5,5,5,0.98))", backdropFilter: "blur(8px)" }}
        >
          {/* Close */}
          <button
            onClick={close}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
            aria-label="Exit voice mode"
          >
            <X size={18} />
          </button>

          {/* Replay tips */}
          <button
            onClick={() => setShowTips(true)}
            className="absolute left-5 top-5 flex h-10 items-center gap-1.5 rounded-sm border border-white/10 px-3 text-[11px] uppercase tracking-[0.18em] text-white/40 hover:text-white hover:border-white/30 transition-colors"
            aria-label="Show example questions"
          >
            <HelpCircle size={14} /> Tips
          </button>

          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ef4242]/80 mb-1">Voice Mode</div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/30 mb-10">{phaseLabel}</div>

          {/* Reactive metaball circle */}
          <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
            {/* Gooey filter — merges nearby blobs into liquid mercury */}
            <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
              <defs>
                <filter id="voice-goo">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
                  <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
                  <feBlend in="SourceGraphic" in2="goo" />
                </filter>
              </defs>
            </svg>

            <div className="absolute inset-0 flex items-center justify-center" style={{ filter: "url(#voice-goo)" }}>
              {/* central blob — pulses with audio amplitude */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 150, height: 150, background: "#ef4242",
                  transform: `scale(${scale})`, transition: "transform 80ms linear",
                }}
              />
              {/* orbiting droplets — split apart while thinking, fuse otherwise */}
              <motion.div
                className="absolute"
                style={{ width: 150, height: 150 }}
                animate={{ rotate: phase === "thinking" ? 360 : 0 }}
                transition={phase === "thinking" ? { duration: 3, repeat: Infinity, ease: "linear" } : { duration: 0.8 }}
              >
                {[0, 120, 240].map((deg) => (
                  <motion.div
                    key={deg}
                    className="absolute left-1/2 top-1/2 rounded-full"
                    style={{ width: 54, height: 54, background: "#ef4242", marginLeft: -27, marginTop: -27, transformOrigin: "center" }}
                    animate={{ x: (phase === "thinking" ? 64 : 0) * Math.cos((deg * Math.PI) / 180), y: (phase === "thinking" ? 64 : 0) * Math.sin((deg * Math.PI) / 180) }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
              </motion.div>
            </div>

            {/* soft glow halo (outside the goo so it stays smooth) */}
            <div className="absolute rounded-full pointer-events-none" style={{ width: 170, height: 170, boxShadow: `0 0 ${glow}px rgba(239,66,66,0.55)` }} />

            {/* Pulsing rings */}
            <div className="absolute rounded-full border border-[#ef4242]/30" style={{ width: 220, height: 220 }} />
            <div className="absolute rounded-full border border-[#ef4242]/15" style={{ width: 264, height: 264 }} />
            <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-black/40 border border-white/10">
              {phase === "thinking" ? (
                <Loader2 size={22} className="text-white/70 animate-spin" />
              ) : (
                <Mic size={22} className={phase === "listening" ? "text-[#ef4242]" : "text-white/60"} />
              )}
            </div>
          </div>

          {/* Mic waveform — sine-wave lines reacting to your voice */}
          <div className="mt-8 flex h-12 items-center justify-center gap-[3px]" aria-hidden>
            {wave.map((v, i) => {
              const active = phase === "listening" || phase === "speaking";
              const center = 1 - Math.abs(i - (wave.length - 1) / 2) / (wave.length / 2); // taper at edges
              const h = active ? Math.max(3, v * 46 * (0.4 + center * 0.6)) : 3;
              return (
                <span
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{
                    height: `${h}px`,
                    background: phase === "speaking" ? "rgba(255,255,255,0.5)" : "var(--theme-primary, #ef4242)",
                    opacity: active ? 0.5 + v * 0.5 : 0.25,
                    transition: "height 70ms linear, opacity 120ms linear",
                  }}
                />
              );
            })}
          </div>

          {interrupted && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#ef4242]"
            >
              Go ahead — I&apos;m listening
            </motion.div>
          )}

          {/* Live transcript (your speech) / status — the assistant's reply is captioned at the bottom */}
          <div className="mt-6 w-full max-w-lg px-6 text-center min-h-[60px]">
            {phase === "error" ? (
              <p className="text-sm text-white/50">
                {supported
                  ? "I need microphone access for voice mode. Allow the mic in your browser, then reopen voice mode."
                  : "Live voice isn't available in this browser. Try Chrome, Edge, or Safari — or use the mic button in the chat panel."}
              </p>
            ) : interim ? (
              <p className="text-base text-white/80 font-jb">{interim}</p>
            ) : captionWords.length === 0 ? (
              <p className="text-sm text-white/30 font-jb">Say something — ask about my work, projects, or where to find anything.</p>
            ) : null}
          </div>

          {/* Bottom-middle karaoke caption of what the assistant is saying */}
          <AnimatePresence>
            {captionWords.length > 0 && !showTips && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[min(92vw,46rem)] px-4 pointer-events-none"
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
                  {captionWords.map((word, i) => {
                    const isCurrent = i === captionIdx;
                    const spoken = i <= captionIdx;
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
                        {word}{i < captionWords.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tutorial: example prompts (first use + replayable) */}
          <AnimatePresence>
            {showTips && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-16 left-1/2 z-20 w-[min(92vw,30rem)] -translate-x-1/2 rounded-sm border border-white/12 bg-[#0c0c0e]/97 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#ef4242]">Try asking</span>
                  <button onClick={() => setShowTips(false)} className="text-white/35 hover:text-white" aria-label="Dismiss tips"><X size={13} /></button>
                </div>
                <p className="mb-3 text-[12px] leading-relaxed text-white/50">
                  Just speak naturally — or tap one to try it. {AGENT_NAME} will answer out loud and guide you around the site.
                </p>
                <div className="flex flex-wrap gap-2">
                  {TUTORIAL_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setShowTips(false); void sendToAgent(p); }}
                      disabled={phase === "thinking"}
                      className="rounded-sm border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 transition-colors hover:border-[#ef4242]/40 hover:text-white disabled:opacity-40"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="absolute bottom-6 text-[10px] uppercase tracking-[0.2em] text-white/20">
            Speak naturally · {AGENT_NAME} can guide you around the site · talk over me to interrupt
          </p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
