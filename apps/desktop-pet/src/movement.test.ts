import { describe, expect, it } from "vitest";

import { MovementController } from "./movement";

// Runs the controller at a fixed tick rate and sums emitted pixels.
function run(
  controller: MovementController,
  fromMs: number,
  toMs: number,
  tickMs: number,
  direction: 1 | -1,
): number {
  let total = 0;
  for (let t = fromMs; t <= toMs; t += tickMs) {
    total += controller.step(t, direction);
  }
  return total;
}

describe("MovementController", () => {
  it("moves at the configured speed once ramped (time-based, not frame-based)", () => {
    const controller = new MovementController({ speedPxPerSec: 40, rampMs: 0 });
    // 60Hz for 2 simulated seconds.
    const total = run(controller, 0, 2_000, 16, 1);
    expect(total).toBeGreaterThanOrEqual(76); // ~80px minus quantization
    expect(total).toBeLessThanOrEqual(81);
  });

  it("produces the same distance at 60Hz and 120Hz tick rates", () => {
    const at60 = run(new MovementController({ speedPxPerSec: 40, rampMs: 0 }), 0, 3_000, 16, 1);
    const at120 = run(new MovementController({ speedPxPerSec: 40, rampMs: 0 }), 0, 3_000, 8, 1);
    expect(Math.abs(at60 - at120)).toBeLessThanOrEqual(2);
  });

  it("ramps up from standstill instead of jumping to full speed", () => {
    const controller = new MovementController({ speedPxPerSec: 40, rampMs: 200 });
    // First 100ms of walking (after the baseline tick) covers roughly a quarter
    // of full-speed distance (triangular ramp), well under the un-ramped 4px.
    let total = 0;
    for (let t = 0; t <= 100; t += 16) {
      total += controller.step(t, 1);
    }
    expect(total).toBeLessThanOrEqual(2);
  });

  it("ramps through zero on direction flips rather than reversing instantly", () => {
    const controller = new MovementController({ speedPxPerSec: 40, rampMs: 200 });
    run(controller, 0, 1_000, 16, 1); // fully ramped rightwards
    // Immediately after the flip the emitted step must not be a full-speed
    // leftwards jump; the velocity needs time to decay through zero.
    let flipped = 0;
    for (let t = 1_016; t <= 1_100; t += 16) {
      flipped += controller.step(t, -1);
    }
    expect(flipped).toBeGreaterThanOrEqual(-1); // still braking, barely moved left
  });

  it("clamps a long gap (hidden window / sleep) instead of compensating it", () => {
    const controller = new MovementController({ speedPxPerSec: 40, rampMs: 0 });
    controller.step(0, 1); // baseline
    const step = controller.step(60_000, 1); // 1 minute later
    expect(Math.abs(step)).toBeLessThanOrEqual(10); // capped at maxTickMs worth
  });

  it("starts from a fresh baseline after reset (no stale delta)", () => {
    const controller = new MovementController({ speedPxPerSec: 40, rampMs: 0 });
    run(controller, 0, 500, 16, 1);
    controller.reset();
    expect(controller.step(10_000, 1)).toBe(0); // baseline tick only
  });

  it("respects the minimum step interval (bounded IPC rate)", () => {
    const controller = new MovementController({
      speedPxPerSec: 400,
      rampMs: 0,
      minStepIntervalMs: 25,
    });
    controller.step(0, 1);
    let emissions = 0;
    for (let t = 4; t <= 1_000; t += 4) {
      if (controller.step(t, 1) !== 0) {
        emissions += 1;
      }
    }
    expect(emissions).toBeLessThanOrEqual(41); // ≤ ~40Hz despite 250Hz ticks
  });
});
