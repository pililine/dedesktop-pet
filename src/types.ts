export const PET_STATES = [
  "idle",
  "walkLeft",
  "walkRight",
  "jump",
  "sleep",
  "interaction",
] as const;

export type PetState = (typeof PET_STATES)[number];

export type AnimationConfig = {
  row: number;
  frames: number;
  frameDurationMs: number;
  loop: boolean;
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
