"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";

/**
 * Full-screen overlay effects for hacker & cyberpunk themes only.
 * Renders:
 *   - Matrix data rain (canvas)
 *   - Security scan line (CSS)
 *   - Data corruption flash (CSS)
 *   - Screen interference bars (CSS — enhanced via theme-effects.css)
 * All pointer-events: none — purely decorative.
 */
export default function ThemeEffectsOverlay() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const isActive = theme === "hacker" || theme === "cyberpunk";
  const isHacker = theme === "hacker";

  // Matrix rain characters
  const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+=<>{}[]|/\\~";

  const drawMatrixRain = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const fontSize = 14;
    const cols = Math.ceil(W / fontSize);

    // Initialize drops
    const drops: number[] = new Array(cols).fill(0).map(() => Math.random() * -100);
    const speeds: number[] = new Array(cols).fill(0).map(() => 0.3 + Math.random() * 0.7);

    const primaryColor = isHacker ? "0, 255, 65" : "255, 0, 204";
    const secondaryColor = isHacker ? "0, 200, 40" : "0, 255, 255";

    const draw = () => {
      // Fade trail
      ctx.fillStyle = isHacker ? "rgba(5, 10, 5, 0.06)" : "rgba(10, 5, 16, 0.06)";
      ctx.fillRect(0, 0, W, H);

      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < cols; i++) {
        const y = drops[i] * fontSize;
        if (y < 0) {
          drops[i] += speeds[i];
          continue;
        }

        // Lead character — bright
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillStyle = `rgba(${primaryColor}, ${0.7 + Math.random() * 0.3})`;
        ctx.fillText(char, i * fontSize, y);

        // Trail character above — dimmer
        if (drops[i] > 2) {
          const trailChar = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillStyle = `rgba(${secondaryColor}, ${0.08 + Math.random() * 0.12})`;
          ctx.fillText(trailChar, i * fontSize, y - fontSize * 2);
        }

        drops[i] += speeds[i];

        // Reset when off screen + random restart
        if (y > H && Math.random() > 0.975) {
          drops[i] = Math.random() * -20;
          speeds[i] = 0.3 + Math.random() * 0.7;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, [isHacker, CHARS]);

  // Canvas resize + start/stop
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1); // 1x for performance
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    drawMatrixRain();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
      // Clear canvas
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [isActive, drawMatrixRain]);

  if (!isActive) return null;

  return (
    <>
      {/* Matrix rain canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 9990,
          opacity: 0.12,
          mixBlendMode: "screen",
        }}
        aria-hidden
      />

      {/* Security scan line — sweeps top to bottom */}
      <div
        className="theme-scan-line"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          height: 2,
          pointerEvents: "none",
          zIndex: 9991,
          background: `linear-gradient(90deg, transparent 0%, ${
            isHacker ? "rgba(0,255,65,0.4)" : "rgba(255,0,204,0.4)"
          } 30%, ${
            isHacker ? "rgba(0,255,65,0.6)" : "rgba(255,0,204,0.6)"
          } 50%, ${
            isHacker ? "rgba(0,255,65,0.4)" : "rgba(255,0,204,0.4)"
          } 70%, transparent 100%)`,
          boxShadow: `0 0 20px ${
            isHacker ? "rgba(0,255,65,0.3)" : "rgba(255,0,204,0.3)"
          }, 0 0 60px ${
            isHacker ? "rgba(0,255,65,0.1)" : "rgba(255,0,204,0.1)"
          }`,
          animation: "security-scan 8s linear infinite",
        }}
        aria-hidden
      />

      {/* Data corruption flash — brief full-screen distortion */}
      <div
        className="theme-corruption-flash"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9992,
          animation: "corruption-flash 12s ease-in-out infinite",
          mixBlendMode: "overlay",
        }}
        aria-hidden
      />

      {/* Neon lens flare — top of viewport */}
      <div
        style={{
          position: "fixed",
          top: -40,
          left: "20%",
          width: "60%",
          height: 120,
          pointerEvents: "none",
          zIndex: 9989,
          background: `radial-gradient(ellipse at center, ${
            isHacker ? "rgba(0,255,65,0.08)" : "rgba(255,0,204,0.08)"
          } 0%, transparent 70%)`,
          animation: "neon-lens-drift 15s ease-in-out infinite alternate",
          filter: "blur(20px)",
        }}
        aria-hidden
      />
    </>
  );
}
