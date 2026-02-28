"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";

const starField = [
  { top: "6%", left: "8%", size: 2, delay: 0.1, duration: 5.4 },
  { top: "11%", left: "22%", size: 1, delay: 0.8, duration: 4.8 },
  { top: "9%", left: "74%", size: 2, delay: 1.3, duration: 5.9 },
  { top: "16%", left: "88%", size: 1, delay: 0.5, duration: 4.4 },
  { top: "22%", left: "14%", size: 1, delay: 1.7, duration: 5.1 },
  { top: "28%", left: "31%", size: 2, delay: 0.2, duration: 6.2 },
  { top: "24%", left: "62%", size: 1, delay: 1.1, duration: 4.9 },
  { top: "34%", left: "81%", size: 2, delay: 0.9, duration: 5.7 },
  { top: "41%", left: "9%", size: 1, delay: 1.5, duration: 4.6 },
  { top: "47%", left: "25%", size: 2, delay: 0.4, duration: 5.8 },
  { top: "44%", left: "71%", size: 1, delay: 1.9, duration: 4.7 },
  { top: "56%", left: "86%", size: 2, delay: 0.7, duration: 5.5 },
  { top: "63%", left: "18%", size: 1, delay: 1.2, duration: 4.5 },
  { top: "69%", left: "42%", size: 2, delay: 0.3, duration: 6.1 },
  { top: "66%", left: "66%", size: 1, delay: 1.6, duration: 5.2 },
  { top: "78%", left: "91%", size: 2, delay: 0.6, duration: 5.6 },
  { top: "84%", left: "12%", size: 1, delay: 1.2, duration: 4.9 },
  { top: "89%", left: "58%", size: 2, delay: 0.9, duration: 5.8 },
];

const lensFlares = [
  {
    top: "14%",
    left: "16%",
    width: "18rem",
    height: "18rem",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(34,211,238,0.05) 18%, rgba(34,211,238,0.02) 38%, transparent 68%)",
    duration: 11,
    delay: 0.4,
  },
  {
    top: "38%",
    right: "10%",
    width: "22rem",
    height: "22rem",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(239,68,68,0.05) 16%, rgba(239,68,68,0.018) 36%, transparent 68%)",
    duration: 13,
    delay: 1.1,
  },
  {
    top: "71%",
    left: "28%",
    width: "20rem",
    height: "20rem",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.045) 0%, rgba(163,230,53,0.04) 18%, rgba(163,230,53,0.016) 40%, transparent 70%)",
    duration: 12,
    delay: 2.2,
  },
];

const glitchWords = [
  "AI", "Neural", "Quantum", "Engineer", "Developer",
  "Architect", "Creator", "Pioneer", "Inference", "Deploy",
  "Automate", "LLM", "GPU", "Vector", "Embed",
  "Compile", "Iterate", "Predict", "Diffuse", "Agent",
  "Runtime", "Pipeline", "Tokenize", "Fine-tune", "Synth",
  "Coder", "Optimizer", "Builder", "Next-Gen", "Designer",
  "System", "Model", "Prompt", "Network", "Debug",
];

