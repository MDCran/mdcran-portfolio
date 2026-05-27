"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ──────────────────────────────────────────────────────────────
   2D Pong — Bar Edition
   Portrait phone, two players (top = P2, bottom = P1). Each player has
   Left / Right buttons in a thumb strip on their end. Two layers of chaos:
   • Hallucination MODES fire on a timer (full-screen, mid-edge countdown).
   • Power-up ORBS spawn on the field; the ball collecting one triggers an
     effect, attributed to whoever last hit the ball.
   Canvas drives the fast loop; Framer Motion handles overlays. First to 7 wins.
   ────────────────────────────────────────────────────────────── */

type Mode = "none" | "drunk" | "ghost" | "invert" | "portal" | "flashbang";
const MODE_LABELS: Record<Mode, string> = {
  none: "", drunk: "Too Many Drinks", ghost: "Ghost Ball", invert: "Cosmic Inversion", portal: "Portal-Hop", flashbang: "Flashbang",
};
const PICKABLE: Mode[] = ["drunk", "ghost", "invert", "portal", "flashbang"];
const WIN_SCORE = 7;

type Orb =
  | "shield" | "extend" | "shrink" | "magnet"   // paddle modifiers (attributed)
  | "railgun" | "curveball" | "multiball"        // ball mechanics
  | "emp" | "quake" | "slowmo";                  // screen distortion
const ORB_META: Record<Orb, { color: string; label: string }> = {
  shield: { color: "#22c55e", label: "SHIELD" },
  extend: { color: "#38bdf8", label: "EXTEND" },
  shrink: { color: "#f472b6", label: "SHRINK FOE" },
  magnet: { color: "#a855f7", label: "MAGNET" },
  railgun: { color: "#ef4242", label: "RAILGUN" },
  curveball: { color: "#facc15", label: "CURVEBALL" },
  multiball: { color: "#fb923c", label: "MULTI-BALL" },
  emp: { color: "#06b6d4", label: "EMP BLIND" },
  quake: { color: "#e11d48", label: "EARTHQUAKE" },
  slowmo: { color: "#818cf8", label: "SLOW-MO" },
};
const ORB_TYPES = Object.keys(ORB_META) as Orb[];

interface Ball { x: number; y: number; vx: number; vy: number; ghost?: boolean; spin?: number; flashUntil?: number }
interface Portal { x: number; y: number; r: number }
interface FieldOrb { x: number; y: number; r: number; type: Orb }
type Side = "top" | "bottom";

