"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Stable arrays to avoid hydration mismatch from Math.random()
const particles = [
  { left: 12, top: 18, drift: -65, dur: 3.2, delay: 0.3 },
  { left: 28, top: 55, drift: -80, dur: 4.1, delay: 1.2 },
  { left: 45, top: 30, drift: -52, dur: 3.8, delay: 2.5 },
  { left: 62, top: 70, drift: -90, dur: 5.0, delay: 0.8 },
  { left: 78, top: 22, drift: -58, dur: 3.5, delay: 3.1 },
  { left: 88, top: 48, drift: -72, dur: 4.4, delay: 1.8 },
  { left: 35, top: 82, drift: -60, dur: 3.9, delay: 4.0 },
  { left: 55, top: 15, drift: -85, dur: 5.2, delay: 0.5 },
  { left: 20, top: 65, drift: -55, dur: 3.3, delay: 2.0 },
  { left: 72, top: 40, drift: -78, dur: 4.6, delay: 3.5 },
  { left: 90, top: 75, drift: -62, dur: 3.7, delay: 1.5 },
  { left: 8, top: 50, drift: -70, dur: 4.8, delay: 2.8 },
];

const quips = [
  "You've wandered into the void. It's cozy here, but there's nothing to see.",
  "This page ran away. We're not sure why. It left no note.",
  "Plot twist: this page was the friends we made along the way. Just kidding, it's gone.",
  "You found the secret room! Unfortunately, it's empty.",
  "This URL is giving 'I made that up and hoped for the best.'",
  "Somewhere, a developer is pretending this was intentional.",
  "The page you're looking for is in another castle.",
  "Error 404: page not found. Confidence? Also not found.",
  "You've reached the edge of the internet. Please make a U-turn.",
  "I checked everywhere. Under the couch cushions. Nothing.",
];

const glitchChars = "!@#$%^&*01<?>/\\|[]{}";

function GlitchText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true);
      let ticks = 0;
      const glitchInterval = setInterval(() => {
        setDisplay(
          text
            .split("")
            .map((ch) =>
              Math.random() < 0.4
                ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
                : ch
            )
            .join("")
        );
        ticks++;
        if (ticks > 6) {
          clearInterval(glitchInterval);
          setDisplay(text);
          setGlitching(false);
        }
      }, 50);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={glitching ? "text-[#ef4242]" : ""} style={{ transition: "color 0.1s" }}>
      {display}
    </span>
  );
}

export default function NotFound() {
  const [quipIndex, setQuipIndex] = useState(0);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    setQuipIndex(Math.floor(Math.random() * quips.length));
  }, []);

  const cycleQuip = () => {
    setQuipIndex((i) => (i + 1) % quips.length);
    setClicks((c) => c + 1);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[var(--navbar-height)]">
        <section className="relative overflow-hidden border-b border-white/6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,66,66,0.14),transparent_42%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)]" />

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {particles.map((p, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-[#ef4242]"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  opacity: 0,
                }}
                animate={{
                  opacity: [0, 0.3, 0],
                  scale: [0, 1.5, 0],
                  y: [0, p.drift],
                }}
                transition={{
                  duration: p.dur,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <div className="content-container relative py-24 sm:py-32 md:py-40 flex flex-col items-center text-center">
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[11px] tracking-[0.25em] uppercase text-[#ef4242] mb-5"
            >
              Page Not Found
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-nord text-[5.5rem] sm:text-[8rem] md:text-[11rem] leading-none text-white select-none"
              style={{ textShadow: "0 0 50px rgba(239,66,66,0.16)" }}
            >
              <GlitchText text="404" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-6 font-nord text-2xl sm:text-3xl text-white tracking-wider"
            >
              Well, this is awkward.
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-4 max-w-xl"
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={quipIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm sm:text-base text-white/45 leading-relaxed cursor-pointer"
                  onClick={cycleQuip}
                  title="Click for another one"
                >
                  {quips[quipIndex]}
                </motion.p>
              </AnimatePresence>
              {clicks > 0 && (
                <p className="mt-2 text-[10px] text-white/20 tracking-wider">
                  click for more wisdom
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-3"
            >
              <Link
                href="/"
                className="inline-flex items-center justify-center h-11 px-6 text-[11px] tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors shadow-[0_0_24px_rgba(239,66,66,0.28)]"
              >
                Go Home
              </Link>
              <Link
                href="/work"
                className="inline-flex items-center justify-center h-11 px-6 text-[11px] tracking-widest uppercase border border-white/12 text-white/55 rounded-sm hover:border-white/20 hover:text-white transition-colors"
              >
                Browse Work
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center h-11 px-6 text-[11px] tracking-widest uppercase border border-white/12 text-white/55 rounded-sm hover:border-white/20 hover:text-white transition-colors"
              >
                Contact
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 text-[10px] text-white/15 tracking-wider"
            >
              Error code: 404 &middot; {new Date().toISOString().slice(0, 10)} &middot; nice try though
            </motion.p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
