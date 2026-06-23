import type { PetState } from "./types";

type StateMachineOptions = {
  availableStates: ReadonlySet<string>;
  random?: () => number;
  onStateChange?: (state: PetState) => void;
};

const IDLE_MIN_MS = 3_500;
const IDLE_MAX_MS = 8_000;

export class PetStateMachine {
  private readonly availableStates: ReadonlySet<string>;
  private readonly random: () => number;
  private readonly onStateChange: ((state: PetState) => void) | undefined;
  private currentState: PetState = "idle";
  private nextTransitionAt = 0;
  private paused = false;

  constructor(options: StateMachineOptions) {
    this.availableStates = options.availableStates;
    this.random = options.random ?? Math.random;
    this.onStateChange = options.onStateChange;
  }

  start(now: number): void {
    this.enter("idle", now);
  }

  getState(): PetState {
    return this.currentState;
  }

  tick(now: number): void {
    if (this.paused || now < this.nextTransitionAt) {
      return;
    }

    if (this.currentState === "idle") {
      this.enter(this.chooseIdleAction(), now);
      return;
    }

    if (
      this.currentState === "walkLeft" ||
      this.currentState === "walkRight" ||
      this.currentState === "sleep"
    ) {
      this.enter("idle", now);
    }
  }

  triggerInteraction(now: number): void {
    if (!this.paused) {
      this.enter("interaction", now);
    }
  }

  triggerJump(now: number): void {
    if (!this.paused) {
      this.enter("jump", now);
    }
  }

  onAnimationComplete(name: string, now: number): void {
    if (!this.paused && name === this.currentState && this.currentState !== "idle") {
      this.enter("idle", now);
    }
  }

  setDragging(dragging: boolean, now: number): void {
    this.paused = dragging;
    if (!dragging) {
      this.enter("idle", now);
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(now: number): void {
    this.paused = false;
    this.enter("idle", now);
  }

  bounce(now: number): void {
    if (this.currentState === "walkLeft") {
      this.enter("walkRight", now);
    } else if (this.currentState === "walkRight") {
      this.enter("walkLeft", now);
    }
  }

  private enter(requestedState: PetState, now: number): void {
    const resolvedState = this.resolveState(requestedState);
    this.currentState = resolvedState;
    this.nextTransitionAt = this.transitionDeadline(resolvedState, now);
    this.onStateChange?.(resolvedState);
  }

  private resolveState(requestedState: PetState): PetState {
    if (requestedState === "idle" || this.availableStates.has(requestedState)) {
      return requestedState;
    }
    return "idle";
  }

  private transitionDeadline(state: PetState, now: number): number {
    switch (state) {
      case "idle":
        return now + this.randomBetween(IDLE_MIN_MS, IDLE_MAX_MS);
      case "walkLeft":
      case "walkRight":
        return now + this.randomBetween(2_500, 5_000);
      case "sleep":
        return now + this.randomBetween(3_000, 7_000);
      case "jump":
      case "interaction":
        return Number.POSITIVE_INFINITY;
    }
  }

  private chooseIdleAction(): PetState {
    const candidates: PetState[] = ["walkLeft", "walkRight", "jump", "sleep"].filter((state) =>
      this.availableStates.has(state),
    ) as PetState[];

    if (candidates.length === 0) {
      return "idle";
    }

    const index = Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length));
    return candidates[index] ?? "idle";
  }

  private randomBetween(min: number, max: number): number {
    return min + this.random() * (max - min);
  }
}
