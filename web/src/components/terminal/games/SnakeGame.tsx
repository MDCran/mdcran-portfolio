"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GRID_SIZE = 20;
const INITIAL_SPEED = 150; // ms per tick
const MIN_SPEED = 80;
const SPEED_INCREMENT_INTERVAL = 5; // every N points the base speed drops by 10 ms

const POWERUP_SPAWN_MIN = 15_000; // ms
const POWERUP_SPAWN_MAX = 20_000;
const POWERUP_LIFETIME = 8_000;

const SNAKE_COLOR = "#4ade80";
const SNAKE_DARK = "#166534";
const FOOD_COLOR = "#ef4242";
const BG_COLOR = "#0a0a0a";
const GRID_LINE_COLOR = "rgba(74,222,128,0.06)";
const BORDER_COLOR = "#4ade80";

const HIGH_SCORE_KEY = "snake-high-score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

type PowerupKind = "speed" | "slow" | "ghost" | "double";

interface Powerup {
  kind: PowerupKind;
  pos: Position;
  spawnedAt: number; // timestamp
}

interface ActiveEffect {
  kind: PowerupKind;
  expiresAt: number; // timestamp
  /** For double-points: how many food items remain at 2x */
  remaining?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0-1, decreasing
  color: string;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number; // 0-1, decreasing
}

