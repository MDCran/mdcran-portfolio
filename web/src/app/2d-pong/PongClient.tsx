"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

/* ──────────────────────────────────────────────────────────────
   2D Pong — Bar Edition
   Portrait phone, two players (top = P2, bottom = P1). Each player has
   Left / Right buttons in a thumb strip on their end; tapping shifts their
   paddle so the screen stays clear. Hallucination modes fire on a timer with
   a mid-edge countdown announcing what's next. Canvas drives the fast game
   loop; Framer Motion handles the overlays. First to 7 wins.
   ────────────────────────────────────────────────────────────── */

type Mode = "none" | "drunk" | "ghost" | "invert" | "portal" | "flashbang";
const MODE_LABELS: Record<Mode, string> = {
  none: "",
  drunk: "Too Many Drinks",
  ghost: "Ghost Ball",
  invert: "Cosmic Inversion",
  portal: "Portal-Hop",
  flashbang: "Flashbang",
};
const PICKABLE: Mode[] = ["drunk", "ghost", "invert", "portal", "flashbang"];
const WIN_SCORE = 7;

interface Ball { x: number; y: number; vx: number; vy: number; ghost?: boolean }
interface Portal { x: number; y: number; r: number }

export default function PongClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [scoreP1, setScoreP1] = useState(0); // bottom
  const [scoreP2, setScoreP2] = useState(0); // top
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<null | 1 | 2>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [nextMode, setNextMode] = useState<Mode>("none");
  const [countdown, setCountdown] = useState(0);
  const [inverted, setInverted] = useState(false);
  const [landscape, setLandscape] = useState(false);

  // ── Mutable game state (refs so the rAF loop reads fresh values) ──
  const dimRef = useRef({ w: 0, h: 0 });
  const ballsRef = useRef<Ball[]>([]);
  const padRef = useRef({ top: 0.5, bottom: 0.5 }); // normalized 0..1 center x
  const padW = useRef(96);
  const heldRef = useRef({ tl: false, tr: false, bl: false, br: false });
  const invertRef = useRef(false);
  const modeRef = useRef<Mode>("none");
  const modeEndRef = useRef(0);
  const nextEventRef = useRef(0);
  const portalsRef = useRef<Portal[]>([]);
  const flashRef = useRef(false);
  const scoreRef = useRef({ p1: 0, p2: 0 });
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);

  const PAD_H = 12;
  const PAD_INSET = 70; // distance of paddle from the top/bottom edge (control strips)

  const resetBall = useCallback((towards: 1 | 2) => {
    const { w, h } = dimRef.current;
    const speed = Math.max(4, h * 0.006);
    const angle = (Math.random() * 0.6 - 0.3); // slight horizontal spread
    ballsRef.current = [{
      x: w / 2,
      y: h / 2,
      vx: Math.sin(angle) * speed,
      vy: (towards === 1 ? 1 : -1) * Math.cos(angle) * speed,
    }];
    portalsRef.current = [];
  }, []);

  const startMatch = useCallback(() => {
    scoreRef.current = { p1: 0, p2: 0 };
    setScoreP1(0); setScoreP2(0);
    setWinner(null);
    modeRef.current = "none"; setMode("none");
    invertRef.current = false; setInverted(false);
    setNextMode("none");
    nextEventRef.current = performance.now() + 7000;
    resetBall(Math.random() < 0.5 ? 1 : 2);
    runningRef.current = true;
    setRunning(true);
  }, [resetBall]);

  // ── Resize / DPR ──
  useEffect(() => {
    const onResize = () => {
      const wrap = wrapRef.current, canvas = canvasRef.current;
      if (!wrap || !canvas) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      setLandscape(w > h);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimRef.current = { w, h };
      padW.current = Math.max(70, Math.min(140, w * 0.28));
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("orientationchange", onResize); };
  }, []);

  // ── Game loop ──
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const triggerEvent = (now: number) => {
      const m = PICKABLE[Math.floor(Math.random() * PICKABLE.length)];
      modeRef.current = m; setMode(m);
      modeEndRef.current = now + 7000;
      if (m === "invert") { invertRef.current = true; setInverted(true); }
      if (m === "portal") {
        const { w, h } = dimRef.current;
        portalsRef.current = [
          { x: w * (0.2 + Math.random() * 0.2), y: h * (0.4 + Math.random() * 0.05), r: 26 },
          { x: w * (0.6 + Math.random() * 0.2), y: h * (0.55 + Math.random() * 0.05), r: 26 },
        ];
      }
      nextEventRef.current = now + 7000 + 6000 + Math.random() * 4000; // event window + gap
      setNextMode("none");
    };

    const endEvent = () => {
      modeRef.current = "none"; setMode("none");
      invertRef.current = false; setInverted(false);
      portalsRef.current = [];
      ballsRef.current = ballsRef.current.filter((b) => !b.ghost);
    };

    const score = (who: 1 | 2) => {
      const s = scoreRef.current;
      if (who === 1) s.p1++; else s.p2++;
      setScoreP1(s.p1); setScoreP2(s.p2);
      if (s.p1 >= WIN_SCORE || s.p2 >= WIN_SCORE) {
        runningRef.current = false; setRunning(false);
        setWinner(s.p1 >= WIN_SCORE ? 1 : 2);
      } else {
        resetBall(who === 1 ? 2 : 1);
      }
    };

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const { w, h } = dimRef.current;
      if (!w || !h) return;
      const dtMs = lastTsRef.current ? Math.min(40, ts - lastTsRef.current) : 16;
      lastTsRef.current = ts;
      const dt = dtMs / 16.67;
      const m = modeRef.current;

      // ── Event scheduling ──
      if (runningRef.current) {
        const tNext = nextEventRef.current;
        if (m === "none") {
          const remain = tNext - ts;
          if (remain <= 3000 && remain > 0) { setNextMode((nm) => (nm === "none" ? PICKABLE[Math.floor(Math.random() * PICKABLE.length)] : nm)); }
          setCountdown(Math.max(0, Math.ceil(remain / 1000)));
          if (remain <= 0) triggerEvent(ts);
        } else {
          setCountdown(Math.max(0, Math.ceil((modeEndRef.current - ts) / 1000)));
          if (ts >= modeEndRef.current) endEvent();
        }
      }

      // ── Controls → paddle movement ──
      const swap = invertRef.current;
      const speed = 0.011 * dt;
      const held = heldRef.current;
      const bottomLeft = swap ? held.br : held.bl;
      const bottomRight = swap ? held.bl : held.br;
      const topLeft = swap ? held.tr : held.tl;
      const topRight = swap ? held.tl : held.tr;
      if (runningRef.current) {
        if (bottomLeft) padRef.current.bottom -= speed;
        if (bottomRight) padRef.current.bottom += speed;
        if (topLeft) padRef.current.top -= speed;
        if (topRight) padRef.current.top += speed;
      }
      const half = padW.current / 2 / w;
      padRef.current.bottom = Math.max(half, Math.min(1 - half, padRef.current.bottom));
      padRef.current.top = Math.max(half, Math.min(1 - half, padRef.current.top));
      const padBottomX = padRef.current.bottom * w;
      const padTopX = padRef.current.top * w;

      // ── Ball physics ──
      if (runningRef.current) {
        for (const b of ballsRef.current) {
          b.x += b.vx * dt; b.y += b.vy * dt;
          const r = 9;
          // Walls
          if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); if (m === "ghost" && !b.ghost && ballsRef.current.length < 4) spawnGhost(b); }
          if (b.x > w - r) { b.x = w - r; b.vx = -Math.abs(b.vx); if (m === "ghost" && !b.ghost && ballsRef.current.length < 4) spawnGhost(b); }
          // Portals
          if (m === "portal") {
            for (let i = 0; i < portalsRef.current.length; i++) {
              const p = portalsRef.current[i];
              if (Math.hypot(b.x - p.x, b.y - p.y) < p.r) {
                const out = portalsRef.current[(i + 1) % portalsRef.current.length];
                b.x = out.x + (Math.random() * 30 - 15); b.y = out.y + (out.y < h / 2 ? p.r + 12 : -p.r - 12);
                const ang = Math.random() * Math.PI * 2;
                const sp = Math.hypot(b.vx, b.vy) * 1.35;
                b.vx = Math.cos(ang) * sp; b.vy = (b.y < h / 2 ? 1 : -1) * Math.abs(Math.sin(ang) * sp);
                break;
              }
            }
          }
          // Paddles (ghosts pass through)
          const bottomY = h - PAD_INSET;
          const topY = PAD_INSET;
          if (!b.ghost) {
            if (b.vy > 0 && b.y + r >= bottomY && b.y + r <= bottomY + PAD_H + 14 && Math.abs(b.x - padBottomX) < padW.current / 2 + r) {
              b.y = bottomY - r; b.vy = -Math.abs(b.vy);
              b.vx += ((b.x - padBottomX) / (padW.current / 2)) * 2.2;
            }
            if (b.vy < 0 && b.y - r <= topY && b.y - r >= topY - PAD_H - 14 && Math.abs(b.x - padTopX) < padW.current / 2 + r) {
              b.y = topY + r; b.vy = Math.abs(b.vy);
              b.vx += ((b.x - padTopX) / (padW.current / 2)) * 2.2;
            }
          }
        }
        // Scoring + ghost cleanup
        const survivors: Ball[] = [];
        let scored: 1 | 2 | null = null;
        for (const b of ballsRef.current) {
          if (b.y < -20) { if (!b.ghost && scored === null) scored = 1; continue; }   // passed top → P1 (bottom) scores
          if (b.y > h + 20) { if (!b.ghost && scored === null) scored = 2; continue; } // passed bottom → P2 scores
          survivors.push(b);
        }
        ballsRef.current = survivors;
        if (scored) score(scored);
        else if (!survivors.some((b) => !b.ghost)) resetBall(Math.random() < 0.5 ? 1 : 2);
      }

      // ── Render ──
      const drunk = m === "drunk";
      const flash = m === "flashbang" && Math.floor(ts / 700) % 2 === 0;
      flashRef.current = flash;

      ctx.save();
      // Drunk sway
      if (drunk) {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.sin(ts / 600) * 0.05);
        ctx.scale(1 + Math.sin(ts / 900) * 0.02, 1 + Math.cos(ts / 800) * 0.02);
        ctx.translate(-w / 2, -h / 2);
      }
      // Trails: lower alpha = longer trails (drunk), else near-full clear
      ctx.fillStyle = flash ? "#000" : `rgba(6,6,10,${drunk ? 0.18 : 0.4})`;
      ctx.fillRect(-40, -40, w + 80, h + 80);

      // Center divider + portals
      if (!flash) {
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 2; ctx.setLineDash([8, 10]);
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke(); ctx.setLineDash([]);
        for (const p of portalsRef.current) {
          const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
          grd.addColorStop(0, "rgba(168,85,247,0.9)"); grd.addColorStop(1, "rgba(168,85,247,0)");
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Paddles
      if (!flash) {
        ctx.fillStyle = "#38bdf8";
        roundRect(ctx, padTopX - padW.current / 2, PAD_INSET - PAD_H, padW.current, PAD_H, 6); ctx.fill();
        ctx.fillStyle = "#ef4242";
        roundRect(ctx, padBottomX - padW.current / 2, h - PAD_INSET, padW.current, PAD_H, 6); ctx.fill();
      }

      // Balls (always glow, even in flashbang)
      for (const b of ballsRef.current) {
        ctx.save();
        ctx.shadowColor = b.ghost ? "rgba(255,255,255,0.6)" : "#fff";
        ctx.shadowBlur = drunk ? 26 : 16;
        ctx.fillStyle = b.ghost ? "rgba(255,255,255,0.55)" : "#fff";
        ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    function spawnGhost(src: Ball) {
      ballsRef.current.push({ x: src.x, y: src.y, vx: src.vx * (0.85 + Math.random() * 0.3), vy: src.vy, ghost: true });
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [resetBall]);

  const press = (k: keyof typeof heldRef.current, v: boolean) => () => { heldRef.current[k] = v; };

  const ctrlBtn = "flex-1 flex items-center justify-center rounded-sm border border-white/15 bg-white/[0.06] active:bg-white/20 text-white/80 text-2xl font-bold select-none touch-none";

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-[#06060a] text-white"
      style={{ touchAction: "none", overscrollBehavior: "none", filter: inverted ? "invert(1) hue-rotate(180deg)" : "none", transition: "filter 0.15s" }}
    >
      {landscape && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#06060a] px-8 text-center">
          <p className="font-nord text-2xl">Rotate to portrait</p>
          <p className="text-sm text-white/50">Hold the phone upright between both players.</p>
        </div>
      )}

      <div className="flex h-full w-full flex-col">
        {/* TOP player (P2) control strip — rotated to face them */}
        <div className="flex h-[70px] flex-none gap-2 px-3 py-2" style={{ transform: "rotate(180deg)" }}>
          <button className={ctrlBtn} aria-label="P2 left" onPointerDown={press("tl", true)} onPointerUp={press("tl", false)} onPointerLeave={press("tl", false)} onPointerCancel={press("tl", false)}>◀</button>
          <div className="flex items-center px-2 text-[11px] uppercase tracking-widest text-[#38bdf8]">P2 · {scoreP2}</div>
          <button className={ctrlBtn} aria-label="P2 right" onPointerDown={press("tr", true)} onPointerUp={press("tr", false)} onPointerLeave={press("tr", false)} onPointerCancel={press("tr", false)}>▶</button>
        </div>

        {/* Play area */}
        <div ref={wrapRef} className="relative flex-1">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {/* Center edge timer / announcement */}
          <div className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 -rotate-90 origin-left">
            <span className="whitespace-nowrap rounded-sm bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/55 backdrop-blur-sm">
              {mode !== "none" ? `${MODE_LABELS[mode]} · ${countdown}s` : nextMode !== "none" ? `Incoming: ${MODE_LABELS[nextMode]} in ${countdown}s` : running ? `Next chaos: ${countdown}s` : "Ready"}
            </span>
          </div>

          {/* Big mode banner */}
          <AnimatePresence>
            {mode !== "none" && (
              <motion.div
                key={mode}
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              >
                <span className="font-nord text-xl uppercase tracking-[0.18em] text-white" style={{ textShadow: "0 0 24px rgba(239,66,66,0.7)" }}>
                  {mode === "invert" ? "REVERSE!" : MODE_LABELS[mode]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start / winner overlay */}
          <AnimatePresence>
            {(!running) && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black/70 px-8 text-center backdrop-blur-sm"
              >
                {winner ? (
                  <>
                    <p className="font-nord text-3xl" style={{ color: winner === 1 ? "#ef4242" : "#38bdf8" }}>Player {winner} wins!</p>
                    <p className="text-sm text-white/50">{scoreP1} — {scoreP2}</p>
                  </>
                ) : (
                  <>
                    <p className="font-nord text-3xl">2D Pong</p>
                    <p className="max-w-xs text-sm leading-relaxed text-white/55">Lay the phone flat or hold it upright between you. Each player taps ◀ ▶ on their end. Survive the chaos. First to {WIN_SCORE} wins.</p>
                  </>
                )}
                <div className="flex gap-3">
                  <button onClick={startMatch} className="h-11 rounded-sm bg-[#ef4242] px-6 text-sm font-medium text-white">{winner ? "Play again" : "Start game"}</button>
                  {winner && (
                    <button onClick={() => { setWinner(null); scoreRef.current = { p1: 0, p2: 0 }; setScoreP1(0); setScoreP2(0); }} className="h-11 rounded-sm border border-white/20 px-5 text-sm text-white/70">Reset score</button>
                  )}
                </div>
                <Link href="/" className="text-[11px] uppercase tracking-[0.18em] text-white/30">← Home</Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM player (P1) control strip */}
        <div className="flex h-[70px] flex-none gap-2 px-3 py-2">
          <button className={ctrlBtn} aria-label="P1 left" onPointerDown={press("bl", true)} onPointerUp={press("bl", false)} onPointerLeave={press("bl", false)} onPointerCancel={press("bl", false)}>◀</button>
          <div className="flex items-center px-2 text-[11px] uppercase tracking-widest text-[#ef4242]">P1 · {scoreP1}</div>
          <button className={ctrlBtn} aria-label="P1 right" onPointerDown={press("br", true)} onPointerUp={press("br", false)} onPointerLeave={press("br", false)} onPointerCancel={press("br", false)}>▶</button>
        </div>
      </div>
    </main>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
