"use client";
import { useGamePause } from "./useGamePause";
import { INITIAL_PACMAN_MAZE, nextPacmanRound, pacmanTickMs, pacmanCollision } from "@/lib/terminal-games";
import GameControls from "./GameControls";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const GRID_W = 15;
const GRID_H = 15;

const POWER_DURATION = 8000;

// 0=path, 1=wall, 2=dot, 3=power pellet
// prettier-ignore


type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Pos = { x: number; y: number };

interface Ghost {
  pos: Pos;
  prevPos: Pos;
  color: string;
  vulnerableColor: string;
}

interface PacmanGameProps {
  onExit: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cloneMaze(): number[][] {
  return INITIAL_PACMAN_MAZE.map((row) => [...row]);
}

function canMove(maze: number[][], x: number, y: number): boolean {
  const wx = ((x % GRID_W) + GRID_W) % GRID_W;
  const wy = ((y % GRID_H) + GRID_H) % GRID_H;
  return maze[wy]?.[wx] !== 1;
}

function getNeighbors(
  maze: number[][],
  pos: Pos
): { dir: Direction; pos: Pos }[] {
  const dirs: { dir: Direction; dx: number; dy: number }[] = [
    { dir: "UP", dx: 0, dy: -1 },
    { dir: "DOWN", dx: 0, dy: 1 },
    { dir: "LEFT", dx: -1, dy: 0 },
    { dir: "RIGHT", dx: 1, dy: 0 },
  ];
  const result: { dir: Direction; pos: Pos }[] = [];
  for (const d of dirs) {
    const nx = pos.x + d.dx;
    const ny = pos.y + d.dy;
    const wx = ((nx % GRID_W) + GRID_W) % GRID_W;
    const wy = ((ny % GRID_H) + GRID_H) % GRID_H;
    if (canMove(maze, wx, wy)) {
      result.push({ dir: d.dir, pos: { x: wx, y: wy } });
    }
  }
  return result;
}

function dist(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function countCollectibles(maze: number[][]): number {
  let count = 0;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (maze[y][x] === 2 || maze[y][x] === 3) count++;
    }
  }
  return count;
}

/** Direction angle in radians for pacman mouth orientation */
function dirAngle(dir: Direction): number {
  switch (dir) {
    case "RIGHT":
      return 0;
    case "DOWN":
      return Math.PI / 2;
    case "LEFT":
      return Math.PI;
    case "UP":
      return -Math.PI / 2;
  }
}

// ─── Wall edge helper ────────────────────────────────────────────────────────
// Returns which sides of a wall cell border non-wall cells, for drawing
// rounded neon outlines instead of filled blocks.

function isWall(maze: number[][], x: number, y: number): boolean {
  if (y < 0 || y >= GRID_H || x < 0 || x >= GRID_W) return true;
  return maze[y][x] === 1;
}

function makeInitialGhosts(): Ghost[] { return [
    {
      pos: { x: 6, y: 7 },
      prevPos: { x: 6, y: 7 },
      color: "#ef4444",
      vulnerableColor: "#60a5fa",
    },
    {
      pos: { x: 8, y: 7 },
      prevPos: { x: 8, y: 7 },
      color: "#f472b6",
      vulnerableColor: "#60a5fa",
    },
    { pos: { x: 5, y: 7 }, prevPos: { x: 5, y: 7 }, color: "#22d3ee", vulnerableColor: "#60a5fa" },
    { pos: { x: 9, y: 7 }, prevPos: { x: 9, y: 7 }, color: "#fb923c", vulnerableColor: "#60a5fa" },
  ]; }


// ─── Component ───────────────────────────────────────────────────────────────

