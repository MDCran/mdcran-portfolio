"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "@/lib/ThemeContext";
import { getDaypart } from "@/lib/visitor-memory";

const ChromaKeyVideo = dynamic(() => import("@/components/home/ChromaKeyVideo"), { ssr: false });

const TOGGLE_EVENT = "mdcran:toggle-chat";
const GREETING_STORAGE_KEY = "mdcran_chat_greeting_seen_v1";
const GREETING_DELAY_MS = 2500;

export default function ChatBubble() {
  const [chatOpen, setChatOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [nudge, setNudge] = useState<null | "rage" | "hesitation">(null);
  const [calm, setCalm] = useState(false); // calmer presence in the evening/night
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

  /* Sync with custom event so ChatPanel can also close/open */
  useEffect(() => {
    const onToggle = () => setChatOpen((prev) => !prev);
    const onOpen = () => setChatOpen(true);
    const onClose = () => setChatOpen(false);
    window.addEventListener(TOGGLE_EVENT, onToggle);
    window.addEventListener("mdcran:chat-open", onOpen);
    window.addEventListener("mdcran:chat-close", onClose);
    return () => {
      window.removeEventListener(TOGGLE_EVENT, onToggle);
      window.removeEventListener("mdcran:chat-open", onOpen);
      window.removeEventListener("mdcran:chat-close", onClose);
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
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
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

      {/* Pulse ring */}
      <AnimatePresence>
        {(nudge && !chatOpen) && (
          <motion.span
            key="nudge-pulse"
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "rgba(239,66,66,0.5)" }}
            animate={{ scale: [1, 1.7, 1.7], opacity: [0.7, 0.1, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
            aria-hidden
          />
        )}
        {!chatOpen && !nudge && (
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

      {/* Button */}
      <motion.button
        onClick={dispatchToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{ backgroundColor: "var(--theme-primary, #ef4242)", color: iconColor, boxShadow: "0 4px 12px color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)" }}
        className="relative h-12 w-12 rounded-full flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2"
        aria-label={chatOpen ? "Close chat" : "Open chat"}
      >
        {/* Always the chat bubble icon — closing is handled by the panel's own X */}
        <span className="flex items-center justify-center">
          <MessageCircle size={16} />
        </span>
      </motion.button>
    </div>
  );
}
