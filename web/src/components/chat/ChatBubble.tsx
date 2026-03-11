"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "@/lib/ThemeContext";

const ChromaKeyVideo = dynamic(() => import("@/components/home/ChromaKeyVideo"), { ssr: false });

const TOGGLE_EVENT = "mdcran:toggle-chat";
const GREETING_STORAGE_KEY = "mdcran_chat_greeting_seen_v1";
const GREETING_DELAY_MS = 2500;

export default function ChatBubble() {
  const [chatOpen, setChatOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const { themeInfo } = useTheme();
  const darkIconThemes = ["hacker", "high-contrast"];
  const iconColor = darkIconThemes.includes(themeInfo.id) ? "#000000" : "#ffffff";

  /* Sync with custom event so ChatPanel can also close/open */
  useEffect(() => {
    const onToggle = () => setChatOpen((prev) => !prev);
    window.addEventListener(TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(TOGGLE_EVENT, onToggle);
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

  const dispatchToggle = () => {
    setShowGreeting(false);
    try { window.localStorage.setItem(GREETING_STORAGE_KEY, "true"); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
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

      {/* Pulse ring */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.span
            key="pulse"
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent)' }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{
              scale: [1, 1.6, 1.6],
              opacity: [0.6, 0.15, 0],
            }}
            transition={{
              duration: 2,
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
        <AnimatePresence mode="wait" initial={false}>
          {chatOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <X size={16} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <MessageCircle size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
