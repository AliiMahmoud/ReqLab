import { z } from "zod";
import type { RequestSettings } from "@shared/models/request-settings";
import type { WorkspaceData } from "../workspaces/workspace-data";
import type { NetworkSettingsStore } from "./network-settings-store";

const KEY = "request";
const Stored = z.object({
  timeoutMs: z.number().int().min(0).max(3_600_000),
  maxResponseMb: z.number().int().min(1).max(1024),
  // Saved before this setting existed: redirects were always followed.
  followRedirects: z.boolean().default(true),
  disableCookies: z.boolean(),
});
type Stored = z.infer<typeof Stored>;

/** Defaults: no timeout, 50 MB responses, redirects followed, cookies on. */
const DEFAULTS: Stored = { timeoutMs: 0, maxResponseMb: 50, followRedirects: true, disableCookies: false };

/** Timeout, response size, redirects and cookies per workspace; certificate checks live in the network settings. */
export class RequestSettingsStore {
  constructor(
    private readonly data: WorkspaceData,
    private readonly network: NetworkSettingsStore,
  ) {}

  read(workspaceId: string): Stored {
    return this.data.settings(workspaceId).read(KEY, Stored) ?? DEFAULTS;
  }

  view(workspaceId: string): RequestSettings {
    return { ...this.read(workspaceId), verifyTls: this.network.read(workspaceId).verifyTls };
  }

  update(workspaceId: string, settings: RequestSettings): RequestSettings {
    const { verifyTls, ...stored } = settings;
    this.data.settings(workspaceId).write(KEY, Stored.parse(stored));
    this.network.setVerifyTls(workspaceId, verifyTls);
    return this.view(workspaceId);
  }
}
