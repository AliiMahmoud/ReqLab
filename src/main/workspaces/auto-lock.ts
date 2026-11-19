import { powerMonitor } from "electron";
import type { WorkspaceService } from "./workspace-service";

export const AUTO_LOCK_MINUTES = 15;

/** Locks every workspace after inactivity, on screen lock, and before the computer sleeps. */
export class AutoLock {
  #timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly workspaces: WorkspaceService,
    private readonly onLocked: () => void,
  ) {}

  start(): void {
    powerMonitor.on("lock-screen", () => {
      this.lockNow();
    });
    powerMonitor.on("suspend", () => {
      this.lockNow();
    });
    this.recordActivity();
  }

  /** Called on every request from the UI. */
  recordActivity(): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.lockNow();
    }, AUTO_LOCK_MINUTES * 60_000);
  }

  lockNow(): void {
    if (this.workspaces.lockAll() > 0) this.onLocked();
  }
}
