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
});
