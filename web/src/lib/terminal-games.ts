export type Cell = { x: number; y: number };

export function snakeSelfCollision(snake: Cell[], head: Cell, growing: boolean) {
  return (growing ? snake : snake.slice(0, -1)).some(cell => cell.x === head.x && cell.y === head.y);
}

export function pacmanTickMs(level: number) { return Math.max(90, 200 - (Math.max(1, level) - 1) * 12); }

export function nextPacmanRound(current: { score: number; lives: number; level: number }, advance: boolean) {
  return advance ? { ...current, level: current.level + 1 } : { score: 0, lives: 3, level: 1 };
}

export function pacmanCollision(previousPlayer: Cell, player: Cell, previousGhost: Cell, ghost: Cell) {
  return (player.x === ghost.x && player.y === ghost.y) ||
    (player.x === previousGhost.x && player.y === previousGhost.y && previousPlayer.x === ghost.x && previousPlayer.y === ghost.y);
}

/** A full board has no free cell; never spin indefinitely trying random cells. */
export function randomFreeCell(occupied: Cell[], size = 20): Cell | null {
  const taken = new Set(occupied.map(cell => `${cell.x},${cell.y}`));
  const free: Cell[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

export const INITIAL_PACMAN_MAZE: number[][] = [
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
