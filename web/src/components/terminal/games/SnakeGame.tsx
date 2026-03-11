"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 80;
const SPEED_INCREMENT_INTERVAL = 5;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

interface SnakeGameProps {
  onExit: () => void;
}

function getRandomFood(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

export default function SnakeGame({ onExit }: SnakeGameProps) {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const dirRef = useRef<Direction>("RIGHT");
  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Position>({ x: 5, y: 5 });
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    const initialFood = { x: 5, y: 5 };
    setSnake(initialSnake);
    setFood(initialFood);
    setScore(0);
    setGameOver(false);
    setStarted(true);
    dirRef.current = "RIGHT";
    snakeRef.current = initialSnake;
    foodRef.current = initialFood;
    scoreRef.current = 0;
    gameOverRef.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }

      if (e.key === "Enter" && gameOverRef.current) {
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

      const current = dirRef.current;
      const key = e.key.toLowerCase();
      if ((key === "arrowup" || key === "w") && current !== "DOWN") {
        dirRef.current = "UP";
      } else if ((key === "arrowdown" || key === "s") && current !== "UP") {
        dirRef.current = "DOWN";
      } else if ((key === "arrowleft" || key === "a") && current !== "RIGHT") {
        dirRef.current = "LEFT";
      } else if ((key === "arrowright" || key === "d") && current !== "LEFT") {
        dirRef.current = "RIGHT";
      }
    },
    [onExit, resetGame, started]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Snake Game";
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;

    const speed = Math.max(
      MIN_SPEED,
      INITIAL_SPEED - Math.floor(scoreRef.current / SPEED_INCREMENT_INTERVAL) * 10
    );

    const interval = setInterval(() => {
      if (gameOverRef.current) return;

      const currentSnake = snakeRef.current;
      const head = { ...currentSnake[0] };

      switch (dirRef.current) {
        case "UP": head.y -= 1; break;
        case "DOWN": head.y += 1; break;
        case "LEFT": head.x -= 1; break;
        case "RIGHT": head.x += 1; break;
      }

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      if (currentSnake.some((s) => s.x === head.x && s.y === head.y)) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      const newSnake = [head, ...currentSnake];
      const currentFood = foodRef.current;

      if (head.x === currentFood.x && head.y === currentFood.y) {
        const newScore = scoreRef.current + 1;
        scoreRef.current = newScore;
        setScore(newScore);
        const newFood = getRandomFood(newSnake);
        foodRef.current = newFood;
        setFood(newFood);
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
      setSnake(newSnake);
    }, speed);

    return () => clearInterval(interval);
  }, [started, gameOver, score]);

  const renderGrid = () => {
    const cells: React.ReactNode[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y;
        const isSnakeBody = !isSnakeHead && snake.some((s) => s.x === x && s.y === y);
        const isFood = food.x === x && food.y === y;

        let bg = "transparent";
        let border = "1px solid rgba(74, 222, 128, 0.05)";

        if (isSnakeHead) {
          bg = "#4ade80";
          border = "1px solid #22c55e";
        } else if (isSnakeBody) {
          bg = "#4ade80";
          border = "1px solid #166534";
        } else if (isFood) {
          bg = "#ef4242";
          border = "1px solid #dc2626";
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            style={{
              backgroundColor: bg,
              border,
              borderRadius: isFood ? "50%" : isSnakeHead ? "3px" : "1px",
              boxShadow: isSnakeHead
                ? "0 0 6px #4ade80"
                : isFood
                ? "0 0 8px #ef4242"
                : "none",
            }}
          />
        );
      }
    }
    return cells;
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4ade80" }}>
        <div className="text-2xl font-bold tracking-[4px]">SNAKE</div>
        <div className="text-xs text-[#6b7280] mt-2">Arrow keys or WASD to move</div>
        <div className="text-xs text-[#6b7280]">Eat the red food to grow</div>
        <div className="text-sm text-[#4ade80] mt-6 animate-[pulse_1.5s_ease-in-out_infinite]">
          Press ENTER to start
        </div>
        <div className="text-[11px] text-[#4b5563] mt-4">ESC to exit</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Score bar */}
      <div className="flex justify-between items-center w-full px-2 py-2 text-[#4ade80] text-sm tracking-wider">
        <span>SCORE: {score}</span>
        <span className="text-[#4b5563] text-[11px]">ESC to exit</span>
      </div>

      {/* Game board — fills available space */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 px-2 pb-2">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            border: "1px solid #4ade80",
            boxShadow: "0 0 12px rgba(74, 222, 128, 0.15)",
            aspectRatio: "1",
            width: "100%",
            maxWidth: "min(100%, calc(100vh - 200px))",
            maxHeight: "100%",
          }}
        >
          {renderGrid()}

          {gameOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.85)",
                gap: "12px",
              }}
            >
              <div className="text-2xl font-bold text-[#ef4242] tracking-[4px]">GAME OVER</div>
              <div className="text-base text-[#4ade80]">Score: {score}</div>
              <div className="text-sm text-[#9ca3af] mt-4 animate-[pulse_1.5s_ease-in-out_infinite]">ENTER to restart</div>
              <div className="text-[11px] text-[#4b5563]">ESC to exit</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
