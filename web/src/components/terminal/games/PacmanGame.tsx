"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const GRID_W = 15;
const GRID_H = 15;
const TICK_MS = 200;
const POWER_DURATION = 8000;

// 0=path, 1=wall, 2=dot, 3=power pellet
// prettier-ignore
const INITIAL_MAZE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,1,2,2,2,1,2,2,2,3,1],
  [1,2,1,1,2,1,2,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,2,1,1,2,1,2,1,1,2,1,2,1],
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
  [1,1,1,2,1,2,1,1,1,2,1,2,1,1,1],
  [0,0,2,2,1,2,2,2,2,2,1,2,2,0,0],
  [1,1,1,2,1,2,1,0,1,2,1,2,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,2,1,1,2,1,2,1,1,2,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,2,1,2,1,1,2,1],
  [1,3,2,2,2,1,2,2,2,1,2,2,2,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Pos = { x: number; y: number };

interface Ghost {
  pos: Pos;
  color: string;
  vulnerableColor: string;
}

interface PacmanGameProps {
  onExit: () => void;
}

function cloneMaze(): number[][] {
  return INITIAL_MAZE.map((row) => [...row]);
}

function canMove(maze: number[][], x: number, y: number): boolean {
  const wx = ((x % GRID_W) + GRID_W) % GRID_W;
  const wy = ((y % GRID_H) + GRID_H) % GRID_H;
  return maze[wy]?.[wx] !== 1;
}

function getNeighbors(maze: number[][], pos: Pos): { dir: Direction; pos: Pos }[] {
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

function distance(a: Pos, b: Pos): number {
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

/** Mouth rotation in degrees for each direction */
function mouthRotation(dir: Direction): number {
  switch (dir) {
    case "RIGHT": return 0;
    case "DOWN": return 90;
    case "LEFT": return 180;
    case "UP": return 270;
  }
}

export default function PacmanGame({ onExit }: PacmanGameProps) {
  const initialGhosts: Ghost[] = [
    { pos: { x: 6, y: 7 }, color: "#ef4444", vulnerableColor: "#60a5fa" },
    { pos: { x: 8, y: 7 }, color: "#f472b6", vulnerableColor: "#60a5fa" },
  ];

  const [maze, setMaze] = useState<number[][]>(cloneMaze);
  const [pacman, setPacman] = useState<Pos>({ x: 7, y: 9 });
  const [ghosts, setGhosts] = useState<Ghost[]>(initialGhosts);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [moving, setMoving] = useState(false);
  const [powerActive, setPowerActive] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(true);
  const [direction, setDirection] = useState<Direction>("LEFT");

  const dirRef = useRef<Direction>("LEFT");
  const pacRef = useRef<Pos>({ x: 7, y: 9 });
  const ghostsRef = useRef<Ghost[]>(initialGhosts);
  const mazeRef = useRef<number[][]>(cloneMaze());
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const gameOverRef = useRef(false);
  const wonRef = useRef(false);
  const powerRef = useRef(false);
  const tickRef = useRef(0);
  const powerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetGame = useCallback(() => {
    const newMaze = cloneMaze();
    const newGhosts: Ghost[] = [
      { pos: { x: 6, y: 7 }, color: "#ef4444", vulnerableColor: "#60a5fa" },
      { pos: { x: 8, y: 7 }, color: "#f472b6", vulnerableColor: "#60a5fa" },
    ];

    setMaze(newMaze);
    setPacman({ x: 7, y: 9 });
    setGhosts(newGhosts);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
    setStarted(true);
    setMoving(false);
    setPowerActive(false);
    setDirection("LEFT");

    mazeRef.current = newMaze;
    pacRef.current = { x: 7, y: 9 };
    dirRef.current = "LEFT";
    ghostsRef.current = newGhosts;
    scoreRef.current = 0;
    livesRef.current = 3;
    gameOverRef.current = false;
    wonRef.current = false;
    powerRef.current = false;
    tickRef.current = 0;

    if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
    powerTimerRef.current = null;
  }, []);

  const resetPositions = useCallback(() => {
    pacRef.current = { x: 7, y: 9 };
    dirRef.current = "LEFT";
    ghostsRef.current = [
      { pos: { x: 6, y: 7 }, color: "#ef4444", vulnerableColor: "#60a5fa" },
      { pos: { x: 8, y: 7 }, color: "#f472b6", vulnerableColor: "#60a5fa" },
    ];
    setPacman({ x: 7, y: 9 });
    setGhosts(ghostsRef.current);
    setDirection("LEFT");
    powerRef.current = false;
    setPowerActive(false);
    if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
    powerTimerRef.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }

      if (e.key === "Enter" && (gameOverRef.current || wonRef.current)) {
        resetGame();
        return;
      }

      if (!started && e.key === "Enter") {
        resetGame();
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();
      let moved = false;
      if (key === "arrowup" || key === "w") {
        dirRef.current = "UP"; moved = true;
      } else if (key === "arrowdown" || key === "s") {
        dirRef.current = "DOWN"; moved = true;
      } else if (key === "arrowleft" || key === "a") {
        dirRef.current = "LEFT"; moved = true;
      } else if (key === "arrowright" || key === "d") {
        dirRef.current = "RIGHT"; moved = true;
      }
      if (moved) setMoving(true);
    },
    [onExit, resetGame, started]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Pac-Man";
    return () => { document.title = prev; };
  }, []);

  // Game loop — only runs when player has started moving
  useEffect(() => {
    if (!started || !moving || gameOver || won) return;

    const interval = setInterval(() => {
      if (gameOverRef.current || wonRef.current) return;

      tickRef.current += 1;
      // Animate mouth open/close each tick
      setMouthOpen((prev) => !prev);

      const currentMaze = mazeRef.current;
      const pac = { ...pacRef.current };

      let nx = pac.x;
      let ny = pac.y;
      switch (dirRef.current) {
        case "UP": ny -= 1; break;
        case "DOWN": ny += 1; break;
        case "LEFT": nx -= 1; break;
        case "RIGHT": nx += 1; break;
      }

      nx = ((nx % GRID_W) + GRID_W) % GRID_W;
      ny = ((ny % GRID_H) + GRID_H) % GRID_H;

      if (canMove(currentMaze, nx, ny)) {
        pac.x = nx;
        pac.y = ny;
      }
      // Pacman always updates direction display even if can't move
      setDirection(dirRef.current);

      const cell = currentMaze[pac.y][pac.x];
      if (cell === 2) {
        currentMaze[pac.y][pac.x] = 0;
        scoreRef.current += 10;
      } else if (cell === 3) {
        currentMaze[pac.y][pac.x] = 0;
        scoreRef.current += 50;
        powerRef.current = true;
        setPowerActive(true);
        if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
        powerTimerRef.current = setTimeout(() => {
          powerRef.current = false;
          setPowerActive(false);
        }, POWER_DURATION);
      }

      pacRef.current = pac;

      if (countCollectibles(currentMaze) === 0) {
        wonRef.current = true;
        setWon(true);
        setScore(scoreRef.current);
        setMaze(currentMaze.map((r) => [...r]));
        setPacman(pac);
        return;
      }

      const currentGhosts = ghostsRef.current.map((g) => ({ ...g, pos: { ...g.pos } }));
      if (tickRef.current % 2 === 0) {
        for (const ghost of currentGhosts) {
          const neighbors = getNeighbors(currentMaze, ghost.pos);
          if (neighbors.length === 0) continue;

          const chaseTarget = !powerRef.current;
          const rand = Math.random();

          if (rand < 0.7) {
            if (chaseTarget) {
              neighbors.sort((a, b) => distance(a.pos, pac) - distance(b.pos, pac));
            } else {
              neighbors.sort((a, b) => distance(b.pos, pac) - distance(a.pos, pac));
            }
            ghost.pos = neighbors[0].pos;
          } else {
            const ri = Math.floor(Math.random() * neighbors.length);
            ghost.pos = neighbors[ri].pos;
          }
        }
      }

      let lostLife = false;
      for (let i = currentGhosts.length - 1; i >= 0; i--) {
        if (currentGhosts[i].pos.x === pac.x && currentGhosts[i].pos.y === pac.y) {
          if (powerRef.current) {
            scoreRef.current += 200;
            currentGhosts[i].pos = { x: 7, y: 7 };
          } else {
            lostLife = true;
          }
        }
      }

      ghostsRef.current = currentGhosts;

      if (lostLife) {
        livesRef.current -= 1;
        if (livesRef.current <= 0) {
          gameOverRef.current = true;
          setGameOver(true);
          setScore(scoreRef.current);
          setLives(0);
          setMaze(currentMaze.map((r) => [...r]));
          setPacman(pac);
          setGhosts(currentGhosts);
          return;
        }
        setLives(livesRef.current);
        resetPositions();
        setScore(scoreRef.current);
        setMaze(currentMaze.map((r) => [...r]));
        return;
      }

      setScore(scoreRef.current);
      setPacman(pac);
      setGhosts(currentGhosts);
      setMaze(currentMaze.map((r) => [...r]));
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [started, moving, gameOver, won, resetPositions]);

  useEffect(() => {
    return () => {
      if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
    };
  }, []);

  /** Render pacman as an SVG with animated mouth */
  const renderPacmanSVG = () => {
    const rot = mouthRotation(direction);
    const mouthAngle = mouthOpen ? 40 : 8;
    const startAngle = mouthAngle;
    const endAngle = 360 - mouthAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const r = 10;
    const x1 = r + r * Math.cos(startRad);
    const y1 = r + r * Math.sin(startRad);
    const x2 = r + r * Math.cos(endRad);
    const y2 = r + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return (
      <svg viewBox="0 0 20 20" width="100%" height="100%" style={{ transform: `rotate(${rot}deg)`, filter: "drop-shadow(0 0 4px #facc15)" }}>
        <path
          d={`M ${r},${r} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
          fill="#facc15"
        />
      </svg>
    );
  };

  /** Render ghost as SVG with cute face */
  const renderGhostSVG = (ghost: Ghost, idx: number) => {
    const color = powerActive ? ghost.vulnerableColor : ghost.color;
    const wobble = tickRef.current % 2 === 0 ? 0 : (idx % 2 === 0 ? -1 : 1);

    return (
      <svg viewBox="0 0 20 22" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 4px ${color})`, transform: `translateX(${wobble}px)` }}>
        {/* Body */}
        <path
          d={`M 2,20 L 2,8 Q 2,1 10,1 Q 18,1 18,8 L 18,20 L 15,17 L 12,20 L 10,18 L 8,20 L 5,17 Z`}
          fill={color}
        />
        {/* Eyes */}
        {powerActive ? (
          <>
            {/* Scared eyes — small horizontal lines */}
            <line x1="6" y1="9" x2="9" y2="9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="11" y1="9" x2="14" y2="9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            {/* Wavy scared mouth */}
            <path d="M 5,14 Q 7,12 9,14 Q 11,16 13,14 Q 15,12 16,14" fill="none" stroke="white" strokeWidth="1" />
          </>
        ) : (
          <>
            {/* Normal eyes — white sclera + dark pupil */}
            <ellipse cx="7" cy="9" rx="2.5" ry="3" fill="white" />
            <ellipse cx="13" cy="9" rx="2.5" ry="3" fill="white" />
            <circle cx="7.5" cy="9.5" r="1.2" fill="#111" />
            <circle cx="13.5" cy="9.5" r="1.2" fill="#111" />
            {/* Cute smile */}
            <path d="M 7,14 Q 10,17 13,14" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" strokeLinecap="round" />
          </>
        )}
      </svg>
    );
  };

  const renderGrid = () => {
    const cells: React.ReactNode[] = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const cell = maze[y][x];
        const isPacman = pacman.x === x && pacman.y === y;
        const ghostIdx = ghosts.findIndex((g) => g.pos.x === x && g.pos.y === y);
        const ghost = ghostIdx >= 0 ? ghosts[ghostIdx] : null;

        let bg = "transparent";
        let content: React.ReactNode = null;
        let border = "1px solid transparent";

        if (cell === 1) {
          bg = "#1e3a5f";
          border = "1px solid #2563eb";
        } else if (isPacman) {
          content = renderPacmanSVG();
        } else if (ghost) {
          content = renderGhostSVG(ghost, ghostIdx);
        } else if (cell === 2) {
          content = (
            <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#e5e7eb" }} />
          );
        } else if (cell === 3) {
          content = (
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#fbbf24", boxShadow: "0 0 6px #fbbf24", animation: "pelletPulse 1s ease-in-out infinite" }} />
          );
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            style={{ backgroundColor: bg, border, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}
          >
            {content}
          </div>
        );
      }
    }
    return cells;
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#facc15" }}>
        <div className="text-2xl font-bold tracking-[4px]">PAC-MAN</div>
        <div className="text-xs text-[#6b7280] mt-2">Arrow keys or WASD to move</div>
        <div className="text-xs text-[#6b7280]">Eat all dots to win</div>
        <div className="text-xs text-[#fbbf24] mt-1">Power pellets make ghosts vulnerable</div>
        <div className="text-sm text-[#facc15] mt-6 animate-[pulse_1.5s_ease-in-out_infinite]">
          Press ENTER to start
        </div>
        <div className="text-[11px] text-[#4b5563] mt-4">ESC to exit</div>
      </div>
    );
  }

  const overlayContent = (gameOver || won) && (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        gap: "12px",
        zIndex: 10,
      }}
    >
      <div className="text-2xl font-bold tracking-[4px]" style={{ color: won ? "#4ade80" : "#ef4242" }}>
        {won ? "YOU WIN!" : "GAME OVER"}
      </div>
      <div className="text-base text-[#facc15]">Score: {score}</div>
      <div className="text-sm text-[#9ca3af] mt-4 animate-[pulse_1.5s_ease-in-out_infinite]">ENTER to restart</div>
      <div className="text-[11px] text-[#4b5563]">ESC to exit</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center h-full" style={{ fontFamily: "'JetBrains Mono', monospace", animation: "none", transform: "none" }}>
      {/* HUD */}
      <div className="flex justify-between items-center w-full px-2 py-2 text-[#facc15] text-sm tracking-wider">
        <span>SCORE: {score}</span>
        <span>
          {"LIVES: "}
          {Array.from({ length: lives }, (_, i) => (
            <span key={i} style={{ color: "#facc15", marginLeft: "2px" }}>●</span>
          ))}
        </span>
        <span className="text-[#4b5563] text-[11px]">ESC</span>
      </div>

      {/* Game board — fills available space */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 px-2 pb-2">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_W}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_H}, 1fr)`,
            border: "1px solid #2563eb",
            boxShadow: "0 0 12px rgba(37, 99, 235, 0.2)",
            position: "relative",
            aspectRatio: "1",
            width: "100%",
            maxWidth: "min(100%, calc(100vh - 200px))",
            maxHeight: "100%",
          }}
        >
          {renderGrid()}
          {overlayContent}
          {started && !moving && !gameOver && !won && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.65)",
                gap: "8px",
                zIndex: 10,
              }}
            >
              <div className="text-xl font-bold tracking-[6px] text-[#facc15]">READY!</div>
              <div className="text-[11px] text-[#9ca3af] animate-[pulse_1.5s_ease-in-out_infinite]">
                Press an arrow key to start
              </div>
            </div>
          )}
        </div>
      </div>

      {powerActive && (
        <div className="py-1 text-[11px] text-[#60a5fa] tracking-wider animate-[pulse_0.5s_ease-in-out_infinite]">
          POWER ACTIVE
        </div>
      )}

      <style>{`
        @keyframes pelletPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