// 8 vivid neon palettes — color stays vivid, glow is subtle
const neonStyles = [
  {
    border: "rgba(255,0,200,0.55)",
    background: "rgba(20,0,15,0.4)",
    text: "#ff00cc",
    glow: "0 0 7px rgba(255,0,200,0.25)",
    particle: "#ff00cc",
    particleB: "#ff88ee",
  },
  {
    border: "rgba(0,160,255,0.55)",
    background: "rgba(0,10,25,0.4)",
    text: "#00aaff",
    glow: "0 0 7px rgba(0,160,255,0.25)",
    particle: "#00aaff",
    particleB: "#66ccff",
  },
  {
    border: "rgba(0,255,65,0.48)",
    background: "rgba(0,15,5,0.4)",
    text: "#00ff41",
    glow: "0 0 7px rgba(0,255,65,0.22)",
    particle: "#00ff41",
    particleB: "#66ffaa",
  },
  {
    border: "rgba(0,255,255,0.48)",
    background: "rgba(0,15,15,0.4)",
    text: "#00ffff",
    glow: "0 0 7px rgba(0,255,255,0.2)",
    particle: "#00ffff",
    particleB: "#88ffff",
  },
  {
    border: "rgba(255,30,30,0.6)",
    background: "rgba(25,0,0,0.4)",
    text: "#ff2222",
    glow: "0 0 7px rgba(255,30,30,0.25)",
    particle: "#ff3333",
    particleB: "#ff9999",
  },
  {
    border: "rgba(180,0,255,0.55)",
    background: "rgba(15,0,25,0.4)",
    text: "#cc00ff",
    glow: "0 0 7px rgba(180,0,255,0.25)",
    particle: "#cc00ff",
    particleB: "#ee66ff",
  },
  {
    border: "rgba(255,110,0,0.58)",
    background: "rgba(20,8,0,0.4)",
    text: "#ff7700",
    glow: "0 0 7px rgba(255,110,0,0.25)",
    particle: "#ff8800",
    particleB: "#ffcc44",
  },
  {
    border: "rgba(210,255,0,0.48)",
    background: "rgba(15,20,0,0.4)",
    text: "#ccff00",
    glow: "0 0 7px rgba(210,255,0,0.2)",
    particle: "#ccff00",
    particleB: "#eeff88",
  },
];

// Pixel-dust explosion: mostly 1×1 dots, some tiny oblongs, few short streaks
function getShape(i: number): { h: number; w: number; rounded: boolean } {
  if (i % 8 === 0) return { h: 1, w: 4, rounded: false }; // short streak  (~4 of 36)
  if (i % 6 === 1) return { h: 1, w: 2, rounded: true };  // tiny oblong   (~6 of 36)
  if (i % 9 === 2) return { h: 1.5, w: 1.5, rounded: true }; // small dot  (~4 of 36)
  return { h: 1, w: 1, rounded: true };                    // pixel dot    (~22 of 36)
}

// Hand-picked distances — very irregular, mimics a real shatter
const BURST_DISTS = [
  42, 18, 72, 28, 60, 12, 82, 35, 55, 22, 68, 45,
  15, 78, 32, 50, 88, 24, 64, 38, 70, 16, 56, 40,
  85, 20, 62, 30, 74, 10, 48, 58, 26, 90, 36, 52,
];

// 36 particles — dense enough to look like shattered pixels
const BURST_PARTICLES = Array.from({ length: 36 }, (_, i) => {
  // Spread 360° but with per-particle angle noise so no two align
  const baseAngle = (i / 36) * 360;
  const jitter = ((i * 23) % 31) - 15; // -15 to +15° noise
  const angle = baseAngle + jitter;
  const rad = (angle * Math.PI) / 180;
  const dist = BURST_DISTS[i % BURST_DISTS.length];
  return {
    x: Math.round(Math.cos(rad) * dist),
    y: Math.round(Math.sin(rad) * dist),
    rotate: angle,
    shape: getShape(i),
    delay: 0, // all fire at once — true explosion snap
  };
});

function seededUnit(index: number, salt: number) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function formatPercent(value: number, decimals = 2) {
  return `${value.toFixed(decimals)}%`;
}

