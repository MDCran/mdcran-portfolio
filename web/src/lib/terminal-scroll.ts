const clamp = (value: number, max: number) => Math.max(0, Math.min(value, Math.max(0, max)));

export function terminalWheelDelta(delta: number, mode: number, pageHeight: number) {
  return delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
}

/** One moving destination, so rapid wheel events and new text never restart an animation. */
export class TerminalScrollMotion {
  target: number | null = null;
  private time: number | null = null;

  moveTo(top: number, max: number) { this.target = clamp(top, max); }

  wheel(current: number, delta: number, max: number) {
    const reversing = this.target !== null && Math.sign(delta) !== Math.sign(this.target - current);
    this.moveTo((reversing ? current : this.target ?? current) + delta, max);
  }

  stop() { this.target = null; this.time = null; }

  step(current: number, now: number, max: number, reducedMotion = false) {
    if (this.target === null) return current;
    const target = clamp(this.target, max);
    const elapsed = this.time === null ? 16 : Math.min(64, Math.max(0, now - this.time));
    this.time = now;
    const next = reducedMotion ? target : current + (target - current) * (1 - Math.exp(-elapsed / 55));
    if (Math.abs(target - next) < 0.75) { this.stop(); return target; }
    this.target = target;
    return clamp(next, max);
  }
}
