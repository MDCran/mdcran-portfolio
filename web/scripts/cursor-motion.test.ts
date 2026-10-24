import assert from "node:assert/strict";
import test from "node:test";
import { clampCursor, cursorTrajectory } from "../src/lib/cursor-motion";

test("movement begins and ends exactly at the requested positions", () => {
  for (const to of [{ x: 900, y: 80 }, { x: 12, y: 650 }, { x: 125, y: 127 }]) {
    const path = cursorTrajectory({ x: 120, y: 130 }, to);
    assert.equal(path.x[0], 120); assert.equal(path.y[0], 130);
    assert.equal(path.x.at(-1), to.x); assert.equal(path.y.at(-1), to.y);
    assert.ok(path.x.every(Number.isFinite) && path.y.every(Number.isFinite));
  }
});

test("cursor speeds up through the middle and eases into the target without overshooting", () => {
  const path = cursorTrajectory({ x: 0, y: 0 }, { x: 1000, y: 0 });
  const step = (i: number) => Math.hypot(path.x[i + 1] - path.x[i], path.y[i + 1] - path.y[i]);
  assert.ok(step(0) < step(19) / 20);
  assert.ok(step(39) < step(19) / 20);
  assert.ok(path.x.every((value, i) => value >= 0 && value <= 1000 && (!i || value >= path.x[i - 1])));
  assert.ok(Math.max(...path.y) > 0 && Math.max(...path.y) < 56, "gentle arc rather than a straight jump or large detour");
  const reverse = cursorTrajectory({ x: 0, y: 0 }, { x: 1000, y: 0 }, -1);
  assert.ok(Math.min(...reverse.y) < 0);
});

test("longer moves take more time while short clicks and screen crossings stay responsive", () => {
  const short = cursorTrajectory({ x: 0, y: 0 }, { x: 10, y: 0 });
  const long = cursorTrajectory({ x: 0, y: 0 }, { x: 2000, y: 1000 });
  assert.ok(short.duration < long.duration);
  assert.ok(long.duration <= 0.76, "tour navigation waits 900ms before clicking");
  assert.equal(cursorTrajectory({ x: 40, y: 40 }, { x: 40, y: 40 }).duration, 0);
});

test("viewport clamping keeps the cursor visible without moving top navigation targets down", () => {
  assert.deepEqual(clampCursor({ x: -100, y: -40 }, 390, 844), { x: 8, y: 8 });
  assert.deepEqual(clampCursor({ x: 500, y: 1000 }, 390, 844), { x: 366, y: 812 });
  assert.deepEqual(clampCursor({ x: 100, y: 30 }, 390, 844), { x: 100, y: 30 });
});
