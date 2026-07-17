// Pure frame-advancement logic shared by the animation player. Kept free of
// DOM/canvas so the scheduling rules are unit-testable.

export type SequencerState = {
  frame: number;
  // +1 forward, -1 backward (only relevant for ping-pong playback).
  direction: 1 | -1;
};

export type AdvanceResult = {
  frame: number;
  direction: 1 | -1;
  // True when a non-looping animation has reached (and holds) its final frame.
  completed: boolean;
};

/**
 * Advances one step of an animation.
 *
 * - Non-loop animations advance to the last frame and hold it (completed).
 * - Looping ping-pong plays 0..N-1..0 endlessly, hiding a hard 0/N-1 seam.
 * - Plain loops wrap to frame 0.
 * - A single-frame animation never advances.
 */
export function advanceFrame(
  state: SequencerState,
  frames: number,
  loop: boolean,
  pingPong: boolean,
): AdvanceResult {
  if (frames <= 1) {
    return { frame: 0, direction: 1, completed: !loop };
  }

  if (!loop) {
    if (state.frame + 1 < frames) {
      return { frame: state.frame + 1, direction: 1, completed: false };
    }
    return { frame: state.frame, direction: 1, completed: true };
  }

  if (pingPong) {
    let next = state.frame + state.direction;
    let direction = state.direction;
    if (next >= frames) {
      direction = -1;
      next = frames - 2;
    } else if (next < 0) {
      direction = 1;
      next = 1;
    }
    return { frame: next, direction, completed: false };
  }

  return { frame: (state.frame + 1) % frames, direction: 1, completed: false };
}
