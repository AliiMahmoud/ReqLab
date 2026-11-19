import type { VariableOwner } from "@shared/models/environment";
import { signal } from "./signal";

export type MainView = "requests" | "environments";
export type SidebarMode = "collections" | "history";

export const mainView = signal<MainView>("requests");
export const sidebarMode = signal<SidebarMode>("collections");
export const treeSearch = signal("");

/** A variable to show on the Environments page: the page opens its scope and puts the cursor on it. */
export const environmentsFocus = signal<{ owner: VariableOwner; key: string } | undefined>(undefined);

/** Opens the Environments page on a scope (and puts the cursor on `key`, when given). */
export function openInEnvironments(owner: VariableOwner, key = ""): void {
  environmentsFocus.set({ owner, key });
  mainView.set("environments");
}
