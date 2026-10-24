export interface CursorPoint { x: number; y: number }

/** A small hand-like arc with a gentle pickup and a precise, unhurried landing. */
export function cursorTrajectory(from: CursorPoint, to: CursorPoint, bend = 1) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return { x: [to.x], y: [to.y], duration: 0 };
  const arc = Math.min(56, distance * 0.12) * Math.max(-1, Math.min(1, bend));
  const nx = -dy / distance, ny = dx / distance;
  const first = { x: from.x + dx * 0.32 + nx * arc, y: from.y + dy * 0.32 + ny * arc };
  const second = { x: from.x + dx * 0.74 + nx * arc * 0.35, y: from.y + dy * 0.74 + ny * arc * 0.35 };
  const x: number[] = [], y: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const time = i / 40;
    // Minimum-jerk timing: velocity and acceleration settle at both ends.
    const t = time * time * time * (10 + time * (-15 + 6 * time));
    const u = 1 - t;
    x.push(u ** 3 * from.x + 3 * u ** 2 * t * first.x + 3 * u * t ** 2 * second.x + t ** 3 * to.x);
    y.push(u ** 3 * from.y + 3 * u ** 2 * t * first.y + 3 * u * t ** 2 * second.y + t ** 3 * to.y);
  }
  return { x, y, duration: Math.min(0.76, 0.2 + distance * 0.00048) };
}

export function clampCursor(point: CursorPoint, width: number, height: number): CursorPoint {
  return {
    x: Math.max(8, Math.min(width - 24, point.x)),
    y: Math.max(8, Math.min(height - 32, point.y)),
  };
}
