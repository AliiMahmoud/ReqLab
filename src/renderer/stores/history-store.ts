import type { HistoryEntry } from "@shared/models/history";
import { api } from "../api";
import { callApi } from "./notice-store";
import { signal } from "./signal";

export const historyEntries = signal<HistoryEntry[]>([]);

export async function loadHistory(workspaceId: string): Promise<void> {
  const entries = await callApi(api.listHistory({ workspaceId }));
  if (entries !== undefined) historyEntries.set(entries);
}

export async function clearHistory(workspaceId: string): Promise<void> {
  if ((await callApi(api.clearHistory({ workspaceId }))) !== undefined) historyEntries.set([]);
}
