import { advanceFrame } from "./frame-sequencer";
import type { AnimationConfig, PetConfig } from "./types";

type AnimationPlayerOptions = {
  onAnimationComplete?: (name: string) => void;
  onTick?: (timestamp: number, deltaMs: number) => void;
};

// Reduces an absolute resource URL to a short, non-private label for the error
// panel, e.g. "tauri://localhost/pets/default/spritesheet.webp" -> "default/spritesheet.webp".
function friendlyResourceName(imageUrl: string): string {
  try {
    const segments = new URL(imageUrl).pathname.split("/").filter(Boolean);
    const petsIndex = segments.indexOf("pets");
    const relevant = petsIndex >= 0 ? segments.slice(petsIndex + 1) : segments.slice(-2);
    return relevant.join("/") || imageUrl;
  } catch {
    return imageUrl;
  }
}

export class AnimationPlayer {
  readonly canvas: HTMLCanvasElement;

  private readonly context: CanvasRenderingContext2D;
  private readonly config: PetConfig;
  private readonly image = new Image();
  private readonly onAnimationComplete: ((name: string) => void) | undefined;
  private readonly onTick: ((timestamp: number, deltaMs: number) => void) | undefined;
  private frameWidth = 0;
  private frameHeight = 0;
  private scale = 1;
  private currentName = "idle";
  private currentAnimation: AnimationConfig;
  private currentFrame = 0;
  private frameDirection: 1 | -1 = 1;
  private frameElapsedMs = 0;
  private previousTimestamp: number | null = null;
  private animationFrameId: number | null = null;
  private completionEmitted = false;
  private readonly smoothing: boolean;

  constructor(canvas: HTMLCanvasElement, config: PetConfig, options: AnimationPlayerOptions = {}) {
    const context = canvas.getContext("2d", { alpha: true });
    if (context === null) {
      throw new Error("当前系统无法创建 Canvas 2D 上下文");
    }

    const idle = config.animations.idle;
    if (idle === undefined) {
      throw new Error("宠物配置缺少 idle 动画");
    }

    this.canvas = canvas;
    this.context = context;
    this.config = config;
    this.currentAnimation = idle;
    this.onAnimationComplete = options.onAnimationComplete;
    this.onTick = options.onTick;
    this.smoothing = config.rendering === "smooth";
    // Override the stylesheet's pixel-art default for photographic pets.
    this.canvas.style.imageRendering = this.smoothing ? "auto" : "pixelated";
  }

  async load(imageUrl: string): Promise<void> {
    this.image.decoding = "async";

    // Wait for the network load first so we can tell an unreachable/missing
    // sheet (load error) apart from a corrupt one (decode error). The friendly
    // name keeps absolute URLs out of the user-facing error panel.
    const friendlyName = friendlyResourceName(imageUrl);
    await new Promise<void>((resolve, reject) => {
      this.image.addEventListener("load", () => resolve(), { once: true });
      this.image.addEventListener(
        "error",
        () => reject(new Error(`spritesheet 加载失败：${friendlyName}`)),
        { once: true },
      );
      this.image.src = imageUrl;
    });

    try {
      await this.image.decode();
    } catch {
      throw new Error(`spritesheet 解码失败：${friendlyName}`);
    }

    const { columns, rows } = this.config.atlas;
    if (this.image.naturalWidth % columns !== 0 || this.image.naturalHeight % rows !== 0) {
      throw new Error(
        `精灵图尺寸 ${this.image.naturalWidth}×${this.image.naturalHeight} 无法被 ${columns} 列 × ${rows} 行整除`,
      );
    }

    this.frameWidth = this.image.naturalWidth / columns;
    this.frameHeight = this.image.naturalHeight / rows;
    this.setScale(this.scale);
    this.draw();
  }

  getFrameSize(): { width: number; height: number } {
    if (this.frameWidth === 0 || this.frameHeight === 0) {
      throw new Error("必须先加载精灵图，才能读取帧尺寸");
    }
    return { width: this.frameWidth, height: this.frameHeight };
  }

  setScale(scale: number): void {
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error("宠物缩放比例必须是正数");
    }
    this.scale = scale;
    if (this.frameWidth === 0 || this.frameHeight === 0) {
      return;
    }

    const cssWidth = this.frameWidth * scale;
    const cssHeight = this.frameHeight * scale;
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
    this.applySmoothing();
    this.draw();
  }

  play(name: string): string {
    const resolvedName = this.config.animations[name] === undefined ? "idle" : name;
    const animation = this.config.animations[resolvedName];
    if (animation === undefined) {
      throw new Error("宠物配置缺少可用的 idle 动画");
    }

    if (resolvedName === this.currentName && animation.loop) {
      return resolvedName;
    }

    this.currentName = resolvedName;
    this.currentAnimation = animation;
    this.currentFrame = 0;
    this.frameDirection = 1;
    this.frameElapsedMs = 0;
    this.completionEmitted = false;
    this.draw();
    return resolvedName;
  }

  start(): void {
    if (this.animationFrameId !== null) {
      return;
    }
    this.previousTimestamp = null;
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.previousTimestamp = null;
  }

  private readonly animate = (timestamp: number): void => {
    const deltaMs =
      this.previousTimestamp === null ? 0 : Math.min(250, timestamp - this.previousTimestamp);
    this.previousTimestamp = timestamp;
    this.onTick?.(timestamp, deltaMs);

    if (!this.completionEmitted) {
      this.frameElapsedMs += deltaMs;
      let moved = false;
      while (this.frameElapsedMs >= this.currentAnimation.frameDurationMs) {
        this.frameElapsedMs -= this.currentAnimation.frameDurationMs;
        const result = advanceFrame(
          { frame: this.currentFrame, direction: this.frameDirection },
          this.currentAnimation.frames,
          this.currentAnimation.loop,
          this.currentAnimation.pingPong ?? false,
        );
        moved = moved || result.frame !== this.currentFrame;
        this.currentFrame = result.frame;
        this.frameDirection = result.direction;
        if (result.completed) {
          this.completionEmitted = true;
          this.onAnimationComplete?.(this.currentName);
          break;
        }
      }
      if (moved) {
        this.draw();
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private draw(): void {
    if (!this.image.complete || this.frameWidth === 0 || this.frameHeight === 0) {
      return;
    }

    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const destinationWidth = this.frameWidth * this.scale;
    const destinationHeight = this.frameHeight * this.scale;
    const sourceX = this.currentFrame * this.frameWidth;
    const sourceY = this.currentAnimation.row * this.frameHeight;

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.applySmoothing();
    this.context.drawImage(
      this.image,
      sourceX,
      sourceY,
      this.frameWidth,
      this.frameHeight,
      0,
      0,
      destinationWidth,
      destinationHeight,
    );
  }

  // Photographic pets need bilinear filtering; pixel-art pets need crisp
  // nearest-neighbour. Driven by pet.json `rendering`, defaulting to pixelated
  // so existing pets are unaffected.
  private applySmoothing(): void {
    if (this.smoothing) {
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = "high";
    } else {
      this.context.imageSmoothingEnabled = false;
    }
  }
}
