import "./styles.css";

import { AnimationPlayer } from "./animation-player";
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

// Horizontal auto-move speed. Adjust this single constant to make the pet walk
// faster or slower; movement is wall-clock based, so the speed is identical on
// 60Hz, 90Hz, 120Hz and higher refresh-rate displays.
const MOVEMENT_SPEED_PX_PER_SECOND = 48;
// Minimum wall-clock gap between two movement IPC calls (throttle).
const MOVEMENT_INTERVAL_MS = 40;
// Upper bound on a single movement step, so a long pause (hidden window, system
// sleep, drag) can never be compensated into one large jump on resume.
const MAX_MOVEMENT_STEP_MS = 250;
// Debounce window for position persistence triggered by automatic idle returns.
const POSITION_SAVE_DEBOUNCE_MS = 800;

const controller = new WindowController();
let clickTimer: number | null = null;
let dragging = false;
let dragStarted = false;
let pointerStart: { x: number; y: number } | null = null;
let stateMachine: PetStateMachine | null = null;
let animator: AnimationPlayer | null = null;
let autoMove = true;
// `null` means "not currently walking"; the next walk frame re-establishes the
// time baseline instead of applying a stale delta.
let lastMovementAt: number | null = null;
let positionSaveTimer: number | null = null;
let paused = false;

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
  lastMovementAt = null;
}

function resumePet(): void {
  if (!paused || animator === null || stateMachine === null) {
    return;
  }
  paused = false;
  lastMovementAt = null;
  stateMachine.resume(performance.now());
  animator.start();
}

async function start(): Promise<void> {
  const settings = await controller.getSettings();
  autoMove = settings.autoMove;

  const petId = settings.selectedPet || "default";
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

  stateMachine = new PetStateMachine({
    availableStates: new Set(Object.keys(config.animations)),
    onStateChange: (state) => {
      animator?.play(state);
      if (state === "idle") {
        schedulePositionSave();
      }
    },
  });

  animator = new AnimationPlayer(canvas, config, {
    onAnimationComplete: (name) => {
      stateMachine?.onAnimationComplete(name, performance.now());
    },
    onTick: (timestamp) => {
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
    lastMovementAt = null;
    return;
  }

  const state = stateMachine.getState();
  if (state !== "walkLeft" && state !== "walkRight") {
    lastMovementAt = null;
    return;
  }

  // First walk frame after any pause: establish a fresh baseline without moving,
  // so we never apply a stale delta (idle, drag, hidden window, system sleep).
  if (lastMovementAt === null) {
    lastMovementAt = timestamp;
    return;
  }

  if (timestamp - lastMovementAt < MOVEMENT_INTERVAL_MS) {
    return;
  }

  const elapsedMs = Math.min(MAX_MOVEMENT_STEP_MS, timestamp - lastMovementAt);
  lastMovementAt = timestamp;
  const direction = state === "walkLeft" ? -1 : 1;
  const distance = direction * MOVEMENT_SPEED_PX_PER_SECOND * (elapsedMs / 1000);
  const result = await controller.move(distance, 0);
  if (
    result !== null &&
    ((state === "walkLeft" && result.hitLeft) || (state === "walkRight" && result.hitRight))
  ) {
    stateMachine.bounce(performance.now());
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
