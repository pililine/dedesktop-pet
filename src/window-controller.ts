import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { AppSettings, MovementResult } from "./types";

export class WindowController {
  private movementPending = false;

  getSettings(): Promise<AppSettings> {
    return invoke<AppSettings>("get_settings");
  }

  initializeWindow(frameWidth: number, frameHeight: number, scale: number): Promise<void> {
    return invoke("initialize_pet_window", { frameWidth, frameHeight, scale });
  }

  setScale(scale: number, frameWidth: number, frameHeight: number): Promise<void> {
    return invoke("set_pet_scale", { scale, frameWidth, frameHeight });
  }

  startDragging(): Promise<void> {
    return invoke("start_dragging");
  }

  persistPosition(): Promise<void> {
    return invoke("persist_window_position");
  }

  showContextMenu(): Promise<void> {
    return invoke("show_pet_menu");
  }

  async move(deltaX: number, deltaY: number): Promise<MovementResult | null> {
    if (this.movementPending) {
      return null;
    }
    this.movementPending = true;
    try {
      return await invoke<MovementResult>("move_pet_window", { deltaX, deltaY });
    } finally {
      this.movementPending = false;
    }
  }

  async onReloadRequested(callback: () => void): Promise<UnlistenFn> {
    return listen("pet://reload", callback);
  }

  async onSettingsChanged(callback: (settings: AppSettings) => void): Promise<UnlistenFn> {
    return listen<AppSettings>("pet://settings-changed", (event) => callback(event.payload));
  }

  async onScaleChanged(callback: (scale: number) => void): Promise<UnlistenFn> {
    return listen<number>("pet://scale-changed", (event) => callback(event.payload));
  }

  async onVisibilityChanged(callback: (visible: boolean) => void): Promise<UnlistenFn> {
    return listen<boolean>("pet://visibility-changed", (event) => callback(event.payload));
  }

  async onErrorReported(callback: (message: string) => void): Promise<UnlistenFn> {
    return listen<string>("pet://error", (event) => callback(event.payload));
  }
}