export default function HomeAmbient() {
  const extraStars = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        top: formatPercent(4 + seededUnit(index, 10) * 90),
        left: formatPercent(4 + seededUnit(index, 11) * 92),
        size: seededUnit(index, 12) > 0.72 ? 2 : 1,
        delay: seededUnit(index, 13) * 4.8,
        duration: 4.1 + seededUnit(index, 14) * 3.9,
        opacity: 0.18 + seededUnit(index, 15) * 0.34,
      })),
    []
  );

  const glitchEntries = useMemo(() => {
    // px from the top of the main element — covers the first 2200px of page.
    const visibleBand = [
      { topMin: 0,    topMax: 550,  weight: 4 },
      { topMin: 450,  topMax: 1100, weight: 3 },
      { topMin: 1000, topMax: 1650, weight: 2 },
      { topMin: 1550, topMax: 2200, weight: 1 },
    ];
    const weightedBands = visibleBand.flatMap((band) =>
      Array.from({ length: band.weight }, () => band)
    );

    return Array.from({ length: 7 }, (_, index) => {
      const word = glitchWords[index % glitchWords.length];
      const band = weightedBands[index % weightedBands.length];
      // Strict 50/50 left/right alternation — guaranteed even distribution
      const side = index % 2 === 0 ? "left" : "right";
      const topPx = band.topMin + seededUnit(index, 2) * (band.topMax - band.topMin);
      // Pulled ~100px back toward edge (was 13-24%, now 8-19%)
      const offset = 8 + seededUnit(index, 3) * 11;
      const delay = seededUnit(index, 4) * 9;
      // Longer on screen: 8–13s cycles → visible window ~64% = 5–8s
      const duration = 8 + seededUnit(index, 5) * 5;
      const style =
        neonStyles[Math.floor(seededUnit(index, 6) * neonStyles.length) % neonStyles.length];
      const driftX = (seededUnit(index, 7) - 0.5) * 22;
      const driftY = (seededUnit(index, 8) - 0.5) * 16;

      return {
        key: `${word}-${index}`,
        word,
        side,
        top: `${Math.round(topPx)}px`,
        offset: formatPercent(offset),
        delay,
        duration,
        style,
        driftX,
        driftY,
      };
    });
  }, []);

  // Track how many times each badge has been clicked — changing the key
  // forces framer-motion to remount the click-burst particles fresh each time.
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const dismissTimersRef = useRef<Record<string, ReturnType<typeof globalThis.setTimeout>>>({});

  useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => globalThis.clearTimeout(timerId));
    };
  }, []);

  const handleBadgeClick = useCallback((key: string) => {
    const existingTimer = dismissTimersRef.current[key];
    if (existingTimer) {
      globalThis.clearTimeout(existingTimer);
    }

    setClickCounts((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));

    dismissTimersRef.current[key] = globalThis.setTimeout(() => {
      delete dismissTimersRef.current[key];
    }, 850);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {lensFlares.map((flare, index) => (
        <motion.div
          key={`flare-${index}`}
          className="absolute rounded-full blur-3xl"
          style={flare}
          animate={{
            opacity: [0.3, 0.55, 0.35],
            scale: [0.96, 1.05, 0.98],
            x: [0, index % 2 === 0 ? 10 : -10, 0],
            y: [0, index % 2 === 0 ? -8 : 8, 0],
          }}
          transition={{
            duration: flare.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: flare.delay,
          }}
        />
      ))}

      {starField.map((star, index) => (
        <motion.span
          key={`star-${index}`}
          className="absolute rounded-full bg-white/70"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            boxShadow: "0 0 10px rgba(255,255,255,0.18)",
          }}
          animate={{
            opacity: [0.08, 0.6, 0.14],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: star.delay,
          }}
        />
      ))}

      {extraStars.map((star, index) => (
        <motion.span
          key={`extra-star-${index}`}
          className="absolute rounded-full bg-white/80"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            boxShadow: "0 0 12px rgba(255,255,255,0.12)",
          }}
          animate={{
            opacity: [0.04, star.opacity, 0.08],
            scale: [1, 1.35, 1],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: star.delay,
          }}
        />
      ))}

      {glitchEntries.map((entry) => {
        const { style, driftX, driftY, duration, delay } = entry;
        // 84% — badge is ~30% scale (mid-collapse with easeInOut), burst fires as it vanishes
        const burstDelay = delay + duration * 0.69;
        const burstRepeatDelay = Math.max(0, duration - 0.45);

        return (
          <motion.div
            key={entry.key}
            className={`absolute hidden lg:block ${
              entry.side === "left" ? "left-0" : "right-0"
            }`}
            style={{ top: entry.top, [entry.side]: entry.offset }}
            // Outer div: controls overall visibility + float drift
            animate={{
              opacity: [0, 0, 1, 1, 1, 1, 0],
              x: [0, 0, driftX * 0.2, driftX, driftX * 0.7, driftX * 0.3, 0],
              y: [0, 0, driftY * 0.2, driftY, driftY * 0.7, driftY * 0.3, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay,
              ease: "easeInOut",
              times: [0, 0.05, 0.15, 0.52, 0.78, 0.92, 1.0],
            }}
          >
            <div className="relative">
              {/* Badge pill — pointer-events-auto so it receives clicks */}
              <motion.div
                className="relative inline-flex h-[14px] min-w-[22px] items-center justify-center rounded-full border px-[6px] cursor-pointer pointer-events-auto"
                style={{
                  borderColor: style.border,
                  background: style.background,
                  boxShadow: style.glow,
                }}
                onClick={() => handleBadgeClick(entry.key)}
                animate={{
                  opacity: [0, 0, 1, 1, 1, 0, 0],
                  scale: [0.6, 0.6, 1.12, 1.02, 1, 0.04, 0],
                  filter: [
                    "blur(3px)", "blur(3px)",
                    "blur(0px)", "blur(0px)", "blur(0px)",
                    "blur(6px)", "blur(6px)",
                  ],
                }}
                transition={{
                  duration,
                  repeat: Infinity,
                  delay,
                  ease: "easeInOut",
                  times: [0, 0.05, 0.16, 0.40, 0.78, 0.88, 1.0],
                }}
              >
                <span
                  className="block font-jb text-[9px] uppercase tracking-[0.2em] leading-none"
                  style={{
                    color: style.text,
                    textShadow: `0 0 5px ${style.text}`,
                  }}
                >
                  {entry.word}
                </span>
              </motion.div>

              {/* Auto-repeating explosion particles */}
              {BURST_PARTICLES.map((particle, pi) => {
                const useAlt = pi % 3 === 2;
                const color = useAlt ? style.particleB : style.particle;
                const { h, w, rounded } = particle.shape;
                return (
                  <motion.span
                    key={`${entry.key}-p${pi}`}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: `${w}px`,
                      height: `${h}px`,
                      marginLeft: `${-w / 2}px`,
                      marginTop: `${-h / 2}px`,
                      borderRadius: rounded ? "50%" : "1px",
                      background: color,
                      boxShadow: `0 0 3px ${color}`,
                    }}
                    animate={{
                      opacity: [0, 1, 0.8, 0.3, 0],
                      x: [0, particle.x * 0.55, particle.x * 0.85, particle.x],
                      y: [0, particle.y * 0.55, particle.y * 0.85, particle.y],
                      rotate: [0, particle.rotate * 0.6, particle.rotate],
                      scale: [1, 1, 0.6, 0],
                    }}
                    transition={{
                      duration: 0.45,
                      repeat: Infinity,
                      repeatDelay: burstRepeatDelay,
                      ease: [0.02, 0.8, 0.15, 1],
                      delay: burstDelay + particle.delay,
                    }}
                  />
                );
              })}

              {/* Click-triggered burst — remounts on every click via key, fires once */}
              {clickCounts[entry.key] !== undefined &&
                BURST_PARTICLES.map((particle, pi) => {
                  const useAlt = pi % 3 === 2;
                  const color = useAlt ? style.particleB : style.particle;
                  const { h, w, rounded } = particle.shape;
                  return (
                    <motion.span
                      key={`${entry.key}-click-${clickCounts[entry.key]}-${pi}`}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: `${w}px`,
                        height: `${h}px`,
                        marginLeft: `${-w / 2}px`,
                        marginTop: `${-h / 2}px`,
                        borderRadius: rounded ? "50%" : "1px",
                        background: color,
                        boxShadow: `0 0 4px ${color}`,
                      }}
                      initial={{ opacity: 0, x: 0, y: 0, scale: 1, rotate: 0 }}
                      animate={{
                        opacity: [0, 1, 0.9, 0.4, 0],
                        x: [0, particle.x * 0.5, particle.x * 0.88, particle.x * 1.1],
                        y: [0, particle.y * 0.5, particle.y * 0.88, particle.y * 1.1],
                        rotate: [0, particle.rotate * 0.55, particle.rotate * 0.9, particle.rotate],
                        scale: [1.4, 1.2, 0.7, 0.05],
                      }}
                      transition={{
                        duration: 0.42,
                        ease: [0.01, 0.9, 0.1, 1],
                      }}
                    />
                  );
                })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
