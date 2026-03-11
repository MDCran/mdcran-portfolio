"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";

const TOGGLE_EVENT = "mdcran:toggle-chat";
const MAX_MESSAGES = 20;
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const INACTIVITY_CHECK_MS = 15_000; // check every 15s

const AGENT_NAMES = [
  "Cosmo", "Nova", "Pixel", "Echo", "Byte",
  "Luna", "Spark", "Orbit", "Neon", "Dash",
];

function pickAgentName(): string {
  return AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
}

/** Render basic markdown: **bold**, *italic*, [text](url) */
function renderChatMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(<strong key={match.index} className="font-semibold" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 90%, transparent)' }}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <a key={match.index} href={match[7]} className="underline underline-offset-2" style={{ color: 'var(--theme-primary, #ef4242)' }}>
          {match[6]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Who is Michael?",
  "What kind of work does he do?",
  "Is he for hire?",
];

function TypingIndicator() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Randomly pause/resume to mimic human typing hesitation
    const schedule = () => {
      const delay = paused
        ? 300 + Math.random() * 500 // pause for 300-800ms
        : 1500 + Math.random() * 3000; // type for 1.5-4.5s
      const t = setTimeout(() => {
        setPaused((p) => !p);
      }, delay);
      return t;
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, [paused]);

  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)' }}
          animate={paused ? { y: 0, opacity: 0.3 } : { y: [0, -4, 0], opacity: 1 }}
          transition={paused ? { duration: 0.2 } : {
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function ConnectingTimer({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <div
        className="w-4 h-4 rounded-full border-2 animate-spin"
        style={{
          borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 15%, transparent)',
          borderTopColor: 'color-mix(in srgb, var(--theme-text, #fff) 50%, transparent)',
        }}
      />
      <span
        className="text-[10px] uppercase tracking-[0.2em]"
        style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)' }}
      >
        {label ?? "Connecting to agent..."}
      </span>
    </div>
  );
}

function TypewriterText({ text, speed = 28, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    const iv = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(iv);
        onCompleteRef.current?.();
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);

  return (
    <>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[14px] ml-[1px] align-text-bottom animate-pulse" style={{ backgroundColor: 'var(--theme-primary, #ef4242)' }} />
      )}
    </>
  );
}

