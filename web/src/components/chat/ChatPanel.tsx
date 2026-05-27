"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Volume2, VolumeX, Mic, Square, Loader2, AudioLines, Lock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import dynamicImport from "next/dynamic";
import { useTheme, THEMES, type ThemeName } from "@/lib/ThemeContext";
import { readVisitorMemory, getDaypart, rememberTopic } from "@/lib/visitor-memory";
import type { ContactData, BookingData } from "@/components/chat/ChatActionCards";

const TOGGLE_EVENT = "mdcran:toggle-chat";
const MAX_MESSAGES = 20;
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const INACTIVITY_CHECK_MS = 15_000; // check every 15s

const AGENT_NAME = "Michael";

function pickAgentName(): string {
  return AGENT_NAME;
}

/** Strip markdown + action markers so only natural speech is sent to TTS. */
function stripForSpeech(text: string): string {
  return text
    .replace(/__(?:CONTACTCARD|BOOKINGCARD):[\s\S]*$/g, " ") // never read the card JSON aloud
    .replace(/__[A-Z]+:[^_]*__/g, " ")
    .replace(/__[A-Z]+__/g, " ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Render basic markdown: **bold**, *italic*, [text](url) */
function renderChatMarkdown(text: string, onNavigate?: (href: string) => void, showTakeMeThere: boolean = true): React.ReactNode[] {
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
      const href = match[7];
      const isInternal = href.startsWith("/");
      parts.push(
        <span key={match.index} className="inline">
          <a
            href={href}
            className="underline underline-offset-2 cursor-pointer"
            style={{ color: 'var(--theme-primary, #ef4242)' }}
            {...(isInternal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            onClick={isInternal && onNavigate ? (e) => { e.preventDefault(); onNavigate(href); } : undefined}
          >
            {match[6]}
          </a>
          {isInternal && onNavigate && showTakeMeThere && (
            <button
              type="button"
              className="ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] tracking-wide uppercase cursor-pointer transition-all duration-200 align-middle"
              style={{
                border: '1px solid color-mix(in srgb, var(--theme-primary, #ef4242) 40%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 12%, transparent)',
                color: 'var(--theme-primary, #ef4242)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-primary, #ef4242) 12%, transparent)';
              }}
              onClick={(e) => { e.preventDefault(); onNavigate(href); }}
            >
              Take me there →
            </button>
          )}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface SpeechResultEventLike {
  resultIndex: number;
  results: { length: number;[i: number]: { isFinal: boolean;[j: number]: { transcript: string } } };
}
interface SpeechRecognitionLike {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: SpeechResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  autoNavigated?: boolean;
  pendingHighlight?: string;
  images?: string[];
  projectCards?: string[];
  contactCard?: ContactData;
  bookingCard?: BookingData;
}

/** Extract unique external (http) URLs from an assistant message — both markdown links and bare URLs. */
function extractExternalLinks(text: string): string[] {
  const urls = new Set<string>();
  const mdLink = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdLink.exec(text)) !== null) urls.add(m[1]);
  // Bare URLs not already inside a markdown link
  const bare = /(?<!\]\()(?<!["'])https?:\/\/[^\s)<>"']+/g;
  let b: RegExpExecArray | null;
  while ((b = bare.exec(text)) !== null) urls.add(b[0].replace(/[.,;:]+$/, ""));
  return Array.from(urls).slice(0, 3);
}

const ChatProjectCard = dynamicImport(() => import("@/components/chat/ChatProjectCard"), { ssr: false });
const ChatLinkPreview = dynamicImport(() => import("@/components/chat/ChatLinkPreview"), { ssr: false });
const ChatContactCard = dynamicImport(() => import("@/components/chat/ChatActionCards").then((m) => m.ChatContactCard), { ssr: false });
const ChatBookingCard = dynamicImport(() => import("@/components/chat/ChatActionCards").then((m) => m.ChatBookingCard), { ssr: false });

const SUGGESTIONS = [
  "Break down what I'm looking at",
  "Show me your best project",
  "Are you available for hire?",
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

function TypewriterText({ text, speed = 18, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
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
  const router = useRouter();
  const { themeInfo, setTheme } = useTheme();
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
  const lastAgentMessageRef = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Voice (ElevenLabs TTS + STT) ── */
  const [voiceEnabled, setVoiceEnabled] = useState(true); // optimistic — buttons show instantly; probe corrects if unconfigured
  const [voiceOn, setVoiceOn] = useState(() => {           // user toggle for spoken replies — defaults OFF
    try { return typeof window !== "undefined" && localStorage.getItem("mdcran_voice_on") === "1"; } catch { return false; }
  });
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const voiceOnRef = useRef(false);
  voiceOnRef.current = voiceOn;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);

  /* Bottom-middle karaoke caption while reading a reply aloud (mirrors the tour). */
  const [capWords, setCapWords] = useState<string[]>([]);
  const [capIdx, setCapIdx] = useState(-1);
  const capRafRef = useRef<number | null>(null);
  /* Non-destructive hide while reading on mobile (keeps the chat log intact). */
  const [minimized, setMinimized] = useState(false);
  const minimizedRef = useRef(false);
  minimizedRef.current = minimized;
  /* End-chat confirmation prompt (the X asks before wiping the conversation). */
  const [confirmEnd, setConfirmEnd] = useState(false);

  /* Confirm voice availability in the background; correct the optimistic default if unconfigured. */
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/voice/tts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d) setVoiceEnabled(Boolean(d.enabled)); })
      .catch(() => {});
    return () => { active = false; };
  }, [open]);

  /* Voice CONVERSATION needs SpeechRecognition (Chrome/Edge/Safari) on top of TTS. */
  const [speechSupported, setSpeechSupported] = useState(true);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);
  const voiceAvailable = voiceEnabled && speechSupported;

  /* Keep the chat's speaker toggle in sync with the accessibility "speak aloud" pref. */
  useEffect(() => {
    const onA11y = (e: Event) => {
      const detail = (e as CustomEvent).detail as { speakAloud?: boolean } | undefined;
      if (detail && typeof detail.speakAloud === "boolean") setVoiceOn(detail.speakAloud);
    };
    window.addEventListener("mdcran:a11y", onA11y);
    return () => window.removeEventListener("mdcran:a11y", onA11y);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
    if (capRafRef.current) { cancelAnimationFrame(capRafRef.current); capRafRef.current = null; }
    setCapWords([]);
    setCapIdx(-1);
    setMinimized(false);
  }, []);

  /* Synthesize + play a reply via ElevenLabs (only when voice is toggled on).
     Drives a bottom-middle karaoke caption synced to the audio (same enthusiastic
     voice + word-highlighting as the guided tour). On mobile it minimizes the chat
     so the caption takes the stage, then restores it — WITHOUT clearing the log. */
  const speak = useCallback(async (text: string) => {
    if (!voiceOnRef.current) return;
    const clean = stripForSpeech(text);
    if (!clean) return;
    const words = clean.split(/\s+/);
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const stopKaraoke = () => { if (capRafRef.current) cancelAnimationFrame(capRafRef.current); capRafRef.current = null; };
    const endCaption = () => {
      stopKaraoke(); setCapWords([]); setCapIdx(-1);
      // On mobile: DON'T reopen the chat. Stay minimized and blink the bubble so the
      // user knows to tap it to pick up where they left off.
      if (isMobile && minimizedRef.current) window.dispatchEvent(new CustomEvent("mdcran:chat-attention"));
    };
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      // Show the caption + minimize on mobile right as audio starts.
      setCapWords(words);
      setCapIdx(0);
      if (isMobile) setMinimized(true);
      const sync = () => {
        const a = audioRef.current;
        if (!a) return;
        const d = a.duration && isFinite(a.duration) ? a.duration : words.length * 0.34;
        setCapIdx(Math.min(words.length - 1, Math.floor((a.currentTime / Math.max(d, 0.1)) * words.length)));
        if (!a.ended) capRafRef.current = requestAnimationFrame(sync);
      };
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); endCaption(); };
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); endCaption(); };
      setSpeaking(true);
      await audio.play();
      capRafRef.current = requestAnimationFrame(sync);
    } catch {
      setSpeaking(false);
      endCaption();
    }
  }, []);

  const isFirstVisit = (() => {
    try { return typeof window !== "undefined" && !localStorage.getItem("mdcran_tutorial_done"); } catch { return false; }
  })();

  const welcomeText = (() => {
    if (isFirstVisit) {
      return `Hey, I'm ${agentName} — welcome to my portfolio! I can walk you through my work, show off my most renowned projects, tell you about the clients and teams I've worked with, dig into my resume and experience, and even take you to any page you want to see. Want a quick tour, or is there something specific you're looking for?`;
    }
    // Already greeted earlier in THIS browser session → don't say "welcome back" again.
    // Just pick the chat back up naturally.
    const greetedThisSession = (() => { try { return typeof window !== "undefined" && sessionStorage.getItem("mdcran_greeted_session") === "1"; } catch { return false; } })();
    if (greetedThisSession) {
      const conts = [
        "What else can I help you with?",
        "What would you like to look at next?",
        "Back to it — what can I show you?",
        "Ask me anything else about my work.",
      ];
      return conts[agentName.length % conts.length];
    }
    // Returning visitors get a warmer, memory-aware welcome.
    const mem = readVisitorMemory();
    const part = getDaypart();
    const timeHi = part === "morning" ? "Good morning" : part === "evening" ? "Good evening" : part === "night" ? "Hey, up late" : "Hey there";
    if (mem.returning) {
      const backGreetings = mem.daysSinceLast >= 1
        ? [
            `${timeHi}! Welcome back — good to see you again. What can I help you with this time?`,
            `Hey, you're back! Want to pick up where you left off, or check out something new?`,
            `Welcome back! It's been a little while. Anything new you'd like to see in my work?`,
          ]
        : [
            `${timeHi} again! What else can I show you?`,
            `Back for more? Happy to keep going — what would you like to dig into?`,
            `Hey again! Ask me anything else about my work or the portfolio.`,
          ];
      const idx = (mem.visits + agentName.length) % backGreetings.length;
      return backGreetings[idx];
    }
    const greetings = [
      `Hey! I'm ${agentName} — ask me anything about my work, skills, or services.`,
      `Hi there! What would you like to know about my work?`,
      `Hey, I'm ${agentName}! Happy to show you around my portfolio.`,
      `Welcome! Feel free to ask me anything — or I can give you a quick tour.`,
      `Hi! Ready to chat. What can I help you with?`,
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

    // Connecting takes 1-4 seconds randomly
    const connectDelay = 1000 + Math.random() * 3000;
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
      lastAgentMessageRef.current = Date.now();
      try { sessionStorage.setItem("mdcran_greeted_session", "1"); } catch { /* */ }
      // (The tour is triggered by the chat bubble's first click — see ChatBubble — not here.)
      if (isFirstVisit) {
        try { localStorage.setItem("mdcran_tutorial_done", "1"); } catch { /* */ }
      }
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
              lastAgentMessageRef.current = Date.now();
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

  /* Inactivity timeout — sends farewell then disconnects */
  useEffect(() => {
    if (!open || disconnected || streaming || welcomeStep < 4) return;
    const currentAgent = agentName;
    let farewellSent = false;
    const check = setInterval(() => {
      const idleMs = Date.now() - lastAgentMessageRef.current;
      // Send farewell message 15s before disconnect
      if (!farewellSent && idleMs >= INACTIVITY_TIMEOUT_MS - 15_000) {
        farewellSent = true;
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "Looks like you may have stepped away. I'll be ending this chat shortly. Feel free to reach back out anytime!",
        }]);
      }
      if (idleMs >= INACTIVITY_TIMEOUT_MS) {
        setDisconnected(true);
        setMessages((prev) => [...prev, { role: "assistant", content: `__DISCONNECT__:${currentAgent}` }]);
      }
    }, INACTIVITY_CHECK_MS);
    return () => clearInterval(check);
  }, [open, disconnected, streaming, welcomeStep, agentName]);

  /* Reset chat state when panel closes — each open is a fresh session */
  useEffect(() => {
    if (open) return;
    // Small delay so exit animation finishes before state resets
    const t = setTimeout(() => {
      setMessages([]);
      setWelcomeStep(0);
      setWelcomeTyped(false);
      setInput("");
      setStreaming(false);
      setDisconnected(false);
      setReconnectStep(0);
      setAgentName(pickAgentName());
      welcomeCompletedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setSpeaking(false);
      if (capRafRef.current) { cancelAnimationFrame(capRafRef.current); capRafRef.current = null; }
      setCapWords([]);
      setCapIdx(-1);
      setMinimized(false);
      setConfirmEnd(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* */ } recognitionRef.current = null; }
      setRecording(false);
      setTranscribing(false);
    }, 500);
    return () => clearTimeout(t);
  }, [open]);

  /* Listen for toggle + explicit open/close events (e.g. from the tour).
     While MINIMIZED (reading aloud on mobile), a toggle/open restores the panel
     instead of closing — so clicking the bubble picks the chat back up with its
     history intact rather than ending the session. */
  useEffect(() => {
    const onToggle = () => { if (minimizedRef.current) { setMinimized(false); return; } setOpen((prev) => !prev); };
    const onOpen = () => { setMinimized(false); setOpen(true); };
    const onClose = () => setOpen(false);
    window.addEventListener(TOGGLE_EVENT, onToggle);
    window.addEventListener("mdcran:chat-open", onOpen);
    window.addEventListener("mdcran:chat-close", onClose);
    return () => {
      window.removeEventListener(TOGGLE_EVENT, onToggle);
      window.removeEventListener("mdcran:chat-open", onOpen);
      window.removeEventListener("mdcran:chat-close", onClose);
    };
  }, []);

  /* ESC asks to end the chat (same confirmation as the X) */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmEnd(true);
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

  // The X asks for confirmation first so the conversation isn't wiped by accident.
  const handleClose = () => setConfirmEnd(true);
  const confirmEndChat = () => {
    setConfirmEnd(false);
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT)); // actually close (triggers reset)
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
      lastAgentMessageRef.current = Date.now();
      await new Promise((r) => setTimeout(r, 400));
      // Now proceed with the message using the new agent name below
    }

    const userMsg: Message = { role: "user", content: text };
    rememberTopic(text);
    // Filter out system-type messages before sending to API
    const cleanMessages = messages.filter((m) =>
      m.content !== "__INACTIVITY__" &&
      m.content !== "__WELCOME__" &&
      !m.content.startsWith("__DISCONNECT__:") &&
      !m.content.startsWith("__RECONNECT__:") &&
      !m.content.startsWith("__BEHAVIOR__:")
    );
    const nextMessages = [...cleanMessages, userMsg].slice(-MAX_MESSAGES);

    setMessages((prev) => [...prev.filter((m) => m.content !== "__INACTIVITY__"), userMsg]);
    setInput("");
    setStreaming(true);

    // Read-aloud on mobile: minimize NOW so the reply doesn't visibly type into the
    // chat first — the user just sees the page + the spoken caption. Text still fills
    // the hidden panel for when they tap back in.
    if (voiceOnRef.current && typeof window !== "undefined" && window.innerWidth < 768) {
      setMinimized(true);
    }

    /* Placeholder assistant message for streaming */
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    const MAX_RETRIES = 3;

    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        abortRef.current = controller;

        let accumulated = "";
        let streamErrorDetail = "";
        const streamStartTime = Date.now();

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })), currentPage: pathname, agentName, memory: (() => { try { const m = readVisitorMemory(); return { visits: m.visits, returning: m.returning, daysSinceLast: m.daysSinceLast, daypart: getDaypart(), topics: m.topics }; } catch { return undefined; } })(), tone: (() => { try { return localStorage.getItem("mdcran_ai_tone") || undefined; } catch { return undefined; } })() }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => null) as { error?: string; detail?: string } | null;
            if (errData?.detail) console.warn("[chat] server error:", errData.detail);
            const errorMsg = res.status === 429
              ? "You've reached the message limit for today. Check back in a bit!"
              : "I'm having a little trouble responding right now — please try again in a moment.";
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: errorMsg,
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
                  if (parsed.error) {
                    streamErrorDetail = parsed.detail || parsed.error;
                    if (parsed.detail) console.warn("[chat] stream error:", parsed.detail);
                  }
                  if (parsed.text) {
                    /* Ensure typing dots show for at least 1s before text starts */
                    if (accumulated.length === 0) {
                      const elapsed = Date.now() - streamStartTime;
                      if (elapsed < 1000) {
                        await new Promise((r) => setTimeout(r, 1000 - elapsed));
                      }
                    }
                    /* Slow reveal: render one character at a time, hiding action markers */
                    for (const char of parsed.text) {
                      accumulated += char;
                      // Strip any complete or in-progress action markers from display
                      // Use space-aware replacement to avoid joining words across marker boundaries
                      const display = accumulated
                        .replace(/\s*__[A-Z]+:.+?__\s*/g, " ")  // complete arg markers → single space
                        .replace(/\s*__[A-Z]+__\s*/g, " ")       // complete no-arg markers (e.g. __RESETZOOM__)
                        .replace(/\s*__[A-Z]+:[^\n]*$/g, "")     // partial marker at end (still streaming)
                        .replace(/\s*__[A-Z]*$/g, "")             // partial opening __
                        .replace(/  +/g, " ")                      // collapse double spaces
                        .trim();
                      setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                          role: "assistant",
                          content: display,
                        };
                        return updated.slice(-MAX_MESSAGES);
                      });
                      // Don't delay rendering if we're inside a marker (invisible chars).
                      // When reading aloud, skip the per-char delay so the bubble fills fast
                      // and the spoken audio + karaoke caption start right as it writes.
                      const inMarker = /__[A-Z]/.test(accumulated) && !/__[A-Z]+:.+?__\s*$/.test(accumulated);
                      if (!inMarker && !voiceOnRef.current) {
                        await new Promise((r) => setTimeout(r, 8));
                      }
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

        /* Behavior flag — disconnect immediately */
        if (accumulated.trim().startsWith("__BEHAVIOR__")) {
          const currentAgent = agentName;
          setMessages((prev) => {
            // Remove the streaming assistant message, add behavior marker
            const withoutLast = prev.slice(0, -1);
            return [...withoutLast, { role: "assistant", content: `__BEHAVIOR__:${currentAgent}` }];
          });
          setDisconnected(true);
          return;
        }

        /* Process action markers + auto-navigation from markdown links */
        {
          let cleaned = accumulated;
          let hasMarkers = false;
          let didNavigate = false;
          let pendingHighlightTarget: string | undefined;
          let projectCards: string[] | undefined;
          let contactCard: ContactData | undefined;
          let bookingCard: BookingData | undefined;

          // Project card markers
          const cardMatches = [...cleaned.matchAll(/__PROJECTCARD:([\w-]+)__/g)].map((m) => m[1]);
          if (cardMatches.length) {
            hasMarkers = true;
            projectCards = cardMatches.slice(0, 2);
            cleaned = cleaned.replace(/\s*__PROJECTCARD:[\w-]+__\s*/g, " ");
          }

          // Contact-form card — AI collected the fields; render a pre-filled card to send.
          // The marker is the last thing in the reply; grab the JSON object after it (greedy
          // to the final brace) and strip everything from the marker to end.
          const contactMatch = cleaned.match(/__CONTACTCARD:\s*(\{[\s\S]*\})/);
          if (contactMatch) {
            hasMarkers = true;
            try { contactCard = JSON.parse(contactMatch[1]) as ContactData; } catch { /* ignore bad json */ }
            cleaned = cleaned.replace(/\s*__CONTACTCARD:[\s\S]*$/, " ");
          }

          // Booking card — AI collected details (+ optional preferred day/time).
          const bookingMatch = cleaned.match(/__BOOKINGCARD:\s*(\{[\s\S]*\})/);
          if (bookingMatch) {
            hasMarkers = true;
            try { bookingCard = JSON.parse(bookingMatch[1]) as BookingData; } catch { /* ignore bad json */ }
            cleaned = cleaned.replace(/\s*__BOOKINGCARD:[\s\S]*$/, " ");
          }

          // Theme change marker
          const themeMatch = cleaned.match(/__THEME:([\w-]+)__/);
          if (themeMatch) {
            hasMarkers = true;
            const themeId = themeMatch[1] as ThemeName;
            if (THEMES.some((t) => t.id === themeId)) {
              setTheme(themeId);
            }
            cleaned = cleaned.replace(/\s*__THEME:[\w-]+__\s*/g, " ");
          }

          // Text-size marker → drive the accessibility text scale
          const textSizeMatch = cleaned.match(/__TEXTSIZE:(normal|small|large|larger|largest)__/);
          if (textSizeMatch) {
            hasMarkers = true;
            const scale = { small: 0.9, normal: 1, large: 1.15, larger: 1.3, largest: 1.5 }[textSizeMatch[1]] ?? 1;
            cleaned = cleaned.replace(/\s*__TEXTSIZE:[a-z]+__\s*/g, " ");
            window.dispatchEvent(new CustomEvent("mdcran:a11y-set", { detail: { textScale: scale } }));
          }

          // Accessibility marker → constrained set of preference toggles
          const a11yMatches = [...cleaned.matchAll(/__ACCESS:([a-z-]+)__/g)].map((m) => m[1]);
          if (a11yMatches.length) {
            hasMarkers = true;
            cleaned = cleaned.replace(/\s*__ACCESS:[a-z-]+__\s*/g, " ");
            for (const a of a11yMatches) {
              const detail: Record<string, unknown> = {};
              if (a === "reset") detail.reset = true;
              else if (a === "motion-reduce") detail.motion = "reduce";
              else if (a === "motion-allow") detail.motion = "allow";
              else if (a === "readaloud-on") detail.speakAloud = true;
              else if (a === "readaloud-off") detail.speakAloud = false;
              else if (a.startsWith("cb-")) detail.colorblind = a.slice(3) === "none" ? "none" : a.slice(3);
              else if (a.startsWith("cursor-")) detail.cursor = a.slice(7);
              if (Object.keys(detail).length) window.dispatchEvent(new CustomEvent("mdcran:a11y-set", { detail }));
            }
          }

          // Navigation marker (explicit)
          const navMatch = cleaned.match(/__NAV:(\/.+?)__/);
          if (navMatch) {
            hasMarkers = true;
            const navPath = navMatch[1];
            cleaned = cleaned.replace(/\s*__NAV:\/.+?__\s*/g, " ");
            didNavigate = true;
            // Preload the target so it's ready by the time we push (no waiting on a blank page).
            try { router.prefetch(navPath.includes("#") ? navPath.split("#")[0] || "/" : navPath); } catch { /* */ }
            setTimeout(() => {
              const base = navPath.includes("#") ? navPath.split("#")[0] || "/" : navPath;
              router.push(base);
              if (navPath.includes("#")) {
                const hash = navPath.split("#")[1];
                setTimeout(() => {
                  const el = document.getElementById(hash) || document.querySelector(`[data-highlight-id="${hash}"]`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 800);
              }
            }, 600);
          }

          // Zoom + focus marker
          const zoomMatch = cleaned.match(/__ZOOM:(.+?)__/);
          if (zoomMatch) {
            hasMarkers = true;
            const zoomTarget = zoomMatch[1];
            cleaned = cleaned.replace(/\s*__ZOOM:.+?__\s*/g, " ");
            setTimeout(() => window.dispatchEvent(new CustomEvent("mdcran:zoom", { detail: zoomTarget })), 300);
          }

          // Emphasize (glassmorphism pop) marker
          const emphMatch = cleaned.match(/__EMPHASIZE:(.+?)__/);
          if (emphMatch) {
            hasMarkers = true;
            const emphTarget = emphMatch[1];
            cleaned = cleaned.replace(/\s*__EMPHASIZE:.+?__\s*/g, " ");
            setTimeout(() => window.dispatchEvent(new CustomEvent("mdcran:emphasize", { detail: emphTarget })), 300);
          }

          // Reset zoom / emphasis marker (no argument)
          if (/__RESETZOOM__/.test(cleaned)) {
            hasMarkers = true;
            cleaned = cleaned.replace(/\s*__RESETZOOM__\s*/g, " ");
            window.dispatchEvent(new CustomEvent("mdcran:resetzoom"));
          }

          // Guided multi-page projects walkthrough (no argument)
          if (/__PROJECTTOUR__/.test(cleaned)) {
            hasMarkers = true;
            cleaned = cleaned.replace(/\s*__PROJECTTOUR__\s*/g, " ");
            setTimeout(() => window.dispatchEvent(new CustomEvent("mdcran:run-projects-tour")), 500);
          }

          // Highlight marker — extract before auto-nav fallback so we know if one exists
          const highlightMatch = cleaned.match(/__HIGHLIGHT:(.+?)__/);
          if (highlightMatch) {
            hasMarkers = true;
            cleaned = cleaned.replace(/\s*__HIGHLIGHT:.+?__\s*/g, " ");
          }
          const highlightTarget = highlightMatch?.[1];

          // Fallback: auto-navigate from internal markdown links
          // Skip auto-nav if a __HIGHLIGHT__ is present — let the user click "Take me there" instead
          if (!didNavigate && !highlightTarget) {
            const linkRegex = /\[([^\]]+)\]\((\/[^)]+)\)/g;
            const internalLinks: string[] = [];
            let linkExec: RegExpExecArray | null;
            while ((linkExec = linkRegex.exec(cleaned)) !== null) {
              internalLinks.push(linkExec[2]);
            }
            // Auto-navigate if there's exactly one internal link
            if (internalLinks.length === 1) {
              const linkPath = internalLinks[0];
              didNavigate = true;
              try { router.prefetch(linkPath.includes("#") ? linkPath.split("#")[0] || "/" : linkPath); } catch { /* */ }
              setTimeout(() => {
                const base = linkPath.includes("#") ? linkPath.split("#")[0] || "/" : linkPath;
                router.push(base);
                if (linkPath.includes("#")) {
                  const hash = linkPath.split("#")[1];
                  setTimeout(() => {
                    const el = document.getElementById(hash) || document.querySelector(`[data-highlight-id="${hash}"]`);
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 800);
                }
              }, 600);
            }
          }

          // Handle highlight based on context
          if (highlightTarget) {
            if (didNavigate) {
              // Auto-navigating: fire highlight after page loads
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("mdcran:highlight", { detail: highlightTarget }));
              }, 1600);
            } else {
              // Check if there are internal links in the response (content on another page)
              const hasInternalLinks = /\[([^\]]+)\]\((\/[^)]+)\)/.test(cleaned);
              if (hasInternalLinks) {
                // Different page: store as pending — "Take me there" button click will trigger it
                pendingHighlightTarget = highlightTarget;
              } else {
                // Current page: fire highlight immediately
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("mdcran:highlight", { detail: highlightTarget }));
                }, 300);
              }
            }
          }

          // Update the displayed message with markers stripped + flags
          if (hasMarkers || didNavigate || pendingHighlightTarget || projectCards || contactCard || bookingCard) {
            cleaned = cleaned.replace(/  +/g, " ").trim();
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: cleaned,
                autoNavigated: didNavigate,
                pendingHighlight: pendingHighlightTarget,
                projectCards,
                contactCard,
                bookingCard,
              };
              return updated;
            });
          }
        }

        /* Got a real response */
        if (accumulated.replace(/__[A-Z]+:.+?__/g, "").trim()) {
          void speak(accumulated);
          break;
        }

        /* Stream surfaced an explicit error — show a friendly message (log the detail) */
        if (streamErrorDetail) {
          console.warn("[chat] stream error:", streamErrorDetail);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: "I'm having a little trouble responding right now — please try again in a moment." };
            return updated;
          });
          break;
        }

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
      lastAgentMessageRef.current = Date.now();
    }
  }, [input, streaming, messages, pathname, disconnected, reconnectStep, agentName, speak]);

  /* ── Microphone recording — live transcription (SpeechRecognition) with STT fallback ── */
  const startRecording = useCallback(async () => {
    if (recording || transcribing || streaming) return;
    stopSpeaking();

    // Preferred: Web Speech API → real-time interim words straight into the input box.
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        let finalText = "";
        rec.onresult = (e: SpeechResultEventLike) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            const t = r[0]?.transcript ?? "";
            if (r.isFinal) finalText += t + " "; else interim += t;
          }
          setInput((finalText + interim).replace(/\s+/g, " ").trimStart());
        };
        rec.onerror = () => { /* transient */ };
        rec.onend = () => {
          recognitionRef.current = null;
          setRecording(false);
          const toSend = finalText.trim();
          if (toSend) void handleSend(toSend);
        };
        recognitionRef.current = rec as unknown as { stop: () => void; abort: () => void };
        rec.start();
        setRecording(true);
        return;
      } catch {
        recognitionRef.current = null;
        /* fall through to MediaRecorder */
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size === 0) return;
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.set("file", blob, "recording.webm");
          const res = await fetch("/api/voice/stt", { method: "POST", body: fd });
          const data = await res.json().catch(() => null);
          const transcript = typeof data?.text === "string" ? data.text.trim() : "";
          if (transcript) void handleSend(transcript);
        } catch {
          /* ignore */
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      /* mic permission denied or unavailable */
      setRecording(false);
    }
  }, [recording, transcribing, streaming, stopSpeaking, handleSend]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* */ } // onend fires → sends transcript
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isWelcome = welcomeStep === 4 && messages.length === 1 && messages[0].content === "__WELCOME__";

  return (
    <>
      {/* Bottom-middle karaoke caption while reading a reply aloud (mirrors the tour). */}
      <AnimatePresence>
        {capWords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-8 left-1/2 z-[80] -translate-x-1/2 w-[min(92vw,46rem)] px-4 pointer-events-none"
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
              {capWords.map((word, i) => {
                const isCurrent = i === capIdx; const spoken = i <= capIdx;
                return (
                  <span key={i} style={
                    isCurrent
                      ? { color: "#fff", fontWeight: 700, textShadow: "0 0 12px rgba(255,255,255,0.85), 0 0 22px color-mix(in srgb, var(--theme-primary, #ef4242) 60%, transparent)" }
                      : spoken ? { color: "rgba(255,255,255,0.82)" } : { color: "rgba(255,255,255,0.34)" }
                  }>{word}{i < capWords.length - 1 ? " " : ""}</span>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End-chat confirmation */}
      <AnimatePresence>
        {confirmEnd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => setConfirmEnd(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-xs rounded-sm border p-5 text-center ${isLight ? "bg-white" : "bg-[#0c0c0e]"}`}
              style={{ borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
            >
              <p className="font-jb text-[14px] mb-1" style={{ color: isLight ? "#111" : "#fff" }}>End this chat?</p>
              <p className="font-jb text-[12px] mb-4" style={{ color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>Your conversation will be cleared.</p>
              <div className="flex gap-2">
                <button
                  type="button" onClick={() => setConfirmEnd(false)}
                  className={`flex-1 h-9 rounded-sm border text-[12px] font-medium cursor-pointer transition-colors ${isLight ? "border-black/15 text-black/70 hover:bg-black/5" : "border-white/15 text-white/70 hover:bg-white/5"}`}
                >
                  No, keep chatting
                </button>
                <button
                  type="button" onClick={confirmEndChat}
                  className="flex-1 h-9 rounded-sm text-[12px] font-medium text-white cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: "var(--theme-primary, #ef4242)" }}
                >
                  Yes, end
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      {open && !minimized && (
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
          className="fixed bottom-20 right-6 z-[70] flex flex-col w-[min(calc(100vw-2rem),22rem)] max-h-[80vh]"
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
              className="relative z-10 pl-5 pr-12 py-3 flex items-center gap-2"
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

              {voiceAvailable ? (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT)); // close the text panel
                    window.dispatchEvent(new CustomEvent("mdcran:voice-open")); // open voice chat
                  }}
                  className={`ml-auto flex h-7 items-center gap-1.5 px-2 rounded-sm border transition-colors cursor-pointer ${
                    isLight ? 'border-black/10 text-black/45 hover:border-black/25 hover:text-black' : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white'
                  }`}
                  style={{ borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 35%, transparent)' }}
                  title="Switch to voice conversation"
                  aria-label="Switch to voice conversation"
                >
                  <AudioLines size={13} style={{ color: 'var(--theme-primary, #ef4242)' }} />
                  <span className="text-[9px] uppercase tracking-[0.15em]">Switch to voice</span>
                </button>
              ) : (
                <span
                  className={`ml-auto flex h-7 items-center gap-1.5 px-2 rounded-sm border cursor-not-allowed opacity-70 ${
                    isLight ? 'border-black/10 text-black/35' : 'border-white/10 text-white/35'
                  }`}
                  title={voiceEnabled ? "Voice chat needs Chrome, Edge, or Safari" : "Voice chat isn't available right now"}
                  aria-label="Voice chat unavailable"
                >
                  <Lock size={12} />
                  <span className="text-[9px] uppercase tracking-[0.15em]">Switch to voice</span>
                </span>
              )}
              {voiceEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceOn((v) => {
                      const next = !v;
                      if (v) stopSpeaking();
                      try { localStorage.setItem("mdcran_voice_on", next ? "1" : "0"); } catch { /* */ }
                      return next;
                    });
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-sm border transition-colors cursor-pointer ${
                    isLight ? 'border-black/10 hover:border-black/25' : 'border-white/10 hover:border-white/25'
                  }`}
                  style={voiceOn ? { color: 'var(--theme-primary, #ef4242)', borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 45%, transparent)' } : { color: 'color-mix(in srgb, var(--theme-text, #fff) 35%, transparent)' }}
                  title={voiceOn ? "Voice replies on" : "Voice replies off"}
                  aria-label={voiceOn ? "Turn voice replies off" : "Turn voice replies on"}
                >
                  {voiceOn ? (
                    <Volume2 size={13} className={speaking ? "animate-pulse" : ""} />
                  ) : (
                    <VolumeX size={13} />
                  )}
                </button>
              )}
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

                // Behavior disconnect marker → status text + divider
                if (msg.content.startsWith("__BEHAVIOR__:")) {
                  const name = msg.content.slice("__BEHAVIOR__:".length);
                  return (
                    <React.Fragment key={i}>
                      <div className="flex items-center justify-center py-1">
                        <span
                          className="text-[10px] uppercase tracking-[0.15em] font-jb"
                          style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)' }}
                        >
                          Chat ended due to User Behavior
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
                        <>
                          {renderChatMarkdown(
                            msg.content === "__WELCOME__" ? welcomeText : msg.content,
                            (href) => {
                              router.push(href);
                              if (msg.pendingHighlight) {
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent("mdcran:highlight", { detail: msg.pendingHighlight }));
                                }, 1200);
                              }
                            },
                            !msg.autoNavigated,
                          )}
                          {msg.projectCards?.map((pid) => (
                            <ChatProjectCard key={pid} projectId={pid} onNavigate={(href) => router.push(href)} />
                          ))}
                          {msg.contactCard && <ChatContactCard data={msg.contactCard} />}
                          {msg.bookingCard && <ChatBookingCard data={msg.bookingCard} />}
                          {extractExternalLinks(msg.content === "__WELCOME__" ? "" : msg.content).map((u) => (
                            <ChatLinkPreview key={u} url={u} />
                          ))}
                        </>
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
                {voiceEnabled && (
                  <button
                    onClick={() => (recording ? stopRecording() : startRecording())}
                    disabled={streaming || transcribing || reconnectStep > 0 || (welcomeStep > 0 && !welcomeTyped)}
                    style={recording ? { color: '#ef4444' } : { color: 'color-mix(in srgb, var(--theme-text, #fff) 45%, transparent)' }}
                    className={`h-7 w-7 rounded-sm flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'
                    }`}
                    aria-label={recording ? "Stop recording" : "Record voice message"}
                    title={recording ? "Stop and send" : "Speak"}
                  >
                    {transcribing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : recording ? (
                      <Square size={13} className="animate-pulse" fill="#ef4444" />
                    ) : (
                      <Mic size={14} />
                    )}
                  </button>
                )}
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
    </>
  );
}
