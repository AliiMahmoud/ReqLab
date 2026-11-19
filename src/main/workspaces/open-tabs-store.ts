import { LegacyOpenTabs, OpenTabs, type PersistedTab } from "@shared/models/open-tabs";
import { DatabaseCorrupted, ItemNotFound } from "../errors";
import type { WorkspaceData } from "./workspace-data";

const OPEN_TABS_SETTING = "open-tabs-v2";
const LEGACY_OPEN_TABS_SETTING = "open-tabs";
const NO_OPEN_TABS: OpenTabs = { tabs: [], activeIndex: null, environmentId: null };

/** The open tabs of a workspace, saved as the user left them and restored on the next unlock. */
export class OpenTabsStore {
  constructor(private readonly data: WorkspaceData) {}

  read(workspaceId: string): OpenTabs {
    const settings = this.data.settings(workspaceId);
    try {
      return settings.read(OPEN_TABS_SETTING, OpenTabs) ?? this.readLegacy(workspaceId) ?? NO_OPEN_TABS;
    } catch (error) {
      // Unreadable tab state is not worth blocking the workspace over: start with no tabs.
      if (error instanceof DatabaseCorrupted) return NO_OPEN_TABS;
      throw error;
    }
  }

  write(workspaceId: string, openTabs: OpenTabs): void {
    this.data.settings(workspaceId).write(OPEN_TABS_SETTING, openTabs);
  }

  /** Turns the old "ids only" format into full tabs, using each request as saved. */
  private readLegacy(workspaceId: string): OpenTabs | undefined {
    const legacy = this.data.settings(workspaceId).read(LEGACY_OPEN_TABS_SETTING, LegacyOpenTabs);
    if (legacy === undefined) return undefined;
    const tabs = legacy.itemIds.flatMap((itemId) => this.loadSavedTab(workspaceId, itemId) ?? []);
    const activeIndex = tabs.findIndex((tab) => tab.itemId === legacy.activeItemId);
    return {
      tabs,
      activeIndex: activeIndex === -1 ? null : activeIndex,
      environmentId: legacy.environmentId,
    };
  }

  private loadSavedTab(workspaceId: string, itemId: string): PersistedTab | undefined {
    const item = this.data.collections(workspaceId).findItem(itemId);
    if (item?.kind !== "request") return undefined;
    try {
      const draft = this.data.requests(workspaceId).get(itemId);
      return { itemId, name: item.name, draft, ...DEFAULT_VIEW, response: null, error: null };
    } catch (error) {
      if (error instanceof ItemNotFound) return undefined;
      throw error;
    }
  }
}

const DEFAULT_VIEW = { editorSection: "params", responseSection: "body", bodyView: "pretty" } as const;
