import type { NetworkSettingsView } from "@shared/models/network-settings";
import { api } from "../api";
import { callApi } from "./notice-store";
import { signal } from "./signal";

/** The open workspace's TLS / proxy settings, as the UI may see them (no keys or passwords). */
export const networkSettings = signal<NetworkSettingsView | undefined>(undefined);

export async function loadNetworkSettings(workspaceId: string): Promise<void> {
  networkSettings.set(await callApi(api.getNetworkSettings({ workspaceId })));
}

/** Applies a main-side result (null means the user cancelled a file dialog). */
export function showNetworkSettings(view: NetworkSettingsView | null | undefined): void {
  if (view !== null && view !== undefined) networkSettings.set(view);
}