export default function ChatPanel() {
  const pathname = usePathname();
  const { themeInfo } = useTheme();
  const isLight = themeInfo.id === "light";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  /* welcomeStep: 0=not started, 1=connecting, 2=connected, 3=typing, 4=done, 5=failed */
  const [welcomeStep, setWelcomeStep] = useState(0);
  const [welcomeTyped, setWelcomeTyped] = useState(false);
  const welcomeCompletedRef = useRef(false);
  const welcomeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [agentName, setAgentName] = useState(() => pickAgentName());
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  /* reconnectStep: 0=idle, 1=connecting, 2=connected */
  const [reconnectStep, setReconnectStep] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const welcomeText = (() => {
    const greetings = [
      `Hey! I'm ${agentName}, Michael's portfolio assistant. Ask me anything about his work, skills, or services.`,
      `Hi there! ${agentName} here. What would you like to know about Michael's work?`,
      `Hey, I'm ${agentName}! Happy to help you learn more about Michael and what he does.`,
      `Welcome! I'm ${agentName} — feel free to ask me anything about Michael's portfolio.`,
      `Hi! ${agentName} here, ready to chat. What can I help you with?`,
    ];
    // Pick based on agent name hash so same agent = same greeting
    const hash = agentName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return greetings[hash % greetings.length];
  })();

  /* Multi-step welcome sequence — restarts if closed mid-sequence, skips if completed */
  useEffect(() => {
    if (!open || welcomeCompletedRef.current) return;

    // Reset for (re)start
    setWelcomeStep(1);
    setWelcomeTyped(false);

    let cancelled = false;
    const timers = welcomeTimersRef.current;
    timers.length = 0;

    const push = (t: ReturnType<typeof setTimeout>) => { timers.push(t); };

    // Connecting takes 2-8 seconds randomly
    const connectDelay = 2000 + Math.random() * 6000;
    push(setTimeout(() => { if (!cancelled) setWelcomeStep(2); }, connectDelay));
    // Show typing indicator after connecting
    const typingDelay = connectDelay + 800;
    push(setTimeout(() => { if (!cancelled) setWelcomeStep(3); }, typingDelay));
    // Then deliver the message after typing shows for a bit
    const messageDelay = typingDelay + 1500 + Math.random() * 1000;
    push(setTimeout(() => {
      if (cancelled) return;
      setMessages([{ role: "assistant", content: "__WELCOME__" }]);
      setWelcomeStep(4);
      welcomeCompletedRef.current = true;
    }, messageDelay));

    /* Safety: if stuck at connecting for 8s, show error then retry */
    push(setTimeout(() => {
      if (cancelled) return;
      setWelcomeStep((cur) => {
        if (cur < 2) {
          push(setTimeout(() => {
            if (cancelled) return;
            setWelcomeStep(2);
            push(setTimeout(() => { if (!cancelled) setWelcomeStep(3); }, 800));
            push(setTimeout(() => {
              if (cancelled) return;
              setMessages([{ role: "assistant", content: "__WELCOME__" }]);
              setWelcomeStep(4);
              welcomeCompletedRef.current = true;
            }, 2000));
          }, 1500));
          return 5;
        }
        return cur;
      });
    }, 8000));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timers.length = 0;
    };
  }, [open]);

  /* Inactivity timeout — ends chat after 3 min idle */
  useEffect(() => {
    if (!open || disconnected || streaming || welcomeStep < 4) return;
    const currentAgent = agentName;
    const check = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        setDisconnected(true);
        setMessages((prev) => [...prev, { role: "assistant", content: `__DISCONNECT__:${currentAgent}` }]);
      }
    }, INACTIVITY_CHECK_MS);
    return () => clearInterval(check);
  }, [open, disconnected, streaming, welcomeStep, agentName]);

  /* Listen for toggle events from ChatBubble */
  useEffect(() => {
    const onToggle = () => setOpen((prev) => !prev);
    window.addEventListener(TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(TOGGLE_EVENT, onToggle);
  }, []);

  /* ESC to close */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* Auto-scroll on new content */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  /* Focus input when panel opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const handleClose = () => {
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
  };

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming || reconnectStep > 0) return;

    // If disconnected, go through reconnection flow first
    if (disconnected) {
      setInput("");
      setReconnectStep(1);
      const newName = pickAgentName();
      const connectDelay = 2000 + Math.random() * 6000;
      await new Promise((r) => setTimeout(r, connectDelay));
      setAgentName(newName);
      setReconnectStep(0);
      setDisconnected(false);
      setMessages((prev) => [...prev, { role: "assistant", content: `__RECONNECT__:${newName}` }]);
      lastActivityRef.current = Date.now();
      await new Promise((r) => setTimeout(r, 400));
      // Now proceed with the message using the new agent name below
    }

    lastActivityRef.current = Date.now();

    const userMsg: Message = { role: "user", content: text };
    // Filter out system-type messages before sending to API
    const cleanMessages = messages.filter((m) =>
      m.content !== "__INACTIVITY__" &&
      m.content !== "__WELCOME__" &&
      !m.content.startsWith("__DISCONNECT__:") &&
      !m.content.startsWith("__RECONNECT__:")
    );
    const nextMessages = [...cleanMessages, userMsg].slice(-MAX_MESSAGES);

    setMessages((prev) => [...prev.filter((m) => m.content !== "__INACTIVITY__"), userMsg]);
    setInput("");
    setStreaming(true);

    /* Placeholder assistant message for streaming */
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    const MAX_RETRIES = 3;

    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        abortRef.current = controller;

        let accumulated = "";
        const streamStartTime = Date.now();

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: nextMessages, currentPage: pathname, agentName }),
            signal: controller.signal,
          });

          if (!res.ok) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
              };
              return updated;
            });
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) return;

          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const payload = line.slice(6).trim();

                if (payload === "[DONE]") {
                  break;
                }

                try {
                  const parsed = JSON.parse(payload);
                  if (parsed.text) {
                    /* Ensure typing dots show for at least 1s before text starts */
                    if (accumulated.length === 0) {
                      const elapsed = Date.now() - streamStartTime;
                      if (elapsed < 1000) {
                        await new Promise((r) => setTimeout(r, 1000 - elapsed));
                      }
                    }
                    /* Slow reveal: render one character at a time */
                    for (const char of parsed.text) {
                      accumulated += char;
                      const snap = accumulated;
                      setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                          role: "assistant",
                          content: snap,
                        };
                        return updated.slice(-MAX_MESSAGES);
                      });
                      await new Promise((r) => setTimeout(r, 22));
                    }
                  }
                } catch {
                  /* ignore malformed lines */
                }
              }
            }
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          if (attempt === MAX_RETRIES - 1) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
              };
              return updated;
            });
            return;
          }
          continue;
        }

        /* Got a real response */
        if (accumulated.trim()) break;

        /* Blank response — retry if attempts remain */
        if (attempt < MAX_RETRIES - 1) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: "" };
            return updated;
          });
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: "Sorry, I couldn't generate a response. Please try again.",
            };
            return updated;
          });
        }
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      lastActivityRef.current = Date.now();
    }
  }, [input, streaming, messages, pathname, disconnected, reconnectStep, agentName]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isWelcome = welcomeStep === 4 && messages.length === 1 && messages[0].content === "__WELCOME__";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 34, x: -18, scale: 0.92, filter: "blur(10px)" }}
          animate={{
            opacity: [0.18, 1, 0.82, 1],
            y: [24, -4, 2, 0],
            x: [-14, 8, -4, 0],
            scale: [0.96, 1.02, 0.995, 1],
            filter: ["blur(8px)", "blur(0px)", "blur(1px)", "blur(0px)"],
          }}
          exit={{
            opacity: [1, 0.76, 0.92, 0],
            y: [0, 2, -3, 26],
            x: [0, -6, 5, -12],
            scale: [1, 1.01, 0.98, 0.92],
            filter: ["blur(0px)", "blur(1px)", "blur(0px)", "blur(7px)"],
          }}
          transition={{ duration: 0.48, times: [0, 0.42, 0.7, 1], ease: "easeOut" }}
          className="fixed bottom-20 right-6 z-50 flex flex-col w-[min(calc(100vw-2rem),22rem)] max-h-[80vh]"
        >
          <div
            className={`relative flex flex-col h-full overflow-hidden rounded-sm border backdrop-blur-xl ${
              isLight ? 'bg-white/95' : 'bg-[#080808]/95'
            }`}
            style={{
              borderColor: isLight
                ? 'color-mix(in srgb, var(--theme-primary, #ef4242) 20%, rgba(0,0,0,0.08))'
                : 'color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)',
              boxShadow: isLight
                ? '0 24px 80px rgba(0,0,0,0.12), 0 0 30px color-mix(in srgb, var(--theme-primary, #ef4242) 6%, transparent)'
                : '0 24px 80px rgba(0,0,0,0.55), 0 0 30px color-mix(in srgb, var(--theme-primary, #ef4242) 8%, transparent)',
            }}
          >
            {/* Grid overlay */}
            <div
              className={`absolute inset-0 pointer-events-none ${isLight ? 'opacity-40' : 'opacity-80'}`}
              style={{
                backgroundImage:
                  "linear-gradient(color-mix(in srgb, var(--theme-primary, #ef4242) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--theme-primary, #ef4242) 5%, transparent) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at top right, color-mix(in srgb, var(--theme-primary, #ef4242) 18%, transparent) 0%, color-mix(in srgb, var(--theme-primary, #ef4242) 4%, transparent) 28%, transparent 62%)",
              }}
            />

            {/* Corner brackets */}
            <div className="absolute top-0 left-0 h-8 w-8 border-l border-t pointer-events-none" style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 55%, transparent)' }} />
            <div className="absolute top-0 right-0 h-8 w-8 border-r border-t pointer-events-none" style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 55%, transparent)' }} />
            <div className="absolute bottom-0 left-0 h-8 w-8 border-l border-b pointer-events-none" style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 35%, transparent)' }} />
            <div className="absolute bottom-0 right-0 h-8 w-8 border-r border-b pointer-events-none" style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 35%, transparent)' }} />

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className={`absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-sm border transition-colors cursor-pointer ${
                isLight
                  ? 'border-black/10 bg-white/60 text-black/40 hover:border-black/25 hover:text-black'
                  : 'border-white/10 bg-black/30 text-white/35 hover:border-white/25 hover:text-white'
              }`}
              aria-label="Close chat"
            >
              <X size={14} />
            </button>

            {/* Header */}
            <div
              className="relative z-10 px-5 py-3 flex items-center gap-3"
              style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-primary, #ef4242) 12%, transparent)' }}
            >
              <div
                className="inline-flex items-center gap-2 rounded-sm px-3 py-1.5"
                style={{
                  border: '1px solid color-mix(in srgb, var(--theme-primary, #ef4242) 18%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 6%, transparent)',
                }}
              >
                <MessageCircle size={11} style={{ color: 'color-mix(in srgb, var(--theme-primary, #ef4242) 85%, transparent)' }} />
                <span
                  className="text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: 'color-mix(in srgb, var(--theme-primary, #ef4242) 80%, transparent)' }}
                >
                  Chat
                </span>
              </div>
              <span
                className="text-[10px] uppercase tracking-[0.22em]"
                style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 22%, transparent)' }}
              >
                AI Assistant
              </span>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className={`relative z-10 flex-1 overflow-y-auto px-5 py-3 space-y-3 scrollbar-thin scrollbar-track-transparent ${
                isLight ? 'scrollbar-thumb-black/10' : 'scrollbar-thumb-white/10'
              }`}
            >
              {/* Welcome sequence: connecting → connected */}
              {(welcomeStep === 1 || welcomeStep === 5) && (
                <ConnectingTimer label={welcomeStep === 5 ? "Having trouble finding an agent..." : undefined} />
              )}

              {welcomeStep >= 2 && welcomeStep !== 5 && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }} />
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-[5px] h-[5px] rounded-full animate-pulse"
                      style={{ backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }}
                    />
                    <span
                      className="text-[9px] uppercase tracking-[0.2em]"
                      style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 25%, transparent)' }}
                    >
                      Connected to {agentName}
                    </span>
                  </div>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }} />
                </div>
              )}

              {messages.map((msg, i) => {
                // Skip the empty placeholder message while streaming — we show the typing indicator instead
                const isStreamingPlaceholder = streaming && i === messages.length - 1 && msg.role === "assistant" && msg.content === "";
                if (isStreamingPlaceholder) return null;

                // Disconnect marker → status text + divider
                if (msg.content.startsWith("__DISCONNECT__:")) {
                  const name = msg.content.slice("__DISCONNECT__:".length);
                  return (
                    <React.Fragment key={i}>
                      <div className="flex items-center justify-center py-1">
                        <span
                          className="text-[10px] uppercase tracking-[0.15em] font-jb"
                          style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)' }}
                        >
                          Chat ended due to inactivity
                        </span>
                      </div>
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }} />
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ backgroundColor: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
                          <span
                            className="text-[9px] uppercase tracking-[0.2em]"
                            style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 25%, transparent)' }}
                          >
                            Disconnected from {name}
                          </span>
                        </div>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }} />
                      </div>
                    </React.Fragment>
                  );
                }

                // Reconnect marker → connected divider
                if (msg.content.startsWith("__RECONNECT__:")) {
                  const name = msg.content.slice("__RECONNECT__:".length);
                  return (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }} />
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-[5px] h-[5px] rounded-full animate-pulse" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                        <span
                          className="text-[9px] uppercase tracking-[0.2em]"
                          style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 25%, transparent)' }}
                        >
                          Connected to {name}
                        </span>
                      </div>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }} />
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className="max-w-[85%] rounded-sm px-3.5 py-2.5 text-[13px] leading-relaxed font-jb"
                      style={{
                        color: msg.role === "user"
                          ? `color-mix(in srgb, var(--theme-text, #fff) 90%, transparent)`
                          : `color-mix(in srgb, var(--theme-text, #fff) 70%, transparent)`,
                        ...(msg.role === "user"
                          ? {
                              border: '1px solid color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent)',
                              backgroundColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 12%, transparent)',
                            }
                          : {
                              border: `1px solid color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)`,
                              backgroundColor: `color-mix(in srgb, var(--theme-text, #fff) 4%, transparent)`,
                            }),
                      }}
                    >
                      {msg.role === "assistant" && (
                        <div className="text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: 'var(--theme-primary, #ef4242)' }}>
                          {agentName}
                        </div>
                      )}
                      {msg.role === "assistant" && isWelcome && i === 0 ? (
                        <TypewriterText text={welcomeText} onComplete={() => setWelcomeTyped(true)} />
                      ) : msg.role === "assistant" ? (
                        renderChatMarkdown(msg.content === "__WELCOME__" ? welcomeText : msg.content)
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                );
              })}

              {(welcomeStep === 3 || (streaming && messages[messages.length - 1]?.content === "")) && (
                <div className="flex justify-start">
                  <div
                    className="rounded-sm px-3.5 py-2.5"
                    style={{
                      border: '1px solid color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 4%, transparent)',
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--theme-primary, #ef4242)' }}>
                      {agentName}
                    </div>
                    <TypingIndicator />
                  </div>
                </div>
              )}

              {/* Reconnecting spinner (ephemeral, during reconnect flow) */}
              {reconnectStep === 1 && (
                <ConnectingTimer />
              )}

              {/* Suggestion chips — right-aligned, shown after welcome typewriter finishes */}
              {isWelcome && welcomeTyped && !streaming && !disconnected && (
                <div className="flex flex-wrap gap-1.5 mt-1 justify-end">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className={`text-[11px] px-3 py-1.5 rounded-sm border transition-all duration-200 cursor-pointer ${
                        isLight
                          ? 'border-black/10 bg-black/3 text-black/35 hover:border-black/20 hover:text-black/60'
                          : 'border-white/8 bg-white/3 text-white/30 hover:border-white/18 hover:text-white/60'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div
              className="relative z-10 px-5 py-3"
              style={{ borderTop: '1px solid color-mix(in srgb, var(--theme-primary, #ef4242) 12%, transparent)' }}
            >
              <div className={`flex items-center gap-2 rounded-sm px-3 py-1.5 transition-colors ${
                isLight
                  ? 'bg-black/4 border border-black/10 focus-within:border-black/25'
                  : 'bg-white/4 border border-white/10 focus-within:border-white/30'
              }`}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={disconnected ? "Type to reconnect..." : (welcomeStep > 0 && !welcomeTyped) ? "Please wait..." : "Ask something..."}
                  disabled={streaming || reconnectStep > 0 || (welcomeStep > 0 && !welcomeTyped)}
                  className={`flex-1 bg-transparent text-[13px] font-jb outline-none disabled:opacity-50 ${
                    isLight
                      ? 'text-black/80 placeholder:text-black/25'
                      : 'text-white placeholder:text-white/25'
                  }`}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={streaming || reconnectStep > 0 || !input.trim() || (welcomeStep > 0 && !welcomeTyped)}
                  style={{ color: 'var(--theme-primary, #ef4242)' }}
                  className={`h-7 w-7 rounded-sm flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'
                  }`}
                  aria-label="Send message"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
