import { describe, expect, it } from "vitest";

import { advanceFrame } from "./frame-sequencer";

describe("advanceFrame", () => {
  it("wraps a plain loop back to frame 0", () => {
    expect(advanceFrame({ frame: 7, direction: 1 }, 8, true, false)).toEqual({
      frame: 0,
      direction: 1,
      completed: false,
    });
  });

  it("bounces at both ends in ping-pong mode without repeating end frames", () => {
    // Forward to the end...
    expect(advanceFrame({ frame: 6, direction: 1 }, 8, true, true)).toEqual({
      frame: 7,
      direction: 1,
      completed: false,
    });
    // ...then turns around to 6 (no 7,7 stutter and no hard 7->0 seam).
    expect(advanceFrame({ frame: 7, direction: 1 }, 8, true, true)).toEqual({
      frame: 6,
      direction: -1,
      completed: false,
    });
    // Backwards to the start...
    expect(advanceFrame({ frame: 1, direction: -1 }, 8, true, true)).toEqual({
      frame: 0,
      direction: -1,
      completed: false,
    });
    // ...and forward again.
    expect(advanceFrame({ frame: 0, direction: -1 }, 8, true, true)).toEqual({
      frame: 1,
      direction: 1,
      completed: false,
    });
  });

  it("ping-pong visits every frame exactly twice per cycle except the ends", () => {
    let state = { frame: 0, direction: 1 as 1 | -1 };
    const visits = new Map<number, number>();
    for (let i = 0; i < 14; i++) {
      const next = advanceFrame(state, 8, true, true);
      state = { frame: next.frame, direction: next.direction };
      visits.set(next.frame, (visits.get(next.frame) ?? 0) + 1);
    }
    // One full 14-step cycle: middle frames twice, both ends once.
    expect(visits.get(0)).toBe(1);
    expect(visits.get(7)).toBe(1);
    for (let f = 1; f <= 6; f++) {
      expect(visits.get(f)).toBe(2);
    }
  });

  it("completes and holds the final frame of a non-loop animation", () => {
    expect(advanceFrame({ frame: 6, direction: 1 }, 8, false, false)).toEqual({
      frame: 7,
      direction: 1,
      completed: false,
    });
    expect(advanceFrame({ frame: 7, direction: 1 }, 8, false, false)).toEqual({
      frame: 7,
      direction: 1,
      completed: true,
    });
  });

  it("never advances a single-frame animation", () => {
    expect(advanceFrame({ frame: 0, direction: 1 }, 1, true, false).frame).toBe(0);
    expect(advanceFrame({ frame: 0, direction: 1 }, 1, false, false).completed).toBe(true);
  });
});
