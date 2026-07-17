export const PET_STATES = [
  "idle",
  "walkLeft",
  "walkRight",
  "jump",
  "sleep",
  "interaction",
  // Expressive idle gestures and a multi-stage sleep "story".
  "wave",
  "groom",
  "lieDown",
  "sleepDeep",
  "turnBack",
  "backRest",
  "wakeFront",
  // Timed idle activities (typing at a laptop, reading a book).
  "working",
  "review",
] as const;

export type PetState = (typeof PET_STATES)[number];

export type AnimationConfig = {
  row: number;
  frames: number;
  frameDurationMs: number;
  loop: boolean;
  // Play 0..N-1..0 instead of wrapping to frame 0, hiding a hard loop seam.
  pingPong?: boolean;
  // For non-loop animations: keep showing the last frame this long before the
  // completion is reported (e.g. stay lying down after a lie-down transition).
  holdLastFrameMs?: number;
};

// Per-pet auto-walk tuning. Defaults preserve the original engine behaviour.
export type MovementConfig = {
  speedPxPerSec: number;
  rampMs: number;
};

// Per-pet idle-behaviour pacing. Defaults preserve the original engine values,
// so pets without a "behavior" block are unaffected.
export type BehaviorConfig = {
  idleMinMs: number;
  idleMaxMs: number;
  activityHoldMinMs: number;
  activityHoldMaxMs: number;
  // Minimum wall-clock gap before the same special action may repeat.
  specialCooldownMs: number;
  // Never pick the same idle action twice in a row when alternatives exist.
  noImmediateRepeat: boolean;
};

export type PetConfig = {
  id: string;
  displayName: string;
  description?: string;
  spritesheet: string;
  atlas: {
    columns: number;
    rows: number;
  };
  defaultScale: number;
  // "pixelated" (default) suits pixel art; "smooth" suits photographic pets.
  rendering: "pixelated" | "smooth";
  movement?: Partial<MovementConfig>;
  behavior?: Partial<BehaviorConfig>;
  animations: Record<string, AnimationConfig>;
};

export type StoredPosition = {
  x: number;
  y: number;
};

export type AppSettings = {
  position: StoredPosition | null;
  scale: number;
  alwaysOnTop: boolean;
  autoMove: boolean;
  autostart: boolean;
  selectedPet: string;
};

export type MovementResult = {
  x: number;
  y: number;
  hitLeft: boolean;
  hitRight: boolean;
  hitTop: boolean;
  hitBottom: boolean;
};