export default function PacmanGame({ onExit }: PacmanGameProps) {
  // ── React state (for overlays / HUD that need re-render) ──
  const [started, setStarted] = useState(false);
  const [roundState, setRoundState] = useState<"ready" | "playing" | "cleared" | "over">("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const levelRef = useRef(1);
  const [highScore, setHighScore] = useState(0);
  const [powerActive, setPowerActive] = useState(false);
  const [powerRatio, setPowerRatio] = useState(0);

  // ── Refs for game state (mutated in tick, read in render) ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mazeRef = useRef<number[][]>(cloneMaze());
  const pacPosRef = useRef<Pos>({ x: 7, y: 9 });
  const pacPrevRef = useRef<Pos>({ x: 7, y: 9 });
  const dirRef = useRef<Direction>("LEFT");
  const desiredDirRef = useRef<Direction>("LEFT");
  const ghostsRef = useRef<Ghost[]>(makeInitialGhosts());
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const gameOverRef = useRef(false);
  const wonRef = useRef(false);
  const powerRef = useRef(false);
  const powerStartRef = useRef(0);
  const tickRef = useRef(0);
  const lastTickTimeRef = useRef(0);
  const startedRef = useRef(false);
  const movingRef = useRef(false);

  const rafRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Visual effect refs
  const shakeRef = useRef(0); // screen shake remaining ms
  const shakeStartRef = useRef(0);
  const flashRef = useRef(0); // power pellet flash remaining ms
  const flashStartRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number; alpha: number }[]>([]);

  // ── Canvas size state ──
  const cellSizeRef = useRef(0);
  const canvasWidthRef = useRef(0);
  const canvasHeightRef = useRef(0);

  const { paused, pausedRef, togglePause, resume } = useGamePause(duration => {
    powerStartRef.current += duration;
    lastTickTimeRef.current = performance.now();
  });
  const publishScore = useCallback(() => {
    setScore(scoreRef.current);
    let stored = 0;
    try { const value = Number(localStorage.getItem("pacman-high-score")); stored = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0; } catch { /* storage unavailable */ }
    const best = Math.max(stored, scoreRef.current);
    setHighScore(previous => Math.max(previous, best));
    try { if (best > stored) localStorage.setItem("pacman-high-score", String(best)); } catch { /* storage unavailable */ }
  }, []);

  // ── Reset ──

  const resetGame = useCallback((nextLevel = false) => {
    resume();
    const nextRound = nextPacmanRound({ score: scoreRef.current, lives: livesRef.current, level: levelRef.current }, nextLevel);
    const newMaze = cloneMaze();
    const newGhosts = makeInitialGhosts();

    mazeRef.current = newMaze;
    pacPosRef.current = { x: 7, y: 9 };
    pacPrevRef.current = { x: 7, y: 9 };
    dirRef.current = "LEFT";
    desiredDirRef.current = "LEFT";
    ghostsRef.current = newGhosts;
    scoreRef.current = nextRound.score;
    livesRef.current = nextRound.lives;
    levelRef.current = nextRound.level;
    gameOverRef.current = false;
    wonRef.current = false;
    powerRef.current = false;
    tickRef.current = 0;
    lastTickTimeRef.current = performance.now();
    shakeRef.current = 0;
    flashRef.current = 0;
    trailRef.current = [];



    startedRef.current = true;
    movingRef.current = false;

    publishScore();
    setLives(livesRef.current);
    setLevel(nextRound.level);
    setRoundState("ready");
    setStarted(true);
    setPowerActive(false);
  }, [resume, publishScore]);

  const resetPositions = useCallback(() => {
    pacPosRef.current = { x: 7, y: 9 };
    pacPrevRef.current = { x: 7, y: 9 };
    dirRef.current = "LEFT";
    desiredDirRef.current = "LEFT";
    ghostsRef.current = makeInitialGhosts();
    powerRef.current = false;
    setPowerActive(false);

  }, []);

  // ── Input ──

  const handleKeyDown = useCallback(
    (e: Pick<KeyboardEvent, "key" | "preventDefault">) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }

      if (e.key.toLowerCase() === "p" || e.key === " ") { e.preventDefault(); if (startedRef.current && !wonRef.current && !gameOverRef.current) togglePause(); return; }
      if (e.key === "Enter") { resetGame(wonRef.current); return; }
      if (pausedRef.current || wonRef.current || gameOverRef.current) return;

      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();
      let moved = false;
      if (key === "arrowup" || key === "w") {
        desiredDirRef.current = "UP";
        moved = true;
      } else if (key === "arrowdown" || key === "s") {
        desiredDirRef.current = "DOWN";
        moved = true;
      } else if (key === "arrowleft" || key === "a") {
        desiredDirRef.current = "LEFT";
        moved = true;
      } else if (key === "arrowright" || key === "d") {
        desiredDirRef.current = "RIGHT";
        moved = true;
      }
      if (moved && !movingRef.current) {
        setRoundState("playing");
        movingRef.current = true;
        lastTickTimeRef.current = performance.now();
      }
    },
    [onExit, resetGame, togglePause, pausedRef]
  );

  // ── Game tick ──

  const gameTick = useCallback(() => {
    if (pausedRef.current || gameOverRef.current || wonRef.current || !movingRef.current) return;
    if (powerRef.current && performance.now() - powerStartRef.current >= POWER_DURATION) { powerRef.current = false; setPowerActive(false); }

    tickRef.current += 1;
    lastTickTimeRef.current = performance.now();

    const maze = mazeRef.current;
    const pac = { ...pacPosRef.current };
    const prevPac = { x: pac.x, y: pac.y };

    // Move pacman — try desired direction first, fall back to current direction
    const tryDir = (d: Direction): { x: number; y: number } => {
      let tx = pac.x;
      let ty = pac.y;
      switch (d) {
        case "UP": ty -= 1; break;
        case "DOWN": ty += 1; break;
        case "LEFT": tx -= 1; break;
        case "RIGHT": tx += 1; break;
      }
      return { x: ((tx % GRID_W) + GRID_W) % GRID_W, y: ((ty % GRID_H) + GRID_H) % GRID_H };
    };

    const desired = tryDir(desiredDirRef.current);
    if (canMove(maze, desired.x, desired.y)) {
      dirRef.current = desiredDirRef.current;
      pac.x = desired.x;
      pac.y = desired.y;
    } else {
      // Can't go desired direction — keep going current direction
      const current = tryDir(dirRef.current);
      if (canMove(maze, current.x, current.y)) {
        pac.x = current.x;
        pac.y = current.y;
      }
      // If neither works, pacman stays still (wall in both directions)
    }

    // Add trail
    trailRef.current.push({ x: prevPac.x, y: prevPac.y, alpha: 0.5 });
    if (trailRef.current.length > 6) trailRef.current.shift();

    pacPrevRef.current = prevPac;
    pacPosRef.current = pac;

    // Collect
    const cell = maze[pac.y][pac.x];
    if (cell === 2) {
      maze[pac.y][pac.x] = 0;
      scoreRef.current += 10;
    } else if (cell === 3) {
      maze[pac.y][pac.x] = 0;
      scoreRef.current += 50;
      powerRef.current = true;
      powerStartRef.current = performance.now();
      setPowerActive(true);
      flashRef.current = 300;
      flashStartRef.current = performance.now();

    }

    // Win check
    if (countCollectibles(maze) === 0) {
      wonRef.current = true;
      setRoundState("cleared");
      scoreRef.current += 1000;
      publishScore();
      return;
    }

    // Move ghosts (every other tick)
    const ghosts = ghostsRef.current.map(ghost => ({ ...ghost, pos: { ...ghost.pos }, prevPos: { ...ghost.prevPos } }));
    if (tickRef.current % 2 === 0) {
      for (const [ghostIndex, ghost] of ghosts.entries()) {
        const neighbors = getNeighbors(maze, ghost.pos);
        if (neighbors.length === 0) continue;

        // Filter out previous position to prevent back-and-forth oscillation on mobile
        const noReverse = neighbors.filter(
          (n) => !(n.pos.x === ghost.prevPos.x && n.pos.y === ghost.prevPos.y)
        );
        const choices = noReverse.length > 0 ? noReverse : neighbors;

        ghost.prevPos = { ...ghost.pos };
        const chaseTarget = !powerRef.current;
        const target = ghostIndex === 1 ? { x: pac.x + (dirRef.current === "RIGHT" ? 2 : dirRef.current === "LEFT" ? -2 : 0), y: pac.y + (dirRef.current === "DOWN" ? 2 : dirRef.current === "UP" ? -2 : 0) }
          : ghostIndex === 3 && dist(ghost.pos, pac) < 4 ? { x: 1, y: 13 } : pac;
        const rand = Math.random();

        if (rand < 0.75) {
          if (chaseTarget) {
            choices.sort((a, b) => dist(a.pos, target) - dist(b.pos, target));
          } else {
            choices.sort((a, b) => dist(b.pos, pac) - dist(a.pos, pac));
          }
          ghost.pos = { ...choices[0].pos };
        } else {
          const ri = Math.floor(Math.random() * choices.length);
          ghost.pos = { ...choices[ri].pos };
        }
      }
    }

    // Collision check
    let lostLife = false;
    for (const [index, ghost] of ghosts.entries()) {
      if (pacmanCollision(prevPac, pac, ghostsRef.current[index].pos, ghost.pos)) {
        if (powerRef.current) {
          scoreRef.current += 200;
          ghost.prevPos = { ...ghost.pos };
          ghost.pos = { x: 7, y: 7 };
        } else {
          lostLife = true;
        }
      }
    }

    ghostsRef.current = ghosts;

    if (lostLife) {
      livesRef.current -= 1;
      shakeRef.current = 400;
      shakeStartRef.current = performance.now();
      if (livesRef.current <= 0) {
        gameOverRef.current = true;
        setRoundState("over");
        publishScore();
        setLives(0);
        return;
      }
      setLives(livesRef.current);
      resetPositions();
      movingRef.current = false;
      setRoundState("ready");
    }

    publishScore();
  }, [resetPositions, pausedRef, publishScore]);

  // ── Canvas rendering ──

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Calculate cell size to fit the grid with aspect ratio
    // Cap max cell size to prevent canvas from being too large
    const availW = rect.width - 8;
    const availH = rect.height - 8;
    const cellW = availW / GRID_W;
    const cellH = availH / GRID_H;
    const cellSize = Math.min(Math.floor(Math.min(cellW, cellH)), 32);

    const totalW = cellSize * GRID_W;
    const totalH = cellSize * GRID_H;

    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${totalH}px`;

    cellSizeRef.current = cellSize;
    canvasWidthRef.current = totalW;
    canvasHeightRef.current = totalH;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  const renderFrame = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cs = cellSizeRef.current;
      if (cs === 0) return;

      const totalW = canvasWidthRef.current;
      const totalH = canvasHeightRef.current;

      // Interpolation factor (0..1) from last tick
      const elapsed = now - lastTickTimeRef.current;
      const t = movingRef.current
        ? Math.min(elapsed / pacmanTickMs(levelRef.current), 1)
        : 0;

      // Screen shake offset
      let shakeX = 0;
      let shakeY = 0;
      if (shakeRef.current > 0) {
        const shakeElapsed = now - shakeStartRef.current;
        if (shakeElapsed < shakeRef.current) {
          const intensity = 4 * (1 - shakeElapsed / shakeRef.current);
          shakeX = (Math.random() - 0.5) * 2 * intensity;
          shakeY = (Math.random() - 0.5) * 2 * intensity;
        } else {
          shakeRef.current = 0;
        }
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // ── Background ──
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(-10, -10, totalW + 20, totalH + 20);

      const maze = mazeRef.current;

      // ── Draw maze walls ──
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (maze[y][x] !== 1) continue;

          const px = x * cs;
          const py = y * cs;

          // Draw wall fill
          ctx.fillStyle = "#0f1b33";
          ctx.fillRect(px, py, cs, cs);

          // Draw neon border edges only where adjacent to non-wall
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#3b82f6";
          ctx.shadowBlur = 6;

          if (!isWall(maze, x, y - 1)) {
            ctx.beginPath();
            ctx.moveTo(px, py + 0.5);
            ctx.lineTo(px + cs, py + 0.5);
            ctx.stroke();
          }
          if (!isWall(maze, x, y + 1)) {
            ctx.beginPath();
            ctx.moveTo(px, py + cs - 0.5);
            ctx.lineTo(px + cs, py + cs - 0.5);
            ctx.stroke();
          }
          if (!isWall(maze, x - 1, y)) {
            ctx.beginPath();
            ctx.moveTo(px + 0.5, py);
            ctx.lineTo(px + 0.5, py + cs);
            ctx.stroke();
          }
          if (!isWall(maze, x + 1, y)) {
            ctx.beginPath();
            ctx.moveTo(px + cs - 0.5, py);
            ctx.lineTo(px + cs - 0.5, py + cs);
            ctx.stroke();
          }

          ctx.shadowBlur = 0;
        }
      }

      // ── Draw dots and power pellets ──
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const cell = maze[y][x];
          const cx = x * cs + cs / 2;
          const cy = y * cs + cs / 2;

          if (cell === 2) {
            // Dot
            ctx.shadowColor = "#ffffff";
            ctx.shadowBlur = 4;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(cx, cy, cs * 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (cell === 3) {
            // Power pellet with pulse
            const pulse = 0.7 + 0.3 * Math.sin(now * 0.005);
            const r = cs * 0.25 * pulse;
            ctx.shadowColor = "#fbbf24";
            ctx.shadowBlur = 14 * pulse;
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // ── Pacman trail ──
      trailRef.current = trailRef.current.map(trail => ({ ...trail, alpha: trail.alpha - 0.008 }));
      for (const trail of trailRef.current) {
        if (trail.alpha > 0) {
          const tx = trail.x * cs + cs / 2;
          const ty = trail.y * cs + cs / 2;
          ctx.fillStyle = `rgba(250, 204, 21, ${trail.alpha * 0.3})`;
          ctx.shadowColor = "#facc15";
          ctx.shadowBlur = 8 * trail.alpha;
          ctx.beginPath();
          ctx.arc(tx, ty, cs * 0.3 * trail.alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      trailRef.current = trailRef.current.filter((tr) => tr.alpha > 0);

      // ── Interpolated pacman position ──
      const pacCur = pacPosRef.current;
      const pacPrev = pacPrevRef.current;
      let interpPacX = pacPrev.x + (pacCur.x - pacPrev.x) * t;
      let interpPacY = pacPrev.y + (pacCur.y - pacPrev.y) * t;

      // Handle wrap-around interpolation (tunnel)
      if (Math.abs(pacCur.x - pacPrev.x) > GRID_W / 2) {
        // Wrapping horizontally
        interpPacX = pacCur.x;
        interpPacY = pacCur.y;
      }
      if (Math.abs(pacCur.y - pacPrev.y) > GRID_H / 2) {
        interpPacY = pacCur.y;
        interpPacX = pacCur.x;
      }

      // Draw Pacman
      const pacPixelX = interpPacX * cs + cs / 2;
      const pacPixelY = interpPacY * cs + cs / 2;
      const pacRadius = cs * 0.42;
      const angle = dirAngle(dirRef.current);

      // Smooth mouth animation using time
      const mouthPhase = Math.sin(now * 0.012) * 0.5 + 0.5;
      const mouthAngle = 0.05 + mouthPhase * 0.65; // radians, ~3 to ~37 degrees

      ctx.save();
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(pacPixelX, pacPixelY);
      ctx.arc(
        pacPixelX,
        pacPixelY,
        pacRadius,
        angle + mouthAngle,
        angle + Math.PI * 2 - mouthAngle
      );
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // ── Ghosts ──
      const ghosts = ghostsRef.current;
      for (let i = 0; i < ghosts.length; i++) {
        const ghost = ghosts[i];
        const isPower = powerRef.current;
        const color = isPower ? ghost.vulnerableColor : ghost.color;

        // Interpolate ghost position
        let gx = ghost.prevPos.x + (ghost.pos.x - ghost.prevPos.x) * t;
        let gy = ghost.prevPos.y + (ghost.pos.y - ghost.prevPos.y) * t;

        // Handle wrap-around
        if (Math.abs(ghost.pos.x - ghost.prevPos.x) > GRID_W / 2) {
          gx = ghost.pos.x;
        }
        if (Math.abs(ghost.pos.y - ghost.prevPos.y) > GRID_H / 2) {
          gy = ghost.pos.y;
        }

        // Subtle wobble animation
        const wobble = Math.sin(now * 0.004 + i * 2) * cs * 0.02;

        const gpx = gx * cs + cs / 2 + wobble;
        const gpy = gy * cs + cs / 2;
        const gr = cs * 0.42;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;

        // Ghost body shape
        ctx.beginPath();
        ctx.arc(gpx, gpy - gr * 0.15, gr, Math.PI, 0);
        // Skirt bottom with wavy edge
        const skirtY = gpy + gr * 0.55;
        ctx.lineTo(gpx + gr, skirtY);
        const numWaves = 3;
        const waveWidth = (gr * 2) / numWaves;
        for (let w = 0; w < numWaves; w++) {
          const wx1 = gpx + gr - w * waveWidth - waveWidth * 0.5;
          const wx2 = gpx + gr - (w + 1) * waveWidth;
          const waveOffset = Math.sin(now * 0.005 + w + i) * cs * 0.025;
          ctx.quadraticCurveTo(
            wx1,
            skirtY - cs * 0.12 + waveOffset,
            wx2,
            skirtY
          );
        }
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Eyes
        if (isPower) {
          // Scared expression
          const eyeR = gr * 0.2;
          // X eyes
          const leyX = gpx - gr * 0.3;
          const reyX = gpx + gr * 0.3;
          const eyeY = gpy - gr * 0.2;

          ctx.strokeStyle = "white";
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";

          // Left X
          ctx.beginPath();
          ctx.moveTo(leyX - eyeR, eyeY - eyeR);
          ctx.lineTo(leyX + eyeR, eyeY + eyeR);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(leyX + eyeR, eyeY - eyeR);
          ctx.lineTo(leyX - eyeR, eyeY + eyeR);
          ctx.stroke();

          // Right X
          ctx.beginPath();
          ctx.moveTo(reyX - eyeR, eyeY - eyeR);
          ctx.lineTo(reyX + eyeR, eyeY + eyeR);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(reyX + eyeR, eyeY - eyeR);
          ctx.lineTo(reyX - eyeR, eyeY + eyeR);
          ctx.stroke();

          // Worried mouth
          const mouthY = gpy + gr * 0.15;
          ctx.beginPath();
          ctx.moveTo(gpx - gr * 0.35, mouthY);
          ctx.quadraticCurveTo(
            gpx - gr * 0.15,
            mouthY - cs * 0.08,
            gpx,
            mouthY
          );
          ctx.quadraticCurveTo(
            gpx + gr * 0.15,
            mouthY + cs * 0.08,
            gpx + gr * 0.35,
            mouthY
          );
          ctx.strokeStyle = "white";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          // Normal eyes
          const eyeR = gr * 0.22;
          const leyX = gpx - gr * 0.3;
          const reyX = gpx + gr * 0.3;
          const eyeY = gpy - gr * 0.15;

          // White sclera
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.ellipse(leyX, eyeY, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(reyX, eyeY, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Pupils - look toward pacman
          const dx = pacPixelX - gpx;
          const dy = pacPixelY - gpy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const pupilOffset = eyeR * 0.35;
          const pdx = (dx / len) * pupilOffset;
          const pdy = (dy / len) * pupilOffset;

          ctx.fillStyle = "#111";
          ctx.beginPath();
          ctx.arc(leyX + pdx, eyeY + pdy, eyeR * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(reyX + pdx, eyeY + pdy, eyeR * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ── Power pellet flash effect ──
      if (flashRef.current > 0) {
        const flashElapsed = now - flashStartRef.current;
        if (flashElapsed < flashRef.current) {
          const flashAlpha =
            0.3 * (1 - flashElapsed / flashRef.current);
          ctx.fillStyle = `rgba(251, 191, 36, ${flashAlpha})`;
          ctx.fillRect(0, 0, totalW, totalH);
        } else {
          flashRef.current = 0;
        }
      }

      ctx.restore();

      // ── Ready overlay (canvas-drawn) ──
      if (
        startedRef.current &&
        !movingRef.current &&
        !gameOverRef.current &&
        !wonRef.current
      ) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, 0, totalW, totalH);

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // READY! text
        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#facc15";
        ctx.font = `bold ${cs * 1.4}px 'JetBrains Mono', monospace`;
        ctx.fillText("READY!", totalW / 2, totalH / 2 - cs * 0.5);

        // Subtitle
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#9ca3af";
        ctx.font = `${cs * 0.5}px 'JetBrains Mono', monospace`;
        const subAlpha = 0.5 + 0.5 * Math.sin(now * 0.004);
        ctx.globalAlpha = subAlpha;
        ctx.fillText(
          "Press an arrow key to start",
          totalW / 2,
          totalH / 2 + cs * 0.8
        );
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // ── Game over / win overlay ──
      if (gameOverRef.current || wonRef.current) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
        ctx.fillRect(0, 0, totalW, totalH);

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const isWin = wonRef.current;
        const titleColor = isWin ? "#4ade80" : "#ef4444";

        ctx.shadowColor = titleColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = titleColor;
        ctx.font = `bold ${cs * 1.3}px 'JetBrains Mono', monospace`;
        ctx.fillText(
          isWin ? "LEVEL CLEARED!" : "GAME OVER",
          totalW / 2,
          totalH / 2 - cs * 1.2
        );

        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#facc15";
        ctx.font = `${cs * 0.8}px 'JetBrains Mono', monospace`;
        ctx.fillText(
          `Score: ${scoreRef.current}`,
          totalW / 2,
          totalH / 2
        );

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#9ca3af";
        ctx.font = `${cs * 0.5}px 'JetBrains Mono', monospace`;
        const enterAlpha = 0.5 + 0.5 * Math.sin(now * 0.004);
        ctx.globalAlpha = enterAlpha;
        ctx.fillText(
          isWin ? "ENTER for next level" : "ENTER to restart",
          totalW / 2,
          totalH / 2 + cs * 1.2
        );
        ctx.globalAlpha = 1;

        ctx.fillStyle = "#4b5563";
        ctx.font = `${cs * 0.4}px 'JetBrains Mono', monospace`;
        ctx.fillText(
          "ESC to exit",
          totalW / 2,
          totalH / 2 + cs * 2
        );
        ctx.restore();
      }
    },
    []
  );

  // ── Animation loop ──

  // ── Start / stop game loop + render loop ──

  useEffect(() => {
    if (!started) return;

    function animate(now: number) {
      renderFrame(now);
      rafRef.current = requestAnimationFrame(animate);
    }

    // Start animation loop
    lastTickTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);

    // Start game tick interval
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      gameTick();
      setPowerRatio(powerRef.current ? Math.max(0, 1 - (performance.now() - powerStartRef.current) / POWER_DURATION) : 0);
    }, pacmanTickMs(level));

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [started, renderFrame, gameTick, level, pausedRef]);

  // ── Keyboard listener ──

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Title ──

  useEffect(() => {
    const prev = document.title;
    document.title = "Pac-Man";
    return () => {
      document.title = prev;
    };
  }, []);

  // ── Canvas resize ──

  useEffect(() => {
    resizeCanvas();
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resizeCanvas, 200); };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => { clearTimeout(resizeTimer); window.removeEventListener("resize", handleResize); };
  }, [resizeCanvas]);

  // Also resize when started changes (container might change size)
  useEffect(() => {
    resizeCanvas();
  }, [started, resizeCanvas]);

  // ── Cleanup power timer on unmount ──

  useEffect(() => {
    return () => {

      cancelAnimationFrame(rafRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Start screen (before first game) ──

  if (!started) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: "#facc15",
          background: "#0a0a0a",
        }}
      >
        <div
          className="text-2xl font-bold tracking-[4px]"
          style={{
            textShadow: "0 0 20px #facc15, 0 0 40px #facc1580",
          }}
        >
          PAC-MAN
        </div>
        <div className="text-xs text-[#6b7280] mt-2">
          Arrow keys or WASD to move
        </div>
        <div className="text-xs text-[#6b7280]">Eat all dots to win</div>
        <div className="text-xs text-[#fbbf24] mt-1">
          Power pellets make ghosts vulnerable
        </div>
        <div
          className="text-sm text-[#facc15] mt-6 animate-[pulse_1.5s_ease-in-out_infinite]"
          style={{
            textShadow: "0 0 10px #facc15",
          }}
        >
          Press ENTER to start
        </div>
        <GameControls canPause={started && roundState !== "over" && roundState !== "cleared"} paused={paused} startLabel="Start" onKey={key => handleKeyDown({ key, preventDefault() {} })} />
        <div className="text-[11px] text-[#4b5563] mt-4">ESC to exit</div>
      </div>
    );
  }

  // ── Main game UI ──

  return (
    <div
      className="flex flex-col items-center h-full"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: "#0a0a0a",
      }}
    >
      {/* HUD */}
      <div
        className="flex flex-wrap justify-between items-center gap-2 w-full px-3 py-2 text-sm tracking-wider"
        style={{ color: "#facc15", textShadow: "0 0 8px #facc1580" }}
      >
        {/* Score */}
        <span style={{ minWidth: "120px" }}>
          SCORE:{" "}
          <span
            style={{
              textShadow: "0 0 12px #facc15",
            }}
          >
            {score}
          </span>
        </span>

        {/* Lives as pac-man icons */}
        <span className="flex items-center gap-1" role="img" aria-label={`${lives} lives remaining`}>
          {Array.from({ length: lives }, (_, i) => (
            <svg
              key={i}
              width="16"
              height="16"
              viewBox="0 0 20 20"
            >
              <path
                d={`M 10,10 L 15.88,6.12 A 8,8 0 1,1 15.88,13.88 Z`}
                fill="#facc15"
                style={{
                  filter: "drop-shadow(0 0 3px #facc15)",
                }}
              />
            </svg>
          ))}
        </span>

        {/* Level */}
        <span style={{ minWidth: "80px", textAlign: "right" }}>
          LVL {level}
        </span>
      </div>

      {/* Power mode timer bar */}
      {powerActive && (
        <div
          className="w-full px-3"
          style={{ height: "6px" }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#1a1a2e",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${powerRatio * 100}%`,
                height: "100%",
                background:
                  powerRatio > 0.3
                    ? "linear-gradient(90deg, #3b82f6, #60a5fa)"
                    : "linear-gradient(90deg, #ef4444, #f87171)",
                borderRadius: "3px",
                boxShadow:
                  powerRatio > 0.3
                    ? "0 0 8px #60a5fa"
                    : "0 0 8px #ef4444",
                transition: "width 0.1s linear",
              }}
            />
          </div>
        </div>
      )}

      <p role="status" className="text-[10px] text-[#facc15]/70">{roundState === "cleared" ? "Level cleared — choose Next level" : roundState === "over" ? "Game over" : roundState === "ready" ? "Ready — use arrows to move" : `Level ${level} · Lives ${lives}`} · Best: {highScore}</p>
      {paused && <p role="status" className="text-xs text-[#facc15]">Paused · press P or Resume to continue</p>}
      {/* Game canvas container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center w-full min-h-0 px-3 py-3 overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          style={{
            border: "1px solid #3b82f6",
            boxShadow: "0 0 16px rgba(59, 130, 246, 0.25)",
            borderRadius: "2px",
          }}
        />
      </div>

      <GameControls canPause={started && roundState !== "over" && roundState !== "cleared"} paused={paused} startLabel={roundState === "cleared" ? "Next level" : "Restart"} onKey={key => handleKeyDown({ key, preventDefault() {} })} />
      {/* Bottom hint */}
      <div
        className="pb-1 text-[11px] text-[#4b5563]"
        style={{ userSelect: "none" }}
      >
        ESC to exit
      </div>
    </div>
  );
}
