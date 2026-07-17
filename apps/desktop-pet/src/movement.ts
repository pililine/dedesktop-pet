// Pure auto-walk math: time-based velocity with a short start/turn ramp and a
// sub-pixel accumulator, emitting whole-pixel steps at a bounded rate. Keeping
// this free of IPC/DOM makes the smoothness rules unit-testable.

export type MovementOptions = {
  speedPxPerSec: number;
  // Time to ramp from 0 to full speed (also applies through direction flips).
  rampMs: number;
  // Minimum wall-clock gap between two emitted steps (bounds IPC rate).
  minStepIntervalMs: number;
  // Upper bound on a single tick's elapsed time, so a hidden window or system
  // sleep can never be compensated into one large jump.
  maxTickMs: number;
};

export const DEFAULT_MOVEMENT_OPTIONS: MovementOptions = {
  speedPxPerSec: 48,
  rampMs: 0,
  minStepIntervalMs: 25,
  maxTickMs: 250,
};

export class MovementController {
  private readonly options: MovementOptions;
  private velocity = 0;
  private accumulator = 0;
  private lastTickAt: number | null = null;
  private lastEmitAt: number | null = null;

  constructor(options: Partial<MovementOptions> = {}) {
    this.options = { ...DEFAULT_MOVEMENT_OPTIONS, ...options };
  }

  /** Clears all timing state; the next walking tick starts from standstill. */
  reset(): void {
    this.velocity = 0;
    this.accumulator = 0;
    this.lastTickAt = null;
    this.lastEmitAt = null;
  }

  /**
   * Advances the walk by one animation tick. Returns the whole-pixel step to
   * apply now (0 when below one pixel or rate-limited). `direction` is +1
   * (right) or -1 (left); flipping it ramps the velocity through zero instead
   * of reversing instantly.
   */
  step(now: number, direction: 1 | -1): number {
    if (this.lastTickAt === null) {
      // Fresh baseline after idle/drag/hide: no stale delta, start ramping.
      this.lastTickAt = now;
      this.lastEmitAt = now;
      return 0;
    }

    const dt = Math.min(this.options.maxTickMs, now - this.lastTickAt);
    this.lastTickAt = now;
    if (dt <= 0) {
      return 0;
    }

    const target = direction * this.options.speedPxPerSec;
    if (this.options.rampMs <= 0) {
      this.velocity = target;
    } else {
      const maxDelta = (this.options.speedPxPerSec * dt) / this.options.rampMs;
      const diff = target - this.velocity;
      this.velocity += Math.sign(diff) * Math.min(Math.abs(diff), maxDelta);
    }

    this.accumulator += (this.velocity * dt) / 1000;

    const sinceEmit = this.lastEmitAt === null ? Infinity : now - this.lastEmitAt;
    if (Math.abs(this.accumulator) < 1 || sinceEmit < this.options.minStepIntervalMs) {
      return 0;
    }

    const step = Math.trunc(this.accumulator);
    this.accumulator -= step;
    this.lastEmitAt = now;
    return step;
  }
}
