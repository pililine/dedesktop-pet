import { describe, expect, it, vi } from "vitest";

import { PetStateMachine } from "./pet-state-machine";

describe("PetStateMachine", () => {
  it("falls back to idle when an interaction animation is missing", () => {
    const onStateChange = vi.fn();
    const machine = new PetStateMachine({
      availableStates: new Set(["idle"]),
      random: () => 0,
      onStateChange,
    });

    machine.start(0);
    machine.triggerInteraction(10);

    expect(machine.getState()).toBe("idle");
    expect(onStateChange).toHaveBeenLastCalledWith("idle");
  });

  it("returns to idle after a non-looping animation completes", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "jump"]),
      random: () => 0,
    });

    machine.start(0);
    machine.triggerJump(10);
    expect(machine.getState()).toBe("jump");

    machine.onAnimationComplete("jump", 200);
    expect(machine.getState()).toBe("idle");
  });

  it("changes direction when walking into an edge", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "walkLeft", "walkRight"]),
      random: () => 0,
    });

    machine.start(0);
    machine.tick(10_000);
    expect(machine.getState()).toBe("walkLeft");

    machine.bounce(10_100);
    expect(machine.getState()).toBe("walkRight");
  });

  it("pauses automatic transitions while dragging", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "walkLeft"]),
      random: () => 0,
    });

    machine.start(0);
    machine.setDragging(true, 100);
    machine.tick(20_000);
    expect(machine.getState()).toBe("idle");

    machine.setDragging(false, 20_000);
    expect(machine.getState()).toBe("idle");
  });

  it("returns to idle after a non-looping interaction completes", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "interaction"]),
      random: () => 0,
    });

    machine.start(0);
    machine.triggerInteraction(10);
    expect(machine.getState()).toBe("interaction");

    machine.onAnimationComplete("interaction", 200);
    expect(machine.getState()).toBe("idle");
  });

  it("falls back to idle when jump is unavailable", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle"]),
      random: () => 0,
    });

    machine.start(0);
    machine.triggerJump(10);
    expect(machine.getState()).toBe("idle");
  });

  it("does not enter sleep immediately after starting", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "sleep"]),
      random: () => 0,
    });

    machine.start(100);
    machine.tick(100);
    expect(machine.getState()).toBe("idle");
    // 100ms later, far below the 3.5s minimum idle window.
    machine.tick(200);
    expect(machine.getState()).toBe("idle");
  });

  it("resets the idle timer when the user interacts during sleep", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "sleep", "interaction"]),
      random: () => 0,
    });

    machine.start(0);
    machine.tick(4_000); // past idle deadline; only sleep is a candidate
    expect(machine.getState()).toBe("sleep");

    machine.triggerInteraction(4_100);
    expect(machine.getState()).toBe("interaction");

    machine.onAnimationComplete("interaction", 4_300);
    expect(machine.getState()).toBe("idle");

    // The fresh idle window must not immediately drop back into sleep.
    machine.tick(4_400);
    expect(machine.getState()).toBe("idle");
  });

  it("does not start new random behaviour while paused", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "walkLeft", "sleep"]),
      random: () => 0,
    });

    machine.start(0);
    machine.pause();
    machine.tick(100_000); // far past any transition deadline
    expect(machine.getState()).toBe("idle");

    machine.resume(100_000);
    expect(machine.getState()).toBe("idle");
  });

  it("stays consistent under rapid repeated interactions", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "interaction"]),
      random: () => 0,
    });

    machine.start(0);
    machine.triggerInteraction(10);
    machine.triggerInteraction(20);
    machine.triggerInteraction(30);
    expect(machine.getState()).toBe("interaction");

    machine.onAnimationComplete("interaction", 100);
    expect(machine.getState()).toBe("idle");
  });

  it("alternates walk direction symmetrically on each bounce", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "walkLeft", "walkRight"]),
      random: () => 0,
    });

    machine.start(0);
    machine.tick(10_000);
    expect(machine.getState()).toBe("walkLeft");

    machine.bounce(10_100);
    expect(machine.getState()).toBe("walkRight");

    machine.bounce(10_200);
    expect(machine.getState()).toBe("walkLeft");
  });

  it("plays the full sleep story: lieDown -> sleepDeep -> turnBack -> backRest -> wakeFront -> idle", () => {
    const machine = new PetStateMachine({
      availableStates: new Set([
        "idle",
        "lieDown",
        "sleepDeep",
        "turnBack",
        "backRest",
        "wakeFront",
      ]),
      random: () => 0,
    });

    machine.start(0);
    machine.tick(10_000); // only idle candidate available is lieDown
    expect(machine.getState()).toBe("lieDown");

    machine.onAnimationComplete("lieDown", 10_100);
    expect(machine.getState()).toBe("sleepDeep");

    machine.tick(100_000); // sleepDeep hold elapses -> turnBack
    expect(machine.getState()).toBe("turnBack");

    machine.onAnimationComplete("turnBack", 100_100);
    expect(machine.getState()).toBe("backRest");

    machine.tick(200_000); // backRest hold elapses -> wakeFront
    expect(machine.getState()).toBe("wakeFront");

    machine.onAnimationComplete("wakeFront", 200_100);
    expect(machine.getState()).toBe("idle");
  });

  it("returns to idle after a wave or groom gesture completes", () => {
    for (const gesture of ["wave", "groom"] as const) {
      const machine = new PetStateMachine({
        availableStates: new Set(["idle", gesture]),
        random: () => 0,
      });
      machine.start(0);
      machine.tick(10_000);
      expect(machine.getState()).toBe(gesture);
      machine.onAnimationComplete(gesture, 10_100);
      expect(machine.getState()).toBe("idle");
    }
  });

  it("holds a timed idle activity (working/review) then returns to idle", () => {
    for (const activity of ["working", "review"] as const) {
      const machine = new PetStateMachine({
        availableStates: new Set(["idle", activity]),
        random: () => 0,
      });
      machine.start(0);
      machine.tick(10_000); // only candidate is the activity
      expect(machine.getState()).toBe(activity);

      machine.tick(10_100); // hold not yet elapsed
      expect(machine.getState()).toBe(activity);

      machine.tick(100_000); // hold elapsed -> back to idle
      expect(machine.getState()).toBe("idle");
    }
  });

  it("keeps original pacing when no behavior config is given (existing pets)", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "walkLeft"]),
      random: () => 0,
    });
    machine.start(0);
    machine.tick(3_400); // below the original 3.5s minimum idle window
    expect(machine.getState()).toBe("idle");
    machine.tick(3_600); // past it
    expect(machine.getState()).toBe("walkLeft");
  });

  it("honours a per-pet idle window override", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "walkLeft"]),
      random: () => 0,
      behavior: { idleMinMs: 8_000, idleMaxMs: 20_000 },
    });
    machine.start(0);
    machine.tick(7_900); // would have fired under the 3.5s default
    expect(machine.getState()).toBe("idle");
    machine.tick(8_100);
    expect(machine.getState()).toBe("walkLeft");
  });

  it("rests a special action for the configured cooldown", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "walkLeft", "working"]),
      random: () => 0.99, // always pick the last candidate (working)
      behavior: { idleMinMs: 1_000, idleMaxMs: 1_000, specialCooldownMs: 60_000 },
    });
    machine.start(0);
    machine.tick(1_100);
    expect(machine.getState()).toBe("working");

    // Finish the activity, wait out a fresh idle window: working is cooling
    // down, so the only remaining candidate is walking.
    machine.tick(20_000); // working hold elapsed -> idle
    expect(machine.getState()).toBe("idle");
    machine.tick(22_000);
    expect(machine.getState()).toBe("walkLeft");
  });

  it("does not pick the same idle action twice in a row when configured", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "walkLeft", "walkRight"]),
      random: () => 0, // always the first candidate
      behavior: { idleMinMs: 1_000, idleMaxMs: 1_000, noImmediateRepeat: true },
    });
    machine.start(0);
    machine.tick(1_100);
    expect(machine.getState()).toBe("walkLeft");
    machine.tick(10_000); // walk hold elapsed -> idle
    expect(machine.getState()).toBe("idle");
    machine.tick(12_000); // next pick must differ from walkLeft
    expect(machine.getState()).toBe("walkRight");
  });

  it("degrades to idle when a later sleep-story stage is missing", () => {
    const machine = new PetStateMachine({
      availableStates: new Set(["idle", "lieDown"]), // sleepDeep unavailable
      random: () => 0,
    });

    machine.start(0);
    machine.tick(10_000);
    expect(machine.getState()).toBe("lieDown");

    machine.onAnimationComplete("lieDown", 10_100);
    expect(machine.getState()).toBe("idle"); // sleepDeep missing -> safe fallback
  });
});
