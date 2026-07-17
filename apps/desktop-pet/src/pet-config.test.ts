import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CODEX_ANIMATIONS,
  loadPetConfig,
  parsePetConfig,
  petConfigUrl,
  resolveSpritesheetUrl,
} from "./pet-config";

describe("parsePetConfig", () => {
  it("accepts a Codex-style minimal pet and supplies atlas defaults", () => {
    const config = parsePetConfig({
      id: "niuniu",
      displayName: "牛牛",
      spritesheetPath: "spritesheet.webp",
    });

    expect(config.atlas).toEqual({ columns: 8, rows: 9 });
    expect(config.animations).toEqual(DEFAULT_CODEX_ANIMATIONS);
    expect(config.spritesheet).toBe("spritesheet.webp");
  });

  it("rejects an animation outside the atlas", () => {
    expect(() =>
      parsePetConfig({
        id: "broken",
        displayName: "Broken",
        spritesheet: "spritesheet.webp",
        atlas: { columns: 4, rows: 2 },
        animations: {
          idle: { row: 2, frames: 4, frameDurationMs: 100, loop: true },
        },
      }),
    ).toThrow(/row/);
  });

  it("requires idle when explicit animations are provided", () => {
    expect(() =>
      parsePetConfig({
        id: "broken",
        displayName: "Broken",
        spritesheet: "spritesheet.webp",
        animations: {
          jump: { row: 1, frames: 2, frameDurationMs: 100, loop: false },
        },
      }),
    ).toThrow(/必须配置 "idle" 动画/);
  });

  const baseAnimations = () => ({
    idle: { row: 0, frames: 4, frameDurationMs: 120, loop: true },
  });

  function parseWith(overrides: Record<string, unknown>): void {
    parsePetConfig({
      id: "p",
      displayName: "P",
      spritesheet: "spritesheet.webp",
      atlas: { columns: 8, rows: 9 },
      defaultScale: 1,
      animations: baseAnimations(),
      ...overrides,
    });
  }

  it("rejects frameDurationMs below the 16ms floor", () => {
    expect(() =>
      parseWith({
        animations: { idle: { row: 0, frames: 4, frameDurationMs: 10, loop: true } },
      }),
    ).toThrow(/frameDurationMs 必须是不小于 16 的数字/);
  });

  it("rejects a zero frameDurationMs", () => {
    expect(() =>
      parseWith({
        animations: { idle: { row: 0, frames: 4, frameDurationMs: 0, loop: true } },
      }),
    ).toThrow(/frameDurationMs 必须是不小于 16 的数字/);
  });

  it("rejects defaultScale below the allowed range", () => {
    expect(() => parseWith({ defaultScale: 0.1 })).toThrow(/defaultScale 必须在 0.25 到 4 之间/);
  });

  it("rejects defaultScale above the allowed range", () => {
    expect(() => parseWith({ defaultScale: 5 })).toThrow(/defaultScale 必须在 0.25 到 4 之间/);
  });

  it("rejects frames greater than atlas.columns", () => {
    expect(() =>
      parseWith({
        atlas: { columns: 4, rows: 9 },
        animations: { idle: { row: 0, frames: 5, frameDurationMs: 120, loop: true } },
      }),
    ).toThrow(/frames 必须在 1 到 4 之间/);
  });

  it("rejects a row at or beyond atlas.rows", () => {
    expect(() =>
      parseWith({
        atlas: { columns: 8, rows: 3 },
        animations: { idle: { row: 3, frames: 4, frameDurationMs: 120, loop: true } },
      }),
    ).toThrow(/row 必须在 0 到 2 之间/);
  });

  it("rejects a non-object top-level value", () => {
    expect(() => parsePetConfig("not-an-object")).toThrow(/pet\.json 顶层必须是对象/);
    expect(() => parsePetConfig(null)).toThrow(/pet\.json 顶层必须是对象/);
    expect(() => parsePetConfig([])).toThrow(/pet\.json 顶层必须是对象/);
  });

  it("rejects a spritesheet path that escapes the pet folder", () => {
    expect(() => parseWith({ spritesheet: "../../etc/passwd" })).toThrow(/spritesheet 路径不安全/);
    expect(() => parseWith({ spritesheet: "/etc/passwd" })).toThrow(/spritesheet 路径不安全/);
    expect(() => parseWith({ spritesheet: "file:///etc/passwd" })).toThrow(
      /spritesheet 路径不安全/,
    );
  });

  it("rejects a spritesheet path using Windows-style parent traversal", () => {
    expect(() => parseWith({ spritesheet: "..\\..\\windows\\system32" })).toThrow(
      /spritesheet 路径不安全/,
    );
  });

  it("defaults rendering to pixelated and accepts smooth", () => {
    const base = {
      id: "p",
      displayName: "P",
      spritesheet: "spritesheet.webp",
      animations: { idle: { row: 0, frames: 4, frameDurationMs: 120, loop: true } },
    };
    expect(parsePetConfig(base).rendering).toBe("pixelated");
    expect(parsePetConfig({ ...base, rendering: "smooth" }).rendering).toBe("smooth");
    expect(() => parsePetConfig({ ...base, rendering: "fancy" })).toThrow(
      /"rendering" 只能是 "pixelated" 或 "smooth"/,
    );
  });

  it("parses and validates the optional movement block", () => {
    const cfg = parsePetConfig({
      id: "p",
      displayName: "P",
      spritesheet: "spritesheet.webp",
      movement: { speedPxPerSec: 40, rampMs: 220 },
      animations: { idle: { row: 0, frames: 4, frameDurationMs: 120, loop: true } },
    });
    expect(cfg.movement).toEqual({ speedPxPerSec: 40, rampMs: 220 });
    expect(() => parseWith({ movement: { speedPxPerSec: 0 } })).toThrow(/speedPxPerSec/);
    expect(() => parseWith({ movement: { rampMs: 99_999 } })).toThrow(/rampMs/);
  });

  it("parses and validates the optional behavior block", () => {
    const cfg = parsePetConfig({
      id: "p",
      displayName: "P",
      spritesheet: "spritesheet.webp",
      behavior: { idleMinMs: 8_000, idleMaxMs: 20_000, noImmediateRepeat: true },
      animations: { idle: { row: 0, frames: 4, frameDurationMs: 120, loop: true } },
    });
    expect(cfg.behavior).toEqual({ idleMinMs: 8_000, idleMaxMs: 20_000, noImmediateRepeat: true });
    expect(() => parseWith({ behavior: { idleMinMs: 9_000, idleMaxMs: 1_000 } })).toThrow(
      /idleMaxMs/,
    );
    expect(() => parseWith({ behavior: { noImmediateRepeat: "yes" } })).toThrow(
      /noImmediateRepeat/,
    );
  });

  it("parses per-animation pingPong and holdLastFrameMs", () => {
    const cfg = parsePetConfig({
      id: "p",
      displayName: "P",
      spritesheet: "spritesheet.webp",
      animations: {
        idle: { row: 0, frames: 8, frameDurationMs: 160, loop: true, pingPong: true },
        lieDown: { row: 1, frames: 8, frameDurationMs: 260, loop: false, holdLastFrameMs: 9_000 },
      },
      atlas: { columns: 8, rows: 2 },
    });
    expect(cfg.animations.idle?.pingPong).toBe(true);
    expect(cfg.animations.lieDown?.holdLastFrameMs).toBe(9_000);
    expect(() =>
      parseWith({
        animations: { idle: { row: 0, frames: 4, frameDurationMs: 120, loop: true, pingPong: 1 } },
      }),
    ).toThrow(/pingPong 必须是布尔值/);
    expect(() =>
      parseWith({
        animations: {
          idle: { row: 0, frames: 4, frameDurationMs: 120, loop: true, holdLastFrameMs: -5 },
        },
      }),
    ).toThrow(/holdLastFrameMs/);
  });
});