export default function PongClient() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // null = checking, true = desktop (blocked), false = phone (allowed)
  const [blocked, setBlocked] = useState<boolean | null>(null);

  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<null | 1 | 2>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [nextMode, setNextMode] = useState<Mode>("none");
  const [countdown, setCountdown] = useState(0);
  const [inverted, setInverted] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [orbBanner, setOrbBanner] = useState<{ label: string; color: string; id: number } | null>(null);
  const [flash, setFlash] = useState<{ label: string; color: string; id: number } | null>(null);
  const [hud, setHud] = useState<{ key: string; label: string; color: string; secs: number }[]>([]);
  const hudTickRef = useRef(0);

  // ── Mutable state ──
  const dimRef = useRef({ w: 0, h: 0 });
  const ballsRef = useRef<Ball[]>([]);
  const padRef = useRef({ top: 0.5, bottom: 0.5 });
  const padBaseRef = useRef(96);
  const heldRef = useRef({ tl: false, tr: false, bl: false, br: false });
  const invertRef = useRef(false);
  const modeRef = useRef<Mode>("none");
  const modeEndRef = useRef(0);
  const nextEventRef = useRef(0);
  const portalsRef = useRef<Portal[]>([]);
  const scoreRef = useRef({ p1: 0, p2: 0 });
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const lastHitRef = useRef<Side>("bottom"); // who last touched the ball
  const orbsRef = useRef<FieldOrb[]>([]);
  const nextOrbRef = useRef(0);
  // Timed effects (store expiry ms; 0 = inactive)
  const scaleRef = useRef<{ top: { mult: number; end: number }; bottom: { mult: number; end: number } }>({ top: { mult: 1, end: 0 }, bottom: { mult: 1, end: 0 } });
  const magnetRef = useRef<{ top: number; bottom: number }>({ top: 0, bottom: 0 });
  const shieldRef = useRef<{ top: { hp: number; end: number }; bottom: { hp: number; end: number } }>({ top: { hp: 0, end: 0 }, bottom: { hp: 0, end: 0 } });
  const curveEndRef = useRef(0);
  const slowEndRef = useRef(0);
  const empRef = useRef<{ blind: Side | null; end: number }>({ blind: null, end: 0 });
  const quakeEndRef = useRef(0);

  const PAD_H = 12;
  const PAD_INSET = 100; // keep paddles clear of the corner control buttons

  const padWidth = (side: Side, now: number) => {
    const s = scaleRef.current[side];
    const mult = now < s.end ? s.mult : 1;
    return padBaseRef.current * mult;
  };

  const resetBall = useCallback((towards: 1 | 2) => {
    const { w, h } = dimRef.current;
    const speed = Math.max(4, h * 0.006);
    const angle = Math.random() * 0.6 - 0.3;
    ballsRef.current = [{ x: w / 2, y: h / 2, vx: Math.sin(angle) * speed, vy: (towards === 1 ? 1 : -1) * Math.cos(angle) * speed }];
    portalsRef.current = [];
  }, []);

  const startMatch = useCallback(() => {
    scoreRef.current = { p1: 0, p2: 0 };
    setScoreP1(0); setScoreP2(0);
    setWinner(null);
    modeRef.current = "none"; setMode("none");
    invertRef.current = false; setInverted(false);
    setNextMode("none");
    nextEventRef.current = performance.now() + 8000;
    nextOrbRef.current = performance.now() + 3500;
    orbsRef.current = [];
    scaleRef.current = { top: { mult: 1, end: 0 }, bottom: { mult: 1, end: 0 } };
    magnetRef.current = { top: 0, bottom: 0 };
    shieldRef.current = { top: { hp: 0, end: 0 }, bottom: { hp: 0, end: 0 } };
    curveEndRef.current = 0; slowEndRef.current = 0; quakeEndRef.current = 0;
    empRef.current = { blind: null, end: 0 };
    resetBall(Math.random() < 0.5 ? 1 : 2);
    runningRef.current = true;
    setRunning(true);
  }, [resetBall]);

  // Phone-only: a coarse pointer on a small screen. Anything else → bounce home.
  useEffect(() => {
    const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    const small = Math.min(window.innerWidth, window.innerHeight) <= 640;
    if (coarse && small) { setBlocked(false); return; }
    setBlocked(true);
    const t = window.setTimeout(() => router.push("/"), 2800);
    return () => window.clearTimeout(t);
  }, [router]);

  useEffect(() => {
    const onResize = () => {
      const wrap = wrapRef.current, canvas = canvasRef.current;
      if (!wrap || !canvas) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      setLandscape(w > h);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimRef.current = { w, h };
      padBaseRef.current = Math.max(64, Math.min(130, w * 0.26));
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("orientationchange", onResize); };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const announceOrb = (t: Orb) => {
      const meta = ORB_META[t];
      setOrbBanner({ label: meta.label, color: meta.color, id: Date.now() });
      setFlash({ label: meta.label, color: meta.color, id: Date.now() }); // full-screen pop
    };

    const applyOrb = (t: Orb, now: number) => {
      const { w, h } = dimRef.current;
      const hitter = lastHitRef.current;            // who collected it
      const foe: Side = hitter === "top" ? "bottom" : "top";
      announceOrb(t);
      switch (t) {
        case "shield": shieldRef.current[hitter] = { hp: 1, end: now + 5000 }; break;
        case "extend": scaleRef.current[hitter] = { mult: 2, end: now + 8000 }; break;
        case "shrink": scaleRef.current[foe] = { mult: 0.35, end: now + 8000 }; break;
        case "magnet": magnetRef.current[hitter] = now + 6000; break;
        case "curveball": {
          curveEndRef.current = now + 6000;
          for (const b of ballsRef.current) if (!b.ghost) b.spin = (Math.random() < 0.5 ? -1 : 1) * 0.18;
          break;
        }
        case "railgun": {
          const real = ballsRef.current.find((b) => !b.ghost); if (!real) break;
          const sp = Math.hypot(real.vx, real.vy) * 3;
          const dir = foe === "top" ? -1 : 1; // shoot toward the opponent
          const ang = Math.atan2(real.vx, Math.abs(real.vy));
          real.vx = Math.sin(ang) * sp; real.vy = dir * Math.cos(ang) * sp;
          real.flashUntil = now + 600;
          break;
        }
        case "multiball": {
          const real = ballsRef.current.find((b) => !b.ghost); if (!real) break;
          const sp = Math.hypot(real.vx, real.vy) || 5;
          const extra = 2 + Math.floor(Math.random() * 3); // total 3–5
          for (let i = 0; i < extra; i++) {
            const a = Math.random() * Math.PI * 2;
            ballsRef.current.push({ x: real.x, y: real.y, vx: Math.cos(a) * sp, vy: (Math.sin(a) || 0.5) * sp });
          }
          break;
        }
        case "emp": empRef.current = { blind: foe, end: now + 4000 }; break;
        case "quake": quakeEndRef.current = now + 4000; break;
        case "slowmo": slowEndRef.current = now + 3000; break;
      }
      void w; void h;
    };

    const triggerEvent = (now: number) => {
      const m = PICKABLE[Math.floor(Math.random() * PICKABLE.length)];
      modeRef.current = m; setMode(m); modeEndRef.current = now + 7000;
      setFlash({ label: m === "invert" ? "REVERSE!" : MODE_LABELS[m], color: "#ef4242", id: now }); // full-screen pop
      if (m === "invert") { invertRef.current = true; setInverted(true); }
      if (m === "portal") {
        const { w, h } = dimRef.current;
        portalsRef.current = [
          { x: w * (0.2 + Math.random() * 0.2), y: h * (0.4 + Math.random() * 0.05), r: 26 },
          { x: w * (0.6 + Math.random() * 0.2), y: h * (0.55 + Math.random() * 0.05), r: 26 },
        ];
      }
      nextEventRef.current = now + 7000 + 6000 + Math.random() * 4000;
      setNextMode("none");
    };
    const endEvent = () => {
      modeRef.current = "none"; setMode("none");
      invertRef.current = false; setInverted(false);
      portalsRef.current = [];
      ballsRef.current = ballsRef.current.filter((b) => !b.ghost);
    };

    const checkWin = () => {
      const s = scoreRef.current;
      if (s.p1 >= WIN_SCORE || s.p2 >= WIN_SCORE) {
        runningRef.current = false; setRunning(false);
        setWinner(s.p1 >= WIN_SCORE ? 1 : 2);
        return true;
      }
      return false;
    };

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const { w, h } = dimRef.current;
      if (!w || !h) return;
      const dtMs = lastTsRef.current ? Math.min(40, ts - lastTsRef.current) : 16;
      lastTsRef.current = ts;
      const dt = dtMs / 16.67;
      const m = modeRef.current;
      const slow = ts < slowEndRef.current;
      const ballDt = dt * (slow ? 0.35 : 1);

      // Events
      if (runningRef.current) {
        if (m === "none") {
          const remain = nextEventRef.current - ts;
          if (remain <= 3000 && remain > 0) setNextMode((nm) => (nm === "none" ? PICKABLE[Math.floor(Math.random() * PICKABLE.length)] : nm));
          setCountdown(Math.max(0, Math.ceil(remain / 1000)));
          if (remain <= 0) triggerEvent(ts);
        } else {
          setCountdown(Math.max(0, Math.ceil((modeEndRef.current - ts) / 1000)));
          if (ts >= modeEndRef.current) endEvent();
        }
        // Spawn power-up orbs
        if (ts >= nextOrbRef.current && orbsRef.current.length < 3) {
          const type = ORB_TYPES[Math.floor(Math.random() * ORB_TYPES.length)];
          orbsRef.current.push({ x: w * (0.18 + Math.random() * 0.64), y: h * (0.3 + Math.random() * 0.4), r: 16, type });
          nextOrbRef.current = ts + 4500 + Math.random() * 3500;
        }
      }

      // Controls → paddles
      const swap = invertRef.current;
      const speed = 0.012 * dt;
      const held = heldRef.current;
      const bL = swap ? held.br : held.bl, bR = swap ? held.bl : held.br;
      const tL = swap ? held.tr : held.tl, tR = swap ? held.tl : held.tr;
      if (runningRef.current) {
        if (bL) padRef.current.bottom -= speed;
        if (bR) padRef.current.bottom += speed;
        if (tL) padRef.current.top -= speed;
        if (tR) padRef.current.top += speed;
      }
      const wB = padWidth("bottom", ts), wT = padWidth("top", ts);
      padRef.current.bottom = Math.max(wB / 2 / w, Math.min(1 - wB / 2 / w, padRef.current.bottom));
      padRef.current.top = Math.max(wT / 2 / w, Math.min(1 - wT / 2 / w, padRef.current.top));
      const padBottomX = padRef.current.bottom * w, padTopX = padRef.current.top * w;
      const bottomY = h - PAD_INSET, topY = PAD_INSET;
      const curve = ts < curveEndRef.current;

      // Physics
      if (runningRef.current) {
        for (const b of ballsRef.current) {
          // Magnet pull toward the active paddle's center when the ball is on that half
          if (ts < magnetRef.current.bottom && b.y > h * 0.5) b.vx += ((padBottomX - b.x) / w) * 0.6 * dt;
          if (ts < magnetRef.current.top && b.y < h * 0.5) b.vx += ((padTopX - b.x) / w) * 0.6 * dt;
          if (curve && b.spin) b.vx += b.spin * dt; // Magnus curve

          b.x += b.vx * ballDt; b.y += b.vy * ballDt;
          const r = 9;
          if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); if (b.spin) b.spin = -b.spin; if (m === "ghost" && !b.ghost && ballsRef.current.length < 5) ballsRef.current.push({ x: b.x, y: b.y, vx: b.vx * 0.9, vy: b.vy, ghost: true }); }
          if (b.x > w - r) { b.x = w - r; b.vx = -Math.abs(b.vx); if (b.spin) b.spin = -b.spin; if (m === "ghost" && !b.ghost && ballsRef.current.length < 5) ballsRef.current.push({ x: b.x, y: b.y, vx: b.vx * 0.9, vy: b.vy, ghost: true }); }

          // Portals
          if (m === "portal") {
            for (let i = 0; i < portalsRef.current.length; i++) {
              const p = portalsRef.current[i];
              if (Math.hypot(b.x - p.x, b.y - p.y) < p.r) {
                const out = portalsRef.current[(i + 1) % portalsRef.current.length];
                b.x = out.x; b.y = out.y + (out.y < h / 2 ? p.r + 14 : -p.r - 14);
                const sp = Math.hypot(b.vx, b.vy) * 1.35, ang = Math.random() * Math.PI * 2;
                b.vx = Math.cos(ang) * sp; b.vy = (b.y < h / 2 ? 1 : -1) * Math.abs(Math.sin(ang) * sp);
                break;
              }
            }
          }

          // Orb pickup (real balls only)
          if (!b.ghost) {
            for (let i = orbsRef.current.length - 1; i >= 0; i--) {
              const o = orbsRef.current[i];
              if (Math.hypot(b.x - o.x, b.y - o.y) < o.r + r) { orbsRef.current.splice(i, 1); applyOrb(o.type, ts); break; }
            }
          }

          // Paddles (ghosts pass through)
          if (!b.ghost) {
            if (b.vy > 0 && b.y + r >= bottomY && b.y + r <= bottomY + PAD_H + 16 && Math.abs(b.x - padBottomX) < wB / 2 + r) {
              b.y = bottomY - r; b.vy = -Math.abs(b.vy); b.vx += ((b.x - padBottomX) / (wB / 2)) * 2.2; lastHitRef.current = "bottom";
            }
            if (b.vy < 0 && b.y - r <= topY && b.y - r >= topY - PAD_H - 16 && Math.abs(b.x - padTopX) < wT / 2 + r) {
              b.y = topY + r; b.vy = Math.abs(b.vy); b.vx += ((b.x - padTopX) / (wT / 2)) * 2.2; lastHitRef.current = "top";
            }
            // Shields (just behind each paddle, save once)
            const sb = shieldRef.current.bottom;
            if (sb.hp > 0 && ts < sb.end && b.vy > 0 && b.y + r >= bottomY + PAD_H + 10 && b.y < bottomY + PAD_H + 24) { b.vy = -Math.abs(b.vy); sb.hp--; }
            const stp = shieldRef.current.top;
            if (stp.hp > 0 && ts < stp.end && b.vy < 0 && b.y - r <= topY - PAD_H - 10 && b.y > topY - PAD_H - 24) { b.vy = Math.abs(b.vy); stp.hp--; }
          }
          // clamp speed
          const sp = Math.hypot(b.vx, b.vy), max = h * 0.03;
          if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
        }

        // Scoring (multiball: each pass scores; round resets only when no real balls remain)
        const survivors: Ball[] = [];
        for (const b of ballsRef.current) {
          if (b.y < -24) { if (!b.ghost) scoreRef.current.p1++; continue; }
          if (b.y > h + 24) { if (!b.ghost) scoreRef.current.p2++; continue; }
          survivors.push(b);
        }
        if (survivors.length !== ballsRef.current.length) { setScoreP1(scoreRef.current.p1); setScoreP2(scoreRef.current.p2); }
        ballsRef.current = survivors;
        if (!checkWin() && !survivors.some((b) => !b.ghost)) resetBall(Math.random() < 0.5 ? 1 : 2);
      }

      // ── Active-effect HUD (throttled) ──
      if (ts - hudTickRef.current > 180) {
        hudTickRef.current = ts;
        const list: { key: string; label: string; color: string; secs: number }[] = [];
        const add = (key: string, label: string, color: string, end: number) => { const s = Math.ceil((end - ts) / 1000); if (s > 0) list.push({ key, label, color, secs: s }); };
        if (m !== "none") add("mode", m === "invert" ? "REVERSE" : MODE_LABELS[m], "#ef4242", modeEndRef.current);
        if (scaleRef.current.bottom.end > ts) add("sb", scaleRef.current.bottom.mult > 1 ? "P1 EXTEND" : "P1 TINY", ORB_META.extend.color, scaleRef.current.bottom.end);
        if (scaleRef.current.top.end > ts) add("st", scaleRef.current.top.mult > 1 ? "P2 EXTEND" : "P2 TINY", ORB_META.extend.color, scaleRef.current.top.end);
        if (magnetRef.current.bottom > ts) add("mb", "P1 MAGNET", ORB_META.magnet.color, magnetRef.current.bottom);
        if (magnetRef.current.top > ts) add("mt", "P2 MAGNET", ORB_META.magnet.color, magnetRef.current.top);
        if (shieldRef.current.bottom.hp > 0 && shieldRef.current.bottom.end > ts) add("shb", "P1 SHIELD", ORB_META.shield.color, shieldRef.current.bottom.end);
        if (shieldRef.current.top.hp > 0 && shieldRef.current.top.end > ts) add("sht", "P2 SHIELD", ORB_META.shield.color, shieldRef.current.top.end);
        if (curveEndRef.current > ts) add("cv", "CURVEBALL", ORB_META.curveball.color, curveEndRef.current);
        if (slowEndRef.current > ts) add("sl", "SLOW-MO", ORB_META.slowmo.color, slowEndRef.current);
        if (empRef.current.blind && empRef.current.end > ts) add("emp", `${empRef.current.blind === "bottom" ? "P1" : "P2"} BLIND`, ORB_META.emp.color, empRef.current.end);
        if (quakeEndRef.current > ts) add("qk", "EARTHQUAKE", ORB_META.quake.color, quakeEndRef.current);
        setHud((prev) => {
          if (prev.length === list.length && prev.every((p, i) => p.key === list[i].key && p.secs === list[i].secs)) return prev;
          return list;
        });
      }

      // ── Render ──
      const drunk = m === "drunk";
      const flash = m === "flashbang" && Math.floor(ts / 700) % 2 === 0;
      const quake = ts < quakeEndRef.current;

      ctx.save();
      if (drunk || quake) {
        ctx.translate(w / 2, h / 2);
        if (drunk) { ctx.rotate(Math.sin(ts / 600) * 0.05); ctx.scale(1 + Math.sin(ts / 900) * 0.02, 1 + Math.cos(ts / 800) * 0.02); }
        if (quake) { ctx.rotate(Math.sin(ts / 70) * 0.26); ctx.translate(Math.sin(ts / 40) * 10, Math.cos(ts / 37) * 10); }
        ctx.translate(-w / 2, -h / 2);
      }
      ctx.fillStyle = flash ? "#000" : `rgba(6,6,10,${drunk ? 0.18 : 0.4})`;
      ctx.fillRect(-60, -60, w + 120, h + 120);

      if (!flash) {
        ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2; ctx.setLineDash([8, 10]);
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke(); ctx.setLineDash([]);
        // portals
        for (const p of portalsRef.current) {
          const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
          g.addColorStop(0, "rgba(168,85,247,0.9)"); g.addColorStop(1, "rgba(168,85,247,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        // orbs
        for (const o of orbsRef.current) {
          const col = ORB_META[o.type].color;
          const pulse = 1 + Math.sin(ts / 200) * 0.12;
          const g = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, o.r * 1.8 * pulse);
          g.addColorStop(0, col); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 1.8 * pulse, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        // shields
        if (shieldRef.current.bottom.hp > 0 && ts < shieldRef.current.bottom.end) { ctx.fillStyle = "rgba(34,197,94,0.5)"; ctx.fillRect(0, bottomY + PAD_H + 10, w, 6); }
        if (shieldRef.current.top.hp > 0 && ts < shieldRef.current.top.end) { ctx.fillStyle = "rgba(34,197,94,0.5)"; ctx.fillRect(0, topY - PAD_H - 16, w, 6); }
        // paddles
        ctx.fillStyle = "#38bdf8"; roundRect(ctx, padTopX - wT / 2, PAD_INSET - PAD_H, wT, PAD_H, 6); ctx.fill();
        ctx.fillStyle = "#ef4242"; roundRect(ctx, padBottomX - wB / 2, h - PAD_INSET, wB, PAD_H, 6); ctx.fill();
      }

      // Balls — EMP hides balls on the blinded half; flashbang keeps only the glow
      const empBlind = empRef.current.blind && ts < empRef.current.end ? empRef.current.blind : null;
      for (const b of ballsRef.current) {
        if (empBlind === "bottom" && b.y > h / 2) continue;
        if (empBlind === "top" && b.y < h / 2) continue;
        const railing = b.flashUntil && ts < b.flashUntil;
        ctx.save();
        ctx.shadowColor = railing ? "#ef4242" : b.ghost ? "rgba(255,255,255,0.6)" : "#fff";
        ctx.shadowBlur = drunk ? 26 : 16;
        ctx.fillStyle = railing ? "#ef4242" : b.ghost ? "rgba(255,255,255,0.55)" : "#fff";
        ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [resetBall]);

  // On press-down, capture the pointer + preventDefault so a held finger keeps
  // controlling the paddle on iOS/Android (no scroll, no early cancel on slight move).
  const press = (k: keyof typeof heldRef.current, v: boolean) => (e: React.PointerEvent) => {
    if (v) { e.preventDefault(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ } }
    heldRef.current[k] = v;
  };
  // Not a phone (or still checking) → show the message and redirect home.
  if (blocked !== false) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#06060a] px-8 text-center text-white">
        {blocked && (
          <>
            <p className="font-nord text-2xl">The 2D Pong is for mobile phones only.</p>
            <p className="text-sm text-white/50">Open mdcran.com/2d-pong on your phone. Taking you home…</p>
            <Link href="/" className="mt-2 h-10 rounded-sm bg-[#ef4242] px-5 text-sm font-medium leading-10 text-white">Go home now</Link>
          </>
        )}
      </main>
    );
  }

  const cornerBtn = "absolute z-20 flex h-[80px] w-[44%] items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] text-3xl font-bold text-white/70 active:bg-white/20 active:text-white select-none touch-none";

  return (
    <main
      ref={wrapRef}
      className="fixed inset-0 overflow-hidden bg-[#06060a] text-white"
      style={{ touchAction: "none", overscrollBehavior: "none", filter: inverted ? "invert(1) hue-rotate(180deg)" : "none", transition: "filter 0.15s" }}
    >
      {/* The court fills the entire screen */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {landscape && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#06060a] px-8 text-center">
          <p className="font-nord text-2xl">Turn the phone upright</p>
          <p className="text-sm text-white/50">Hold it vertically between you — a player at each end.</p>
        </div>
      )}

      {/* P2 (top) controls — rotated to face that player */}
      <button style={{ transform: "rotate(180deg)" }} className={`${cornerBtn} left-2 top-2`} aria-label="P2 left" onPointerDown={press("tl", true)} onPointerUp={press("tl", false)} onPointerCancel={press("tl", false)}>◀</button>
      <button style={{ transform: "rotate(180deg)" }} className={`${cornerBtn} right-2 top-2`} aria-label="P2 right" onPointerDown={press("tr", true)} onPointerUp={press("tr", false)} onPointerCancel={press("tr", false)}>▶</button>
      {/* P1 (bottom) controls */}
      <button className={`${cornerBtn} left-2 bottom-2`} aria-label="P1 left" onPointerDown={press("bl", true)} onPointerUp={press("bl", false)} onPointerCancel={press("bl", false)}>◀</button>
      <button className={`${cornerBtn} right-2 bottom-2`} aria-label="P1 right" onPointerDown={press("br", true)} onPointerUp={press("br", false)} onPointerCancel={press("br", false)}>▶</button>

      {/* Scores at each end */}
      <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 text-[12px] uppercase tracking-widest text-[#38bdf8]" style={{ transform: "translateX(-50%) rotate(180deg)" }}>P2 · {scoreP2}</div>
      <div className="pointer-events-none absolute left-1/2 bottom-2 z-20 -translate-x-1/2 text-[12px] uppercase tracking-widest text-[#ef4242]">P1 · {scoreP1}</div>

      {/* Event countdown — middle, on the left edge */}
      <div className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 -rotate-90 origin-left">
        <span className="whitespace-nowrap rounded-sm bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/55 backdrop-blur-sm">
          {mode !== "none" ? `${MODE_LABELS[mode]} · ${countdown}s` : nextMode !== "none" ? `Incoming: ${MODE_LABELS[nextMode]} in ${countdown}s` : running ? `Next chaos: ${countdown}s` : "Ready"}
        </span>
      </div>

      {/* Active effect timers — right edge */}
      <div className="pointer-events-none absolute right-2 top-1/2 z-10 flex max-h-[60vh] -translate-y-1/2 flex-col gap-1.5 overflow-hidden">
        {hud.map((fx) => (
          <div key={fx.key} className="flex items-center gap-1.5 rounded-sm bg-black/55 px-2 py-1 backdrop-blur-sm" style={{ border: `1px solid ${fx.color}55` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: fx.color, boxShadow: `0 0 6px ${fx.color}` }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: fx.color }}>{fx.label}</span>
            <span className="text-[10px] font-mono text-white/70 tabular-nums">{fx.secs}s</span>
          </div>
        ))}
      </div>

      {/* Full-screen flash when a mode/power-up fires */}
      <AnimatePresence>
        {flash && (
          <motion.div key={flash.id} initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
            onAnimationComplete={() => setFlash((f) => (f?.id === flash.id ? null : f))}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: `radial-gradient(circle at center, ${flash.color}55, ${flash.color}10 60%, transparent)` }}>
            <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1.1, opacity: 1 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="font-nord text-3xl uppercase tracking-[0.18em] text-white" style={{ textShadow: `0 0 30px ${flash.color}` }}>{flash.label}</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orb pickup banner */}
      <AnimatePresence>
        {orbBanner && (
          <motion.div key={orbBanner.id} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.3 }}
            onAnimationComplete={() => window.setTimeout(() => setOrbBanner((b) => (b?.id === orbBanner.id ? null : b)), 900)}
            className="pointer-events-none absolute left-1/2 top-[40%] z-10 -translate-x-1/2">
            <span className="rounded-sm px-3 py-1 font-nord text-sm uppercase tracking-[0.18em]" style={{ background: "rgba(0,0,0,0.5)", color: orbBanner.color, textShadow: `0 0 16px ${orbBanner.color}` }}>{orbBanner.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mode !== "none" && (
          <motion.div key={mode} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="font-nord text-xl uppercase tracking-[0.18em] text-white" style={{ textShadow: "0 0 24px rgba(239,66,66,0.7)" }}>{mode === "invert" ? "REVERSE!" : MODE_LABELS[mode]}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start / winner overlay */}
      <AnimatePresence>
        {!running && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black/75 px-8 text-center backdrop-blur-sm">
            {winner ? (
              <>
                <p className="font-nord text-3xl" style={{ color: winner === 1 ? "#ef4242" : "#38bdf8" }}>Player {winner} wins!</p>
                <p className="text-sm text-white/50">{scoreP1} — {scoreP2}</p>
              </>
            ) : (
              <>
                <p className="font-nord text-4xl">2D PONG</p>
                <p className="max-w-[15rem] text-sm leading-relaxed text-white/55">Phone upright, a player at each end. Tap the ◀ ▶ corners to move your paddle. First to {WIN_SCORE}.</p>
              </>
            )}
            <div className="flex gap-3">
              <button onClick={startMatch} className="h-12 rounded-sm bg-[#ef4242] px-7 font-nord text-sm uppercase tracking-[0.15em] text-white">{winner ? "Play again" : "Start game"}</button>
              {winner && <button onClick={() => { setWinner(null); scoreRef.current = { p1: 0, p2: 0 }; setScoreP1(0); setScoreP2(0); }} className="h-12 rounded-sm border border-white/20 px-5 text-sm text-white/70">Reset score</button>}
            </div>
            <Link href="/" className="text-[11px] uppercase tracking-[0.18em] text-white/30">← Home</Link>
          </motion.div>
        )}
      </AnimatePresence>
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
