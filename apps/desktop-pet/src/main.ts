import "./styles.css";

import { AnimationPlayer } from "./animation-player";
import { MovementController } from "./movement";
import { loadPetConfig, petConfigUrl, resolveSpritesheetUrl } from "./pet-config";
import { PetStateMachine } from "./pet-state-machine";
import { WindowController } from "./window-controller";

function requireElement<T extends Element>(selector: string, elementType: new () => T): T {
  const element = document.querySelector(selector);
  if (!(element instanceof elementType)) {
    throw new Error(`应用页面缺少必要元素：${selector}`);
  }
  return element;
}

const canvas = requireElement("#pet-canvas", HTMLCanvasElement);
const errorPanel = requireElement("#error-panel", HTMLElement);
const errorMessage = requireElement("#error-message", HTMLElement);

// Debounce window for position persistence triggered by automatic idle returns.
const POSITION_SAVE_DEBOUNCE_MS = 800;

// Dev-only performance counters (console summary every 10s). Enable in a
// packaged build by setting localStorage.petDebug = "1" from the devtools.
const PERF_ENABLED = import.meta.env.DEV || localStorage.getItem("petDebug") === "1";
const perf = {
  ticks: 0,
  maxTickGapMs: 0,
  stateTransitions: 0,
  movementSteps: 0,
  lastReportAt: 0,
  report(now: number): void {
    if (!PERF_ENABLED || now - this.lastReportAt < 10_000) {
      return;
    }
    const seconds = (now - this.lastReportAt) / 1000;
    console.info("[desktop-pet perf]", {
      tickHz: Math.round(this.ticks / seconds),
      maxTickGapMs: Math.round(this.maxTickGapMs),
      stateTransitions: this.stateTransitions,
      movementStepsPerSec: Math.round(this.movementSteps / seconds),
    });
    this.ticks = 0;
    this.maxTickGapMs = 0;
    this.stateTransitions = 0;
    this.movementSteps = 0;
    this.lastReportAt = now;
  },
};

const controller = new WindowController();
let clickTimer: number | null = null;
let dragging = false;
let dragStarted = false;
let pointerStart: { x: number; y: number } | null = null;
let stateMachine: PetStateMachine | null = null;
let animator: AnimationPlayer | null = null;
let movement = new MovementController();
let autoMove = true;
let positionSaveTimer: number | null = null;
let completionHoldTimer: number | null = null;
let paused = false;
// Serializes movement IPC so steps never overlap or arrive out of order.
let movePending = false;

function showError(error: unknown): void {
  console.error(error);
  canvas.hidden = true;
  errorPanel.hidden = false;
  errorMessage.textContent = error instanceof Error ? error.message : String(error);
}

function schedulePositionSave(): void {
  if (positionSaveTimer !== null) {
    return;
  }
  positionSaveTimer = window.setTimeout(() => {
    positionSaveTimer = null;
    void controller.persistPosition().catch(console.error);
  }, POSITION_SAVE_DEBOUNCE_MS);
}

function savePositionNow(): void {
  if (positionSaveTimer !== null) {
    window.clearTimeout(positionSaveTimer);
    positionSaveTimer = null;
  }
  void controller.persistPosition().catch(console.error);
}

function finishDrag(): void {
  if (!dragging && !dragStarted) {
    return;
  }
  dragging = false;
  dragStarted = false;
  pointerStart = null;
  stateMachine?.setDragging(false, performance.now());
  savePositionNow();
}

function pausePet(): void {
  if (paused || animator === null) {
    return;
  }
  paused = true;
  savePositionNow();
  animator.stop();
  stateMachine?.pause();
  movement.reset();
  if (completionHoldTimer !== null) {
    window.clearTimeout(completionHoldTimer);
    completionHoldTimer = null;
  }
}

function resumePet(): void {
  if (!paused || animator === null || stateMachine === null) {
    return;
  }
  paused = false;
  movement.reset();
  stateMachine.resume(performance.now());
  animator.start();
}

