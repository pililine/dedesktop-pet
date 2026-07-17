import type { AnimationConfig, BehaviorConfig, MovementConfig, PetConfig } from "./types";

const DEFAULT_ATLAS = { columns: 8, rows: 9 } as const;

export const DEFAULT_CODEX_ANIMATIONS: Record<string, AnimationConfig> = {
  idle: { row: 0, frames: 6, frameDurationMs: 160, loop: true },
  walkRight: { row: 1, frames: 8, frameDurationMs: 100, loop: true },
  walkLeft: { row: 2, frames: 8, frameDurationMs: 100, loop: true },
  interaction: { row: 3, frames: 4, frameDurationMs: 120, loop: false },
  jump: { row: 4, frames: 5, frameDurationMs: 100, loop: false },
  failed: { row: 5, frames: 8, frameDurationMs: 140, loop: false },
  sleep: { row: 6, frames: 6, frameDurationMs: 250, loop: true },
  working: { row: 7, frames: 6, frameDurationMs: 140, loop: true },
  review: { row: 8, frames: 6, frameDurationMs: 180, loop: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Defense in depth: the spritesheet must be a simple relative path inside the
// pet folder. Reject parent traversal, absolute paths and URL schemes so a
// malicious pet.json cannot point the loader outside its own directory.
function assertSafeSpritesheetPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const hasParentSegment = normalized.split("/").some((segment) => segment === "..");
  const isAbsolute = normalized.startsWith("/");
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(normalized);
  if (hasParentSegment || isAbsolute || hasScheme) {
    throw new Error(`spritesheet 路径不安全：${path}`);
  }
  return path;
}

function readString(record: Record<string, unknown>, key: string, fallback?: string): string {
  const value = record[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`pet.json 字段 "${key}" 必须是非空字符串`);
}

function readPositiveNumber(
  record: Record<string, unknown>,
  key: string,
  fallback?: number,
): number {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`pet.json 字段 "${key}" 必须是正数`);
}

function readPositiveInteger(
  record: Record<string, unknown>,
  key: string,
  fallback?: number,
): number {
  const value = readPositiveNumber(record, key, fallback);
  if (!Number.isInteger(value)) {
    throw new Error(`pet.json 字段 "${key}" 必须是正整数`);
  }
  return value;
}

function parseAnimation(
  name: string,
  value: unknown,
  columns: number,
  rows: number,
): AnimationConfig {
  if (!isRecord(value)) {
    throw new Error(`动画 "${name}" 必须是对象`);
  }

  const row = value.row;
  const frames = value.frames;
  const frameDurationMs = value.frameDurationMs;
  const loop = value.loop;

  if (!Number.isInteger(row) || typeof row !== "number" || row < 0 || row >= rows) {
    throw new Error(`动画 "${name}" 的 row 必须在 0 到 ${rows - 1} 之间`);
  }
  if (!Number.isInteger(frames) || typeof frames !== "number" || frames < 1 || frames > columns) {
    throw new Error(`动画 "${name}" 的 frames 必须在 1 到 ${columns} 之间`);
  }
  if (
    typeof frameDurationMs !== "number" ||
    !Number.isFinite(frameDurationMs) ||
    frameDurationMs < 16
  ) {
    throw new Error(`动画 "${name}" 的 frameDurationMs 必须是不小于 16 的数字`);
  }
  if (typeof loop !== "boolean") {
    throw new Error(`动画 "${name}" 的 loop 必须是布尔值`);
  }

  const pingPong = value.pingPong;
  if (pingPong !== undefined && typeof pingPong !== "boolean") {
    throw new Error(`动画 "${name}" 的 pingPong 必须是布尔值`);
  }

  const holdLastFrameMs = value.holdLastFrameMs;
  if (
    holdLastFrameMs !== undefined &&
    (typeof holdLastFrameMs !== "number" ||
      !Number.isFinite(holdLastFrameMs) ||
      holdLastFrameMs < 0 ||
      holdLastFrameMs > 120_000)
  ) {
    throw new Error(`动画 "${name}" 的 holdLastFrameMs 必须是 0 到 120000 之间的数字`);
  }

  return {
    row,
    frames,
    frameDurationMs,
    loop,
    ...(pingPong === undefined ? {} : { pingPong }),
    ...(holdLastFrameMs === undefined ? {} : { holdLastFrameMs }),
  };
}

