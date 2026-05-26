"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, AudioLines, Bot } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "@/lib/ThemeContext";
import { getDaypart } from "@/lib/visitor-memory";

const ChromaKeyVideo = dynamic(() => import("@/components/home/ChromaKeyVideo"), { ssr: false });

const TOGGLE_EVENT = "mdcran:toggle-chat";
const GREETING_STORAGE_KEY = "mdcran_chat_greeting_seen_v1";
const GREETING_DELAY_MS = 2500;

function hasToured(): boolean {
  try { return /(?:^|;\s*)mdcran_toured=1/.test(document.cookie); } catch { return false; }
}
function markToured(): void {
  try { document.cookie = `mdcran_toured=1; path=/; max-age=${60 * 60 * 24 * 365}`; } catch { /* */ }
}

export default function ChatBubble() {
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // voice-vs-text chooser
  const [showGreeting, setShowGreeting] = useState(false);
  const [nudge, setNudge] = useState<null | "rage" | "hesitation">(null);
  const [calm, setCalm] = useState(false); // calmer presence in the evening/night
  const [voiceEnabled, setVoiceEnabled] = useState(false); // voice conversation configured server-side
  const [voiceSupported, setVoiceSupported] = useState(true); // SpeechRecognition present in this browser
  const { themeInfo } = useTheme();
  const darkIconThemes = ["hacker", "high-contrast"];
  const iconColor = darkIconThemes.includes(themeInfo.id) ? "#000000" : "#ffffff";

  /* Time-of-day mood: ease off the idle pulse after hours */
  useEffect(() => {
    const apply = () => { const p = getDaypart(); setCalm(p === "evening" || p === "night"); };
    apply();
    const iv = setInterval(apply, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  /* Probe whether voice (ElevenLabs) is configured + supported, to decide if the mic button shows. */
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    let active = true;
    fetch("/api/voice/tts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d) setVoiceEnabled(Boolean(d.enabled)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  /* Sync with custom event so ChatPanel can also close/open */
  useEffect(() => {
    const onToggle = () => setChatOpen((prev) => !prev);
    const onOpen = () => { setChatOpen(true); setMenuOpen(false); };
    const onClose = () => setChatOpen(false);
    const onVoiceOpen = () => { setVoiceOpen(true); setMenuOpen(false); };
    const onVoiceClose = () => setVoiceOpen(false);
    window.addEventListener(TOGGLE_EVENT, onToggle);
    window.addEventListener("mdcran:chat-open", onOpen);
    window.addEventListener("mdcran:chat-close", onClose);
    window.addEventListener("mdcran:voice-state-open", onVoiceOpen);
    window.addEventListener("mdcran:voice-state-close", onVoiceClose);
    return () => {
      window.removeEventListener(TOGGLE_EVENT, onToggle);
      window.removeEventListener("mdcran:chat-open", onOpen);
      window.removeEventListener("mdcran:chat-close", onClose);
      window.removeEventListener("mdcran:voice-state-open", onVoiceOpen);
      window.removeEventListener("mdcran:voice-state-close", onVoiceClose);
    };
  }, []);

  /* Show greeting popup on first visit */
  useEffect(() => {
    try {
      if (window.localStorage.getItem(GREETING_STORAGE_KEY) === "true") return;
    } catch { /* ignore */ }

    let cancelled = false;
    const showTimer = setTimeout(() => {
      if (!cancelled) setShowGreeting(true);
    }, GREETING_DELAY_MS);

    return () => { cancelled = true; clearTimeout(showTimer); };
  }, []);

  /* Proactive interventions: rage-clicks / scroll hesitation */
  useEffect(() => {
    let clearTimer: ReturnType<typeof setTimeout>;
    const onSignal = (kind: "rage" | "hesitation") => {
      setChatOpen((open) => {
        if (!open) setNudge(kind);
        return open;
      });
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setNudge(null), 8000);
    };
    const onRage = () => onSignal("rage");
    const onHes = () => onSignal("hesitation");
    window.addEventListener("mdcran:rage", onRage);
    window.addEventListener("mdcran:hesitation", onHes);
    return () => { window.removeEventListener("mdcran:rage", onRage); window.removeEventListener("mdcran:hesitation", onHes); clearTimeout(clearTimer); };
  }, []);

  const dispatchToggle = () => {
    setShowGreeting(false);
    setNudge(null);
    try { window.localStorage.setItem(GREETING_STORAGE_KEY, "true"); } catch { /* ignore */ }
    // First time ever clicking → run the guided tour first (it opens the chat at the end).
    if (!chatOpen && !voiceOpen && !hasToured()) {
      markToured();
      setMenuOpen(false);
      window.dispatchEvent(new CustomEvent("mdcran:run-tutorial"));
      return;
    }
    // If a mode is already open, the bubble closes it.
    if (chatOpen) { window.dispatchEvent(new CustomEvent(TOGGLE_EVENT)); return; }
    if (voiceOpen) { window.dispatchEvent(new CustomEvent("mdcran:voice-close")); return; }
    // Otherwise toggle the voice-vs-text chooser.
    setMenuOpen((m) => !m);
  };

  const chooseText = () => {
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent("mdcran:chat-open"));
  };
  const chooseVoice = () => {
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent("mdcran:voice-open"));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70]">
      {/* Greeting popup with waving character */}
      <AnimatePresence>
        {showGreeting && !chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-16 right-0 w-56 pointer-events-none"
          >
            {/* Waving character */}
            <div className="absolute -top-44 right-0 w-58 pointer-events-none">
              <ChromaKeyVideo src="/cropped.mp4" className="w-full opacity-95" />
            </div>
            {/* Speech bubble */}
            <div
              className="relative rounded-sm border bg-[#080808]/95 backdrop-blur-xl px-4 py-3 pointer-events-auto cursor-pointer"
              style={{
                borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
              onClick={dispatchToggle}
            >
              <p className="text-[12px] text-white/80 font-jb leading-relaxed">
                Have questions? Ask away!
              </p>
              {/* Arrow pointing to bubble button */}
              <div
                className="absolute -bottom-1.5 right-5 w-3 h-3 rotate-45 bg-[#080808]/95 border-r border-b"
                style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proactive nudge bubble (rage / hesitation) */}
      <AnimatePresence>
        {nudge && !chatOpen && !showGreeting && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-16 right-0 w-60"
          >
            <div
              className="relative rounded-sm border bg-[#080808]/95 backdrop-blur-xl px-4 py-3 cursor-pointer"
              style={{ borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 45%, transparent)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(239,66,66,0.18)" }}
              onClick={dispatchToggle}
            >
              <p className="text-[12px] text-white/85 font-jb leading-relaxed">
                {nudge === "rage"
                  ? "Looks like you're having some trouble there — want a hand?"
                  : "Want me to break down what you're looking at?"}
              </p>
              <div className="absolute -bottom-1.5 right-5 w-3 h-3 rotate-45 bg-[#080808]/95 border-r border-b" style={{ borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 45%, transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice-vs-text chooser — appears above the bubble on click */}
      <AnimatePresence>
        {menuOpen && !chatOpen && !voiceOpen && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0" onClick={() => setMenuOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-16 right-0 w-56"
            >
              <div
                className="relative rounded-sm border bg-[#080808]/95 backdrop-blur-xl p-2.5 space-y-1.5"
                style={{
                  borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 24px color-mix(in srgb, var(--theme-primary, #ef4242) 8%, transparent)",
                }}
              >
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/35 px-1 pb-0.5">How would you like to chat?</p>

                {/* Voice option */}
                {voiceEnabled && (
                  <button
                    type="button"
                    onClick={voiceSupported ? chooseVoice : undefined}
                    disabled={!voiceSupported}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm border transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 22%, transparent)",
                      backgroundColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 8%, transparent)",
                    }}
                    title={voiceSupported ? "Talk out loud" : "Voice needs Chrome, Edge, or Safari"}
                  >
                    <AudioLines size={16} style={{ color: "var(--theme-primary, #ef4242)" }} />
                    <span className="flex flex-col">
                      <span className="text-[12px] text-white/85 font-jb">Voice chat</span>
                      <span className="text-[10px] text-white/40 font-jb">{voiceSupported ? "Talk out loud" : "Unsupported browser"}</span>
                    </span>
                  </button>
                )}

                {/* Text option */}
                <button
                  type="button"
                  onClick={chooseText}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm border border-white/10 bg-white/4 hover:border-white/25 transition-colors text-left cursor-pointer"
                  title="Type your questions"
                >
                  <MessageCircle size={16} className="text-white/70" />
                  <span className="flex flex-col">
                    <span className="text-[12px] text-white/85 font-jb">Text chat</span>
                    <span className="text-[10px] text-white/40 font-jb">Type your questions</span>
                  </span>
                </button>
              </div>
              {/* Arrow pointing to the bubble */}
              <div
                className="absolute -bottom-1.5 right-5 w-3 h-3 rotate-45 bg-[#080808]/95 border-r border-b"
                style={{ borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)" }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pulse ring */}
      <AnimatePresence>
        {(nudge && !chatOpen && !voiceOpen) && (
          <motion.span
            key="nudge-pulse"
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "rgba(239,66,66,0.5)" }}
            animate={{ scale: [1, 1.7, 1.7], opacity: [0.7, 0.1, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
            aria-hidden
          />
        )}
        {!chatOpen && !voiceOpen && !nudge && !menuOpen && (
          <motion.span
            key="pulse"
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent)' }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{
              scale: calm ? [1, 1.35, 1.35] : [1, 1.6, 1.6],
              opacity: calm ? [0.32, 0.08, 0] : [0.6, 0.15, 0],
            }}
            transition={{
              duration: calm ? 3.2 : 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Assistant button — a head with a voice/waveform badge */}
      <motion.button
        onClick={dispatchToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{ backgroundColor: "var(--theme-primary, #ef4242)", color: iconColor, boxShadow: "0 4px 12px color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)" }}
        className="relative h-12 w-12 rounded-full flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2"
        aria-label={chatOpen || voiceOpen ? "Close assistant" : "Open assistant"}
      >
        <span className="relative flex items-center justify-center">
          <Bot size={19} />
          {/* Voice badge in the corner so it reads as a talking assistant */}
          <span
            className="absolute -bottom-1.5 -right-2 flex items-center justify-center h-[15px] w-[15px] rounded-full"
            style={{ backgroundColor: iconColor, color: "var(--theme-primary, #ef4242)" }}
          >
            <AudioLines size={9} strokeWidth={2.5} />
          </span>
        </span>
      </motion.button>
    </div>
  );
}
