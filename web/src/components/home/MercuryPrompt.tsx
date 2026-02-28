"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Star, X } from "lucide-react";
import ChromaKeyVideo from "./ChromaKeyVideo";

const REVEAL_DELAY_MS = 2000;
const COUNTDOWN_SECONDS = 30;
const VIDEO_REVEAL_DELAY_MS = 520;
const COLLAPSE_DELAY_MS = 220;
const REDACTION_TRIGGER_SECONDS = 1;
const REDACTION_DURATION_MS = 900;
const STORAGE_KEY = "mdcran_mercury_prompt_seen_v1";

export default function MercuryPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCollapsedTrigger, setShowCollapsedTrigger] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const closeTimerRef = useRef<number | null>(null);
  const videoTimerRef = useRef<number | null>(null);
  const redactTimerRef = useRef<number | null>(null);

  const startExpand = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setSecondsLeft(COUNTDOWN_SECONDS);
    setShowVideo(false);
    setIsClosing(false);
    setIsRedacting(false);
    setIsCollapsed(false);
    setShowCollapsedTrigger(false);
    setIsVisible(true);
  }, []);

  const startCollapse = useCallback(() => {
    if (isClosing || isRedacting) return;

    if (videoTimerRef.current !== null) {
      window.clearTimeout(videoTimerRef.current);
      videoTimerRef.current = null;
    }

    setIsClosing(true);
    setShowVideo(false);

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setIsCollapsed(true);
      setIsClosing(false);
      setIsRedacting(false);
      closeTimerRef.current = null;
    }, COLLAPSE_DELAY_MS);
  }, [isClosing, isRedacting]);

  const startRedaction = useCallback(() => {
    if (isClosing || isRedacting) return;

    if (videoTimerRef.current !== null) {
      window.clearTimeout(videoTimerRef.current);
      videoTimerRef.current = null;
    }

    setIsRedacting(true);
    setShowVideo(false);
    setSecondsLeft(0);

    if (redactTimerRef.current !== null) {
      window.clearTimeout(redactTimerRef.current);
    }

    redactTimerRef.current = window.setTimeout(() => {
      setIsRedacting(false);
      startCollapse();
      redactTimerRef.current = null;
    }, REDACTION_DURATION_MS);
  }, [isClosing, isRedacting, startCollapse]);

  useEffect(() => {
    if (isVisible || isCollapsed) return;

    const hasSeenPrompt = window.localStorage.getItem(STORAGE_KEY) === "true";
    if (hasSeenPrompt) {
      const seenTimer = window.setTimeout(() => {
        setIsCollapsed(true);
        setShowCollapsedTrigger(true);
      }, 0);
      return () => window.clearTimeout(seenTimer);
    }

    const timer = window.setTimeout(() => {
      startExpand();
      window.localStorage.setItem(STORAGE_KEY, "true");
    }, REVEAL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isVisible, isCollapsed, startExpand]);

  useEffect(() => {
    if (!isVisible || isClosing || isRedacting) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= REDACTION_TRIGGER_SECONDS) {
          window.clearInterval(interval);
          startRedaction();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isVisible, isClosing, isRedacting, startRedaction]);

  useEffect(() => {
    if (!isVisible || isClosing || isRedacting) return;

    videoTimerRef.current = window.setTimeout(() => {
      setShowVideo(true);
      videoTimerRef.current = null;
    }, VIDEO_REVEAL_DELAY_MS);

    return () => {
      if (videoTimerRef.current !== null) {
        window.clearTimeout(videoTimerRef.current);
        videoTimerRef.current = null;
      }
    };
  }, [isVisible, isClosing, isRedacting]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (videoTimerRef.current !== null) {
        window.clearTimeout(videoTimerRef.current);
      }
      if (redactTimerRef.current !== null) {
        window.clearTimeout(redactTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <AnimatePresence
        onExitComplete={() => {
          if (isCollapsed) {
            setShowCollapsedTrigger(true);
          }
        }}
      >
        {isVisible && (
        <motion.aside
          initial={{ opacity: 0, y: 34, x: 18, scale: 0.92, filter: "blur(10px)" }}
          animate={{
            opacity: [0.18, 1, 0.82, 1],
            y: [24, -4, 2, 0],
            x: [14, -8, 4, 0],
            scale: [0.96, 1.02, 0.995, 1],
            filter: ["blur(8px)", "blur(0px)", "blur(1px)", "blur(0px)"],
          }}
          exit={{
            opacity: [1, 0.76, 0.92, 0],
            y: [0, 2, -3, 26],
            x: [0, 6, -5, 12],
            scale: [1, 1.01, 0.98, 0.92],
            filter: ["blur(0px)", "blur(1px)", "blur(0px)", "blur(7px)"],
          }}
          transition={{ duration: 0.48, times: [0, 0.42, 0.7, 1], ease: "easeOut" }}
          className="fixed bottom-5 right-5 z-50 w-[min(calc(100vw-2rem),22rem)]"
        >
          <AnimatePresence>
            {showVideo && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.94, filter: "blur(6px)" }}
                animate={{
                  opacity: [0.2, 1, 0.88, 1],
                  y: [10, -2, 1, 0],
                  x: [6, -3, 1, 0],
                  scale: [0.96, 1.02, 0.99, 1],
                  filter: ["blur(5px)", "blur(0px)", "blur(1px)", "blur(0px)"],
                }}
                exit={{
                  opacity: [1, 0.7, 0.96, 0],
                  y: [0, 2, -2, 10],
                  x: [0, 4, -3, 6],
                  filter: ["blur(0px)", "blur(1px)", "blur(0px)", "blur(5px)"],
                }}
                transition={{ duration: 0.34, times: [0, 0.45, 0.75, 1], ease: "easeOut" }}
                className="pointer-events-none absolute -top-44 left-0 z-0 w-56 sm:-top-48 sm:left-1 sm:w-64"
              >
                <ChromaKeyVideo src="/cropped.mp4" className="w-full opacity-95" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 min-h-[30rem] overflow-hidden rounded-sm border border-[#f4c542]/25 bg-[#080808]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_30px_rgba(244,197,66,0.08)] backdrop-blur-xl">
            <div
              className="absolute inset-0 opacity-80 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(244,197,66,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(244,197,66,0.05) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(244,197,66,0.18) 0%, rgba(244,197,66,0.04) 28%, transparent 62%)",
              }}
            />
            <AnimatePresence>
              {isRedacting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.2, 0.9, 0.55, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, times: [0, 0.35, 0.7, 1], ease: "easeOut" }}
                  className="absolute inset-0 z-20 pointer-events-none"
                >
                  <div className="absolute inset-0 bg-black/78" />
                  <motion.div
                    animate={{
                      opacity: [0.2, 0.6, 0.35, 0.55],
                      x: [0, -3, 2, 0],
                    }}
                    transition={{ duration: 0.18, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(244,197,66,0.08)_48%,transparent_100%)]"
                  />
                  {[12, 20, 16, 24, 14, 18, 22, 15].map((height, index) => (
                    <motion.div
                      key={`${height}-${index}`}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{
                        scaleX: [0.12, 1.02, 0.88, 1],
                        opacity: [0, 1, 0.72, 1],
                        x: [0, index % 2 === 0 ? 6 : -6, index % 2 === 0 ? -2 : 2, 0],
                      }}
                      transition={{
                        duration: 0.24,
                        delay: index * 0.045,
                        times: [0, 0.4, 0.75, 1],
                        ease: "easeOut",
                      }}
                      className="mx-5 my-2.5 origin-left rounded-[2px] bg-black"
                      style={{ height }}
                    />
                  ))}
                  {[0, 1, 2, 3].map((index) => (
                    <motion.div
                      key={`stamp-${index}`}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -12 : 12 }}
                      animate={{
                        opacity: [0, 0.9, 0.4, 0.85],
                        x: [index % 2 === 0 ? -10 : 10, index % 2 === 0 ? 4 : -4, 0],
                        y: [0, index % 2 === 0 ? -2 : 2, 0],
                      }}
                      transition={{
                        duration: 0.26,
                        delay: 0.08 + index * 0.08,
                        times: [0, 0.4, 0.72, 1],
                        ease: "easeOut",
                      }}
                      className="absolute left-6 right-6 flex justify-center"
                      style={{ top: `${20 + index * 16}%` }}
                    >
                      <span className="border border-[#f4c542]/25 bg-black px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-[#f4c542]/80">
                        Redacted
                      </span>
                    </motion.div>
                  ))}
                  <motion.div
                    animate={{
                      opacity: [0, 0.35, 0.15, 0.28],
                      clipPath: [
                        "inset(8% 0 72% 0)",
                        "inset(34% 0 40% 0)",
                        "inset(62% 0 14% 0)",
                        "inset(18% 0 58% 0)",
                      ],
                    }}
                    transition={{ duration: 0.22, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-[#f4c542]"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: [0, 1, 0.8, 1], y: [8, 0, 1, 0] }}
                    transition={{ duration: 0.28, delay: 0.18, times: [0, 0.45, 0.75, 1] }}
                    className="absolute inset-x-0 bottom-10 text-center text-[11px] uppercase tracking-[0.28em] text-[#f4c542]/75"
                  >
                    [REDACTED]
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute top-0 left-0 h-8 w-8 border-l border-t border-[#f4c542]/55 pointer-events-none" />
            <div className="absolute top-0 right-0 h-8 w-8 border-r border-t border-[#f4c542]/55 pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-8 w-8 border-l border-b border-[#f4c542]/35 pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-8 w-8 border-r border-b border-[#f4c542]/35 pointer-events-none" />

            <button
              type="button"
              aria-label="Dismiss Project Mercury prompt"
              onClick={startRedaction}
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-black/30 text-white/35 transition-colors hover:border-[#f4c542]/35 hover:text-[#f4c542]"
            >
              <X size={14} />
            </button>

            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-sm border border-[#f4c542]/18 bg-[#f4c542]/6 px-3 py-1.5">
                  <Star size={11} className="text-[#f4c542]/85" fill="currentColor" />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[#f4c542]/80">
                    Army Reserve
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.22em] text-white/22">
                  USAR
                </span>
              </div>

              <h2 className="font-nord pr-10 text-2xl leading-tight tracking-wide text-white sm:text-[1.8rem]">
                Have you Heard About Project Mercury?
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-white/55">
                Mercury is a web/mobile secure software platform developed in collaboration
                with the U.S. Army Reserve to modernize and streamline administrative
                workflows.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.24em] text-white/22">
                    Sponsors
                  </div>
                  <div className="mt-1.5 text-[12px] tracking-[0.08em] text-white/42">
                    Army Reserve
                  </div>
                </div>

                <div>
                  <div className="text-[9px] uppercase tracking-[0.24em] text-white/22">
                    Credits
                  </div>
                  <div className="mt-1.5 text-[12px] tracking-[0.08em] text-white/42">
                    UCF Mercury Team
                  </div>
                </div>
              </div>

              <Link
                href="/code/army-reserve-mercury"
                className="group mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-white/12 bg-white/4 px-5 text-xs uppercase tracking-[0.2em] text-white/78 transition-all duration-200 hover:border-[#f4c542]/30 hover:bg-[#f4c542]/8 hover:text-white"
              >
                Learn More
                <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <div className="mt-6 border-t border-[#f4c542]/12 pt-3">
                <div className="text-center text-[10px] uppercase tracking-[0.22em] text-white/24">
                  {isRedacting
                    ? "Confidential file now auto-redacting..."
                    : `Redacting in ${secondsLeft}...`}
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCollapsedTrigger && isCollapsed && !isVisible && (
          <>
            <motion.button
              type="button"
              aria-label="Reopen Project Mercury prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => {
                startExpand();
              }}
              className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-sm border border-white/12 bg-[#0d0d0d] text-[#f4c542] shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all duration-200 hover:border-[#f4c542]/45 hover:bg-[#f4c542]/8 hover:shadow-[0_4px_24px_rgba(244,197,66,0.14)]"
            >
              <Star size={14} fill="currentColor" />
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