interface SnakeGameProps {
  onExit: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function posEq(a: Position, b: Position) {
  return a.x === b.x && a.y === b.y;
}

function posInList(p: Position, list: Position[]) {
  return list.some((s) => posEq(s, p));
}

function randomFreeCell(occupied: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (posInList(pos, occupied));
  return pos;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbStr(r: number, g: number, b: number, a = 1) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function lerpColor(hex1: string, hex2: string, t: number) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbStr(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
}

const POWERUP_META: Record<PowerupKind, { color: string; icon: string; label: string; duration: number }> = {
  speed: { color: "#22d3ee", icon: "\u26A1", label: "SPEED", duration: 5000 },
  slow: { color: "#a855f7", icon: "\u23F0", label: "SLOW", duration: 5000 },
  ghost: { color: "#e2e8f0", icon: "\uD83D\uDC7B", label: "GHOST", duration: 6000 },
  double: { color: "#facc15", icon: "\u2B50", label: "2\u00D7PTS", duration: Infinity }, // lasts for 5 food items, not time
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SnakeGame({ onExit }: SnakeGameProps) {
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Refs for game state (canvas render loop reads these directly)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef(0);
  const lastTickRef = useRef(0);

  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Direction>("RIGHT");
  const nextDirRef = useRef<Direction>("RIGHT"); // buffered input
  const foodRef = useRef<Position>({ x: 5, y: 5 });
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const startedRef = useRef(false);

  const powerupRef = useRef<Powerup | null>(null);
  const activeEffectsRef = useRef<ActiveEffect[]>([]);
  const nextPowerupTimeRef = useRef(0); // timestamp when next powerup should spawn

  const particlesRef = useRef<Particle[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const screenFlashRef = useRef(0); // remaining alpha for flash

  const highScoreRef = useRef(0);

  // Load high score on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n)) {
          highScoreRef.current = n;
          setHighScore(n);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // -----------------------------------------------------------------------
  // Game logic helpers (all ref-based, no state)
  // -----------------------------------------------------------------------
  const hasEffect = useCallback((kind: PowerupKind) => {
    return activeEffectsRef.current.some((e) => e.kind === kind);
  }, []);

  const getEffectiveSpeed = useCallback(() => {
    const baseSpeed = Math.max(
      MIN_SPEED,
      INITIAL_SPEED - Math.floor(scoreRef.current / SPEED_INCREMENT_INTERVAL) * 10
    );
    if (hasEffect("speed")) return baseSpeed * 0.5;
    if (hasEffect("slow")) return baseSpeed * 2;
    return baseSpeed;
  }, [hasEffect]);

  const scheduleNextPowerup = useCallback(() => {
    const delay = POWERUP_SPAWN_MIN + Math.random() * (POWERUP_SPAWN_MAX - POWERUP_SPAWN_MIN);
    nextPowerupTimeRef.current = performance.now() + delay;
  }, []);

  const spawnParticles = useCallback((cx: number, cy: number, color: string) => {
    const count = 8 + Math.floor(Math.random() * 5); // 8-12
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 2;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  }, []);

  const addScorePopup = useCallback((gridX: number, gridY: number, pts: number) => {
    scorePopupsRef.current.push({
      x: gridX,
      y: gridY,
      text: `+${pts}`,
      life: 1,
    });
  }, []);

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    const initialFood = randomFreeCell(initialSnake);
    snakeRef.current = initialSnake;
    foodRef.current = initialFood;
    dirRef.current = "RIGHT";
    nextDirRef.current = "RIGHT";
    scoreRef.current = 0;
    gameOverRef.current = false;
    startedRef.current = true;
    powerupRef.current = null;
    activeEffectsRef.current = [];
    particlesRef.current = [];
    scorePopupsRef.current = [];
    screenFlashRef.current = 0;
    lastTickRef.current = performance.now();
    setScore(0);
    setGameOver(false);
    setStarted(true);
    scheduleNextPowerup();
  }, [scheduleNextPowerup]);

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }

      if (e.key === "Enter" && (!startedRef.current || gameOverRef.current)) {
        resetGame();
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

      const current = dirRef.current;
      const key = e.key.toLowerCase();
      if ((key === "arrowup" || key === "w") && current !== "DOWN") {
        nextDirRef.current = "UP";
      } else if ((key === "arrowdown" || key === "s") && current !== "UP") {
        nextDirRef.current = "DOWN";
      } else if ((key === "arrowleft" || key === "a") && current !== "RIGHT") {
        nextDirRef.current = "LEFT";
      } else if ((key === "arrowright" || key === "d") && current !== "LEFT") {
        nextDirRef.current = "RIGHT";
      }
    },
    [onExit, resetGame]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Set title
  useEffect(() => {
    const prev = document.title;
    document.title = "Snake Game";
    return () => {
      document.title = prev;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Main game + render loop
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;

      // -- Resize canvas to match CSS size (retina-aware) --
      const wrapper = wrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const side = Math.min(rect.width, rect.height);
        const dpr = window.devicePixelRatio || 1;
        const pxSide = Math.round(side * dpr);
        if (canvas.width !== pxSide || canvas.height !== pxSide) {
          canvas.width = pxSide;
          canvas.height = pxSide;
          canvas.style.width = `${side}px`;
          canvas.style.height = `${side}px`;
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      const cellW = w / GRID_SIZE;
      const cellH = h / GRID_SIZE;

      // -- Game tick --
      if (startedRef.current && !gameOverRef.current) {
        const speed = getEffectiveSpeed();
        if (now - lastTickRef.current >= speed) {
          lastTickRef.current = now;

          // Apply buffered direction
          dirRef.current = nextDirRef.current;

          const currentSnake = snakeRef.current;
          const head = { ...currentSnake[0] };

          switch (dirRef.current) {
            case "UP": head.y -= 1; break;
            case "DOWN": head.y += 1; break;
            case "LEFT": head.x -= 1; break;
            case "RIGHT": head.x += 1; break;
          }

          // Wall collision / ghost wrap
          const ghostMode = hasEffect("ghost");
          if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            if (ghostMode) {
              head.x = ((head.x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
              head.y = ((head.y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
            } else {
              gameOverRef.current = true;
              setGameOver(true);
              // Save high score
              if (scoreRef.current > highScoreRef.current) {
                highScoreRef.current = scoreRef.current;
                setHighScore(scoreRef.current);
                try { localStorage.setItem(HIGH_SCORE_KEY, String(scoreRef.current)); } catch { /* */ }
              }
              animFrameRef.current = requestAnimationFrame(tick);
              return;
            }
          }

          // Self collision
          if (posInList(head, currentSnake)) {
            gameOverRef.current = true;
            setGameOver(true);
            if (scoreRef.current > highScoreRef.current) {
              highScoreRef.current = scoreRef.current;
              setHighScore(scoreRef.current);
              try { localStorage.setItem(HIGH_SCORE_KEY, String(scoreRef.current)); } catch { /* */ }
            }
            animFrameRef.current = requestAnimationFrame(tick);
            return;
          }

          const newSnake = [head, ...currentSnake];
          const currentFood = foodRef.current;

          if (posEq(head, currentFood)) {
            // Determine points
            let pts = 1;
            const doubleEffect = activeEffectsRef.current.find((e) => e.kind === "double");
            if (doubleEffect) {
              pts = 2;
              if (doubleEffect.remaining !== undefined) {
                doubleEffect.remaining -= 1;
                if (doubleEffect.remaining <= 0) {
                  activeEffectsRef.current = activeEffectsRef.current.filter((e) => e !== doubleEffect);
                }
              }
            }

            scoreRef.current += pts;
            setScore(scoreRef.current);

            const newFood = randomFreeCell(newSnake);
            foodRef.current = newFood;

            // Effects
            screenFlashRef.current = 0.25;
            spawnParticles(
              (head.x + 0.5) * cellW,
              (head.y + 0.5) * cellH,
              FOOD_COLOR
            );
            addScorePopup(head.x, head.y, pts);
          } else {
            newSnake.pop();
          }

          // Check powerup pickup
          const pu = powerupRef.current;
          if (pu && posEq(head, pu.pos)) {
            const meta = POWERUP_META[pu.kind];
            if (pu.kind === "double") {
              activeEffectsRef.current.push({ kind: "double", expiresAt: Infinity, remaining: 5 });
            } else {
              // Remove existing effect of same kind, then add
              activeEffectsRef.current = activeEffectsRef.current.filter((e) => e.kind !== pu.kind);
              activeEffectsRef.current.push({ kind: pu.kind, expiresAt: now + meta.duration });
            }
            powerupRef.current = null;
            spawnParticles(
              (head.x + 0.5) * cellW,
              (head.y + 0.5) * cellH,
              meta.color
            );
          }

          snakeRef.current = newSnake;

          // Expire powerup on the ground
          if (powerupRef.current && now - powerupRef.current.spawnedAt > POWERUP_LIFETIME) {
            powerupRef.current = null;
          }

          // Expire active effects (time-based)
          activeEffectsRef.current = activeEffectsRef.current.filter((e) => {
            if (e.kind === "double") return (e.remaining ?? 0) > 0;
            return now < e.expiresAt;
          });

          // Spawn powerup
          if (!powerupRef.current && now >= nextPowerupTimeRef.current) {
            const kinds: PowerupKind[] = ["speed", "slow", "ghost", "double"];
            const kind = kinds[Math.floor(Math.random() * kinds.length)];
            const occupied = [...newSnake, foodRef.current];
            powerupRef.current = { kind, pos: randomFreeCell(occupied), spawnedAt: now };
            scheduleNextPowerup();
          }
        }
      }

      // -- Update particles --
      const dt = 1 / 60; // approximate
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 1.8;
        return p.life > 0;
      });

      // -- Update score popups --
      scorePopupsRef.current = scorePopupsRef.current.filter((sp) => {
        sp.y -= dt * 1.2;
        sp.life -= dt * 1.5;
        return sp.life > 0;
      });

      // -- Decay screen flash --
      if (screenFlashRef.current > 0) {
        screenFlashRef.current = Math.max(0, screenFlashRef.current - dt * 2);
      }

      // ===================================================================
      // RENDER
      // ===================================================================
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = GRID_LINE_COLOR;
      ctx.lineWidth = 1;
      for (let i = 1; i < GRID_SIZE; i++) {
        const x = Math.round(i * cellW);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        const y = Math.round(i * cellH);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Border
      ctx.strokeStyle = BORDER_COLOR;
      ctx.lineWidth = 2;
      // If ghost mode active, make border dashed/dim
      if (hasEffect("ghost")) {
        ctx.strokeStyle = "rgba(226,232,240,0.35)";
        ctx.setLineDash([8, 6]);
      }
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.setLineDash([]);

      const snake = snakeRef.current;
      const food = foodRef.current;
      const powerup = powerupRef.current;

      // -- Food (pulsing glow) --
      {
        const pulse = 0.5 + 0.5 * Math.sin(now / 300);
        const cx = (food.x + 0.5) * cellW;
        const cy = (food.y + 0.5) * cellH;
        const r = cellW * 0.38;

        // Glow
        ctx.save();
        ctx.shadowColor = FOOD_COLOR;
        ctx.shadowBlur = 8 + pulse * 10;
        ctx.fillStyle = FOOD_COLOR;
        ctx.beginPath();
        ctx.arc(cx, cy, r + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // -- Powerup (floating, bobbing, icon) --
      if (powerup) {
        const meta = POWERUP_META[powerup.kind];
        const bob = Math.sin(now / 250) * 2.5;
        const cx = (powerup.pos.x + 0.5) * cellW;
        const cy = (powerup.pos.y + 0.5) * cellH + bob;
        const r = cellW * 0.4;

        // Time remaining indicator (ring that shrinks)
        const elapsed = now - powerup.spawnedAt;
        const frac = 1 - elapsed / POWERUP_LIFETIME;

        ctx.save();
        ctx.shadowColor = meta.color;
        ctx.shadowBlur = 10 + Math.sin(now / 200) * 4;

        // Outer ring
        ctx.strokeStyle = meta.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Filled circle
        ctx.fillStyle = meta.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Icon text
        ctx.font = `${Math.round(cellW * 0.55)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = meta.color;
        ctx.fillText(meta.icon, cx, cy + 1);

        ctx.restore();
      }

      // Ghost mode: make entire snake semi-transparent
      if (hasEffect("ghost")) {
        ctx.globalAlpha = 0.55 + 0.15 * Math.sin(now / 200);
      }

      // -- Snake body (gradient from head color to dark) --
      const len = snake.length;
      for (let i = len - 1; i >= 1; i--) {
        const seg = snake[i];
        const t = i / Math.max(len - 1, 1);
        const color = lerpColor(SNAKE_COLOR, SNAKE_DARK, t);
        const px = seg.x * cellW;
        const py = seg.y * cellH;
        const pad = cellW * 0.08;

        ctx.fillStyle = color;
        ctx.beginPath();
        const br = cellW * 0.12;
        roundRect(ctx, px + pad, py + pad, cellW - pad * 2, cellH - pad * 2, br);
        ctx.fill();
      }

      // -- Snake head (brighter, larger, glow) --
      if (snake.length > 0) {
        const head = snake[0];
        const cx = (head.x + 0.5) * cellW;
        const cy = (head.y + 0.5) * cellH;
        const headSize = cellW * 0.52;

        ctx.save();
        ctx.shadowColor = SNAKE_COLOR;
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#6ee7a0"; // slightly brighter than body
        ctx.beginPath();
        ctx.arc(cx, cy, headSize, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright spot
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#bbf7d0";
        ctx.beginPath();
        ctx.arc(cx - headSize * 0.15, cy - headSize * 0.15, headSize * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Reset alpha after snake rendering
      ctx.globalAlpha = 1;

      // -- Particles --
      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // -- Score popups --
      for (const sp of scorePopupsRef.current) {
        ctx.globalAlpha = sp.life;
        ctx.fillStyle = "#facc15";
        ctx.font = `bold ${Math.round(cellW * 0.6)}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sp.text, (sp.x + 0.5) * cellW, (sp.y + 0.5) * cellH);
      }
      ctx.globalAlpha = 1;

      // -- Screen flash --
      if (screenFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255,255,255,${screenFlashRef.current})`;
        ctx.fillRect(0, 0, w, h);
      }

      // -- Game Over overlay (drawn on canvas) --
      if (gameOverRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.82)";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = FOOD_COLOR;
        ctx.font = `bold ${Math.round(w * 0.065)}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", w / 2, h * 0.38);

        ctx.fillStyle = SNAKE_COLOR;
        ctx.font = `${Math.round(w * 0.04)}px "JetBrains Mono", monospace`;
        ctx.fillText(`Score: ${scoreRef.current}`, w / 2, h * 0.48);

        if (highScoreRef.current > 0) {
          ctx.fillStyle = "#facc15";
          ctx.font = `${Math.round(w * 0.03)}px "JetBrains Mono", monospace`;
          ctx.fillText(`High Score: ${highScoreRef.current}`, w / 2, h * 0.54);
        }

        // Pulsing "ENTER to restart"
        const pAlpha = 0.5 + 0.5 * Math.sin(now / 500);
        ctx.globalAlpha = pAlpha;
        ctx.fillStyle = "#9ca3af";
        ctx.font = `${Math.round(w * 0.03)}px "JetBrains Mono", monospace`;
        ctx.fillText("ENTER to restart", w / 2, h * 0.62);
        ctx.globalAlpha = 1;

        ctx.fillStyle = "#4b5563";
        ctx.font = `${Math.round(w * 0.025)}px "JetBrains Mono", monospace`;
        ctx.fillText("ESC to exit", w / 2, h * 0.68);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [started, getEffectiveSpeed, hasEffect, scheduleNextPowerup, spawnParticles, addScorePopup]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Compute active effects for HUD (read from refs each React render)
  const activeEffects = activeEffectsRef.current;
  const currentSpeed = Math.max(
    MIN_SPEED,
    INITIAL_SPEED - Math.floor(score / SPEED_INCREMENT_INTERVAL) * 10
  );
  const speedLevel = Math.floor((INITIAL_SPEED - currentSpeed) / 10) + 1;

  if (!started) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: SNAKE_COLOR }}
      >
        <div className="text-2xl font-bold tracking-[4px]">SNAKE</div>
        <div className="text-xs text-[#6b7280] mt-2">Arrow keys or WASD to move</div>
        <div className="text-xs text-[#6b7280]">Eat the red food to grow</div>
        <div className="text-xs text-[#6b7280] mt-1" style={{ color: "#22d3ee" }}>
          Collect powerups for special abilities!
        </div>
        <div className="text-sm mt-6 animate-[pulse_1.5s_ease-in-out_infinite]" style={{ color: SNAKE_COLOR }}>
          Press ENTER to start
        </div>
        <div className="text-[11px] text-[#4b5563] mt-4">ESC to exit</div>
        {highScore > 0 && (
          <div className="text-xs mt-2" style={{ color: "#facc15" }}>
            High Score: {highScore}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center h-full"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* HUD */}
      <div className="flex justify-between items-center w-full px-2 py-2 text-sm tracking-wider" style={{ color: SNAKE_COLOR }}>
        <div className="flex items-center gap-4">
          <span>SCORE: {score}</span>
          <span className="text-xs" style={{ color: "#6b7280" }}>
            SPD: {speedLevel}
          </span>
          {highScore > 0 && (
            <span className="text-xs" style={{ color: "#facc15" }}>
              HI: {highScore}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Active powerup indicators */}
          <ActiveEffectIndicators effects={activeEffects} />
          <span className="text-[#4b5563] text-[11px]">ESC to exit</span>
        </div>
      </div>

      {/* Game canvas */}
      <div
        ref={wrapperRef}
        className="flex-1 flex items-center justify-center w-full min-h-0 px-2 pb-2"
      >
        <canvas
          ref={canvasRef}
          style={{
            aspectRatio: "1",
            maxWidth: "100%",
            maxHeight: "100%",
            border: "none",
            imageRendering: "auto",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: active effect indicators in HUD
// ---------------------------------------------------------------------------
function ActiveEffectIndicators({ effects }: { effects: ActiveEffect[] }) {
  // Force re-render every 100ms so timers update
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  if (effects.length === 0) return null;

  const now = performance.now();

  return (
    <>
      {effects.map((e, i) => {
        const meta = POWERUP_META[e.kind];
        let timeText: string;
        if (e.kind === "double") {
          timeText = `${e.remaining ?? 0} left`;
        } else {
          const remaining = Math.max(0, Math.ceil((e.expiresAt - now) / 1000));
          timeText = `${remaining}s`;
        }
        return (
          <span
            key={`${e.kind}-${i}`}
            className="text-[11px] px-1.5 py-0.5 rounded"
            style={{
              color: meta.color,
              border: `1px solid ${meta.color}`,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            {meta.icon} {meta.label} {timeText}
          </span>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Canvas helper: rounded rect
// ---------------------------------------------------------------------------
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
