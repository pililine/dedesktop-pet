import type { BehaviorConfig, PetState } from "./types";

type StateMachineOptions = {
  availableStates: ReadonlySet<string>;
  random?: () => number;
  onStateChange?: (state: PetState) => void;
  // Per-pet pacing overrides; omitted fields keep the original engine values,
  // so existing pets behave exactly as before.
  behavior?: Partial<BehaviorConfig>;
};

const DEFAULT_BEHAVIOR: BehaviorConfig = {
  idleMinMs: 3_500,
  idleMaxMs: 8_000,
  activityHoldMinMs: 6_000,
  activityHoldMaxMs: 14_000,
  specialCooldownMs: 0,
  noImmediateRepeat: false,
};

// Idle actions subject to the special-action cooldown (walking/jumping may
// repeat freely; distinctive poses and props should not reappear back-to-back).
const SPECIAL_ACTIONS: ReadonlySet<PetState> = new Set([
  "wave",
  "groom",
  "working",
  "review",
  "lieDown",
  "sleep",
]);

export class PetStateMachine {
  private readonly availableStates: ReadonlySet<string>;
  private readonly random: () => number;
  private readonly onStateChange: ((state: PetState) => void) | undefined;
  private readonly behavior: BehaviorConfig;
  private currentState: PetState = "idle";
  private nextTransitionAt = 0;
  private paused = false;
  private lastIdleChoice: PetState | null = null;
  private readonly specialLastAt = new Map<PetState, number>();

  constructor(options: StateMachineOptions) {
    this.availableStates = options.availableStates;
    this.random = options.random ?? Math.random;
    this.onStateChange = options.onStateChange;
    this.behavior = { ...DEFAULT_BEHAVIOR, ...options.behavior };
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

    switch (this.currentState) {
      case "idle":
        this.enter(this.chooseIdleAction(now), now);
        return;
      // Held animations advance to the next stage when their timer elapses.
      case "sleepDeep":
        this.enter("turnBack", now);
        return;
      case "backRest":
        this.enter("wakeFront", now);
        return;
      case "walkLeft":
      case "walkRight":
      case "sleep":
      case "working":
      case "review":
        this.enter("idle", now);
        return;
      default:
        return;
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
    if (this.paused || name !== this.currentState) {
      return;
    }
    const next = this.completionNext(this.currentState);
    if (next !== null) {
      this.enter(next, now);
    }
  }

  // Where a finished non-looping animation goes next. Looping/timed states
  // (idle, walks, sleep, sleepDeep, backRest) never emit a completion, so they
  // map to null. The sleep story chains lieDown -> sleepDeep and turnBack ->
  // backRest; everything else settles back to idle.
  private completionNext(state: PetState): PetState | null {
    switch (state) {
      case "lieDown":
        return "sleepDeep";
      case "turnBack":
        return "backRest";
      case "wave":
      case "groom":
      case "jump":
      case "interaction":
      case "wakeFront":
        return "idle";
      default:
        return null;
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
        return now + this.randomBetween(this.behavior.idleMinMs, this.behavior.idleMaxMs);
      case "walkLeft":
      case "walkRight":
        return now + this.randomBetween(2_500, 5_000);
      case "sleep":
        return now + this.randomBetween(3_000, 7_000);
      case "sleepDeep":
        return now + this.randomBetween(6_000, 12_000);
      case "backRest":
        return now + this.randomBetween(5_000, 10_000);
      case "working":
      case "review":
        return (
          now + this.randomBetween(this.behavior.activityHoldMinMs, this.behavior.activityHoldMaxMs)
        );
      // Driven by animation completion rather than a timer.
      case "jump":
      case "interaction":
      case "wave":
      case "groom":
      case "lieDown":
      case "turnBack":
      case "wakeFront":
        return Number.POSITIVE_INFINITY;
    }
  }

  private chooseIdleAction(now: number): PetState {
    // Prefer the multi-stage sleep story when available, otherwise fall back to
    // the simple sleep so plainer pets still rest.
    const restState: PetState = this.availableStates.has("lieDown") ? "lieDown" : "sleep";
    let candidates: PetState[] = (
      [
        "walkLeft",
        "walkRight",
        "jump",
        "wave",
        "groom",
        "working",
        "review",
        restState,
      ] as PetState[]
    ).filter((state) => this.availableStates.has(state));

    // Rest the distinctive poses/props between appearances.
    if (this.behavior.specialCooldownMs > 0) {
      const cooled = candidates.filter((state) => {
        if (!SPECIAL_ACTIONS.has(state)) {
          return true;
        }
        const lastAt = this.specialLastAt.get(state);
        return lastAt === undefined || now - lastAt >= this.behavior.specialCooldownMs;
      });
      if (cooled.length > 0) {
        candidates = cooled;
      }
    }

    // Avoid picking the exact same action twice in a row when there's a choice.
    if (this.behavior.noImmediateRepeat && this.lastIdleChoice !== null && candidates.length > 1) {
      const varied = candidates.filter((state) => state !== this.lastIdleChoice);
      if (varied.length > 0) {
        candidates = varied;
      }
    }

    if (candidates.length === 0) {
      return "idle";
    }

    const index = Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length));
    const choice = candidates[index] ?? "idle";
    this.lastIdleChoice = choice;
    if (SPECIAL_ACTIONS.has(choice)) {
      this.specialLastAt.set(choice, now);
    }
    return choice;
  }

  private randomBetween(min: number, max: number): number {
    return min + this.random() * (max - min);
  }
}