async function start(): Promise<void> {
  const settings = await controller.getSettings();
  autoMove = settings.autoMove;

  const petId = settings.selectedPet || "wangdulan";
  const configUrl = petConfigUrl(petId);
  // Controlled diagnostics: full URLs go to the dev console only; the on-screen
  // error panel stays sanitized.
  console.info("[desktop-pet] 加载宠物资源", {
    mode: import.meta.env.DEV ? "development" : "production",
    petId,
    origin: window.location.origin,
    configUrl,
  });
  const config = await loadPetConfig(configUrl);
  const selectedScale = settings.scale > 0 ? settings.scale : config.defaultScale;

  movement = new MovementController(config.movement ?? {});

  stateMachine = new PetStateMachine({
    availableStates: new Set(Object.keys(config.animations)),
    ...(config.behavior === undefined ? {} : { behavior: config.behavior }),
    onStateChange: (state) => {
      animator?.play(state);
      perf.stateTransitions += 1;
      if (state !== "walkLeft" && state !== "walkRight") {
        movement.reset();
      }
      if (state === "idle") {
        schedulePositionSave();
      }
    },
  });

  animator = new AnimationPlayer(canvas, config, {
    onAnimationComplete: (name) => {
      // Optionally keep showing the final frame (e.g. stay lying down after a
      // lie-down transition) before the state machine moves on.
      const holdMs = config.animations[name]?.holdLastFrameMs ?? 0;
      if (holdMs <= 0) {
        stateMachine?.onAnimationComplete(name, performance.now());
        return;
      }
      completionHoldTimer = window.setTimeout(() => {
        completionHoldTimer = null;
        stateMachine?.onAnimationComplete(name, performance.now());
      }, holdMs);
    },
    onTick: (timestamp, deltaMs) => {
      perf.ticks += 1;
      perf.maxTickGapMs = Math.max(perf.maxTickGapMs, deltaMs);
      perf.report(timestamp);
      stateMachine?.tick(timestamp);
      void movePetIfNeeded(timestamp);
    },
  });

  const imageUrl = resolveSpritesheetUrl(configUrl, config.spritesheet, window.location.href);
  console.info("[desktop-pet] 加载精灵图", { spritesheet: config.spritesheet, imageUrl });
  await animator.load(imageUrl);
  animator.setScale(selectedScale);
  const frameSize = animator.getFrameSize();
  await controller.initializeWindow(frameSize.width, frameSize.height, selectedScale);
  stateMachine.start(performance.now());
  animator.start();
  await controller.onReloadRequested(() => window.location.reload());
  await controller.onSettingsChanged((updatedSettings) => {
    autoMove = updatedSettings.autoMove;
  });
  await controller.onScaleChanged((scale) => {
    animator?.setScale(scale);
    void controller.setScale(scale, frameSize.width, frameSize.height).catch(showError);
  });
  await controller.onVisibilityChanged((visible) => {
    if (visible) {
      resumePet();
    } else {
      pausePet();
    }
  });
  await controller.onErrorReported((message) => {
    console.error(`后台操作失败：${message}`);
  });
}

async function movePetIfNeeded(timestamp: number): Promise<void> {
  if (!autoMove || dragging || paused || stateMachine === null) {
    movement.reset();
    return;
  }

  const state = stateMachine.getState();
  if (state !== "walkLeft" && state !== "walkRight") {
    movement.reset();
    return;
  }

  const direction = state === "walkLeft" ? -1 : 1;
  const step = movement.step(timestamp, direction);
  if (step === 0 || movePending) {
    return;
  }

  movePending = true;
  try {
    const result = await controller.move(step, 0);
    perf.movementSteps += 1;
    if (
      result !== null &&
      ((state === "walkLeft" && result.hitLeft) || (state === "walkRight" && result.hitRight))
    ) {
      stateMachine.bounce(performance.now());
    }
  } finally {
    movePending = false;
  }
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }
  pointerStart = { x: event.screenX, y: event.screenY };
  dragStarted = false;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (pointerStart === null || dragStarted) {
    return;
  }

  const distance = Math.hypot(event.screenX - pointerStart.x, event.screenY - pointerStart.y);
  if (distance < 6) {
    return;
  }

  dragStarted = true;
  dragging = true;
  stateMachine?.setDragging(true, performance.now());
  void controller
    .startDragging()
    .catch(showError)
    .finally(() => finishDrag());
});

canvas.addEventListener("pointerup", () => {
  if (dragStarted) {
    finishDrag();
    return;
  }
  pointerStart = null;

  if (clickTimer !== null) {
    window.clearTimeout(clickTimer);
    clickTimer = null;
    stateMachine?.triggerJump(performance.now());
    return;
  }

  clickTimer = window.setTimeout(() => {
    clickTimer = null;
    stateMachine?.triggerInteraction(performance.now());
  }, 260);
});

canvas.addEventListener("pointercancel", finishDrag);
window.addEventListener("blur", finishDrag);

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  void controller.showContextMenu().catch(showError);
});

void start().catch(showError);