function readBoundedNumber(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  context: string,
): number | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${context} 的 "${key}" 必须是 ${min} 到 ${max} 之间的数字`);
  }
  return value;
}

function parseMovement(input: unknown): Partial<MovementConfig> | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!isRecord(input)) {
    throw new Error('pet.json 字段 "movement" 必须是对象');
  }
  const speedPxPerSec = readBoundedNumber(input, "speedPxPerSec", 4, 400, "movement");
  const rampMs = readBoundedNumber(input, "rampMs", 0, 2_000, "movement");
  return {
    ...(speedPxPerSec === undefined ? {} : { speedPxPerSec }),
    ...(rampMs === undefined ? {} : { rampMs }),
  };
}

function parseBehavior(input: unknown): Partial<BehaviorConfig> | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!isRecord(input)) {
    throw new Error('pet.json 字段 "behavior" 必须是对象');
  }
  const idleMinMs = readBoundedNumber(input, "idleMinMs", 500, 120_000, "behavior");
  const idleMaxMs = readBoundedNumber(input, "idleMaxMs", 500, 300_000, "behavior");
  if (idleMinMs !== undefined && idleMaxMs !== undefined && idleMaxMs < idleMinMs) {
    throw new Error('behavior 的 "idleMaxMs" 不能小于 "idleMinMs"');
  }
  const activityHoldMinMs = readBoundedNumber(input, "activityHoldMinMs", 500, 120_000, "behavior");
  const activityHoldMaxMs = readBoundedNumber(input, "activityHoldMaxMs", 500, 300_000, "behavior");
  if (
    activityHoldMinMs !== undefined &&
    activityHoldMaxMs !== undefined &&
    activityHoldMaxMs < activityHoldMinMs
  ) {
    throw new Error('behavior 的 "activityHoldMaxMs" 不能小于 "activityHoldMinMs"');
  }
  const specialCooldownMs = readBoundedNumber(input, "specialCooldownMs", 0, 600_000, "behavior");
  const noImmediateRepeat = input.noImmediateRepeat;
  if (noImmediateRepeat !== undefined && typeof noImmediateRepeat !== "boolean") {
    throw new Error('behavior 的 "noImmediateRepeat" 必须是布尔值');
  }
  return {
    ...(idleMinMs === undefined ? {} : { idleMinMs }),
    ...(idleMaxMs === undefined ? {} : { idleMaxMs }),
    ...(activityHoldMinMs === undefined ? {} : { activityHoldMinMs }),
    ...(activityHoldMaxMs === undefined ? {} : { activityHoldMaxMs }),
    ...(specialCooldownMs === undefined ? {} : { specialCooldownMs }),
    ...(noImmediateRepeat === undefined ? {} : { noImmediateRepeat }),
  };
}

export function parsePetConfig(input: unknown): PetConfig {
  if (!isRecord(input)) {
    throw new Error("pet.json 顶层必须是对象");
  }

  const id = readString(input, "id", "default");
  const displayName = readString(input, "displayName", id);
  const description =
    typeof input.description === "string" && input.description.trim()
      ? input.description.trim()
      : undefined;
  const spritesheet = assertSafeSpritesheetPath(
    typeof input.spritesheet === "string" && input.spritesheet.trim()
      ? input.spritesheet.trim()
      : readString(input, "spritesheetPath", "spritesheet.webp"),
  );

  const atlasRecord = isRecord(input.atlas) ? input.atlas : {};
  const columns = readPositiveInteger(atlasRecord, "columns", DEFAULT_ATLAS.columns);
  const rows = readPositiveInteger(atlasRecord, "rows", DEFAULT_ATLAS.rows);
  const defaultScale = readPositiveNumber(input, "defaultScale", 1);

  if (defaultScale < 0.25 || defaultScale > 4) {
    throw new Error("defaultScale 必须在 0.25 到 4 之间");
  }

  const rendering = input.rendering ?? "pixelated";
  if (rendering !== "pixelated" && rendering !== "smooth") {
    throw new Error('pet.json 字段 "rendering" 只能是 "pixelated" 或 "smooth"');
  }

  const movement = parseMovement(input.movement);
  const behavior = parseBehavior(input.behavior);

  const animationsRecord = input.animations;
  const sourceAnimations =
    animationsRecord === undefined
      ? DEFAULT_CODEX_ANIMATIONS
      : isRecord(animationsRecord)
        ? animationsRecord
        : (() => {
            throw new Error('pet.json 字段 "animations" 必须是对象');
          })();

  const animations: Record<string, AnimationConfig> = {};
  for (const [name, animation] of Object.entries(sourceAnimations)) {
    animations[name] = parseAnimation(name, animation, columns, rows);
  }

  if (animations.idle === undefined) {
    throw new Error('pet.json 必须配置 "idle" 动画，以便其他状态安全降级');
  }

  return {
    id,
    displayName,
    ...(description === undefined ? {} : { description }),
    spritesheet,
    atlas: { columns, rows },
    defaultScale,
    rendering,
    ...(movement === undefined ? {} : { movement }),
    ...(behavior === undefined ? {} : { behavior }),
    animations,
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Builds the in-app URL of a pet's config. Only the folder segment is encoded,
 * so path separators stay intact and the value is never double-encoded. The
 * result is resolved against the production webview origin (`tauri://localhost`
 * on macOS, `http://tauri.localhost` on Windows) — no dev server required.
 */
export function petConfigUrl(petId: string): string {
  return `/pets/${encodeURIComponent(petId)}/pet.json`;
}

/**
 * Resolves a pet's spritesheet to an absolute URL relative to its config URL.
 * Keeps the legitimate directory layout intact while staying same-origin.
 */
export function resolveSpritesheetUrl(
  configUrl: string,
  spritesheet: string,
  base: string,
): string {
  return new URL(spritesheet, new URL(configUrl, base)).href;
}

export async function loadPetConfig(url: string): Promise<PetConfig> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    // A thrown fetch (network/CSP/asset-protocol failure) surfaces in WebKit as
    // "Load failed"; categorise it instead of showing that opaque message.
    throw new Error(`pet.json 加载失败（无法访问资源）：${describeError(error)}`);
  }
  if (!response.ok) {
    throw new Error(`pet.json 加载失败（HTTP ${response.status}）`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new Error(`pet.json 解析失败：${describeError(error)}`);
  }

  try {
    return parsePetConfig(json);
  } catch (error) {
    throw new Error(`pet.json 配置无效：${describeError(error)}`);
  }
}