describe("pet resource URL construction", () => {
  it("builds the production config URL for the default pet", () => {
    expect(petConfigUrl("default")).toBe("/pets/default/pet.json");
  });

  it("joins the spritesheet relative to its config URL and origin", () => {
    // Mirrors the production origin on Windows; macOS uses tauri://localhost.
    const url = resolveSpritesheetUrl(
      "/pets/default/pet.json",
      "spritesheet.webp",
      "http://tauri.localhost/",
    );
    expect(url).toBe("http://tauri.localhost/pets/default/spritesheet.webp");
  });

  it("preserves spaces and Chinese pet folder names without breaking the path", () => {
    expect(petConfigUrl("My Pet")).toBe("/pets/My%20Pet/pet.json");
    expect(petConfigUrl("牛牛")).toBe("/pets/%E7%89%9B%E7%89%9B/pet.json");
  });

  it("encodes a pet id exactly once (no double encoding)", () => {
    const url = petConfigUrl("a b");
    expect(url).toBe("/pets/a%20b/pet.json");
    expect(url).not.toContain("%2520"); // would indicate a re-encoded '%'
    expect(url).not.toContain("%2F"); // the path separators stay real slashes
  });
});

describe("loadPetConfig error categories", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports a load-failure category when the fetch itself throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Load failed")));
    await expect(loadPetConfig("/pets/default/pet.json")).rejects.toThrow(
      /pet\.json 加载失败（无法访问资源）/,
    );
  });

  it("reports a load-failure category for a non-ok HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadPetConfig("/pets/missing/pet.json")).rejects.toThrow(
      /pet\.json 加载失败（HTTP 404）/,
    );
  });

  it("reports a parse-failure category for invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      }),
    );
    await expect(loadPetConfig("/pets/default/pet.json")).rejects.toThrow(/pet\.json 解析失败/);
  });

  it("reports an invalid-config category for a schema violation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "x",
            displayName: "X",
            spritesheet: "spritesheet.webp",
            animations: { jump: { row: 0, frames: 2, frameDurationMs: 100, loop: false } },
          }),
      }),
    );
    await expect(loadPetConfig("/pets/default/pet.json")).rejects.toThrow(/pet\.json 配置无效/);
  });
});

describe("shipped default pet assets", () => {
  it("contains a valid pet.json that parses and defines idle", () => {
    const petJsonPath = fileURLToPath(new URL("../../../pets/default/pet.json", import.meta.url));
    const config = parsePetConfig(JSON.parse(readFileSync(petJsonPath, "utf8")));
    expect(config.animations.idle).toBeDefined();
    expect(config.spritesheet).toBe("spritesheet.webp");
  });

  it("ships the spritesheet referenced by the default pet.json", () => {
    const petJsonPath = fileURLToPath(new URL("../../../pets/default/pet.json", import.meta.url));
    const config = parsePetConfig(JSON.parse(readFileSync(petJsonPath, "utf8")));
    const sheetPath = fileURLToPath(
      new URL(`../../../pets/default/${config.spritesheet}`, import.meta.url),
    );
    // RIFF/WEBP magic bytes prove the asset exists and is a real WebP.
    const header = readFileSync(sheetPath).subarray(0, 12);
    expect(header.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(header.subarray(8, 12).toString("ascii")).toBe("WEBP");
  });
});
