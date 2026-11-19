import type { TreeItem } from "@shared/models/collection";
import type { ContextMenu, MenuItem } from "../../components/context-menu";
import { duplicateEntry } from "../../stores/collection-store";
import { exportCollection, exportSelection } from "../../stores/collection-transfer";
import { selectionMenuItems } from "./tree-selection";
import type { ContainerRow } from "./tree-rows";
import {
  copyIcon,
  exportIcon,
  folderIcon,
  settingsIcon,
  pencilIcon,
  plusIcon,
  trashIcon,
} from "../../components/icons";

interface EditActions {
  duplicate: () => void;
  rename: () => void;
  delete: () => void;
}

export interface ContainerMenuActions extends EditActions {
  addRequest: () => void;
  addFolder: () => void;
  openSettings: () => void;
  /** Collections only. */
  export?: () => void;
}

/** Right-click on a collection or folder: everything that used to be in the row's hover buttons, and more. */
export function containerMenuItems(actions: ContainerMenuActions): MenuItem[] {
  return [
    { label: "New request", icon: plusIcon(), run: actions.addRequest },
    { label: "New folder", icon: folderIcon(), run: actions.addFolder },
    { label: "Settings…", icon: settingsIcon(15), run: actions.openSettings, startsGroup: true },
    ...(actions.export === undefined ? [] : [{ label: "Export…", icon: exportIcon(), run: actions.export }]),
    ...editItems(actions),
  ];
}

/** Right-click on a request. */
export function requestMenuItems(actions: EditActions): MenuItem[] {
  return editItems(actions, { duplicateShortcut: "Mod+D" });
}

function editItems(
  actions: EditActions,
  { duplicateShortcut }: { duplicateShortcut?: string } = {},
): MenuItem[] {
  return [
    {
      label: "Duplicate",
      icon: copyIcon(),
      run: actions.duplicate,
      startsGroup: true,
      ...(duplicateShortcut === undefined ? {} : { shortcut: duplicateShortcut }),
    },
    { label: "Rename", icon: pencilIcon(), run: actions.rename },
    { label: "Delete", icon: trashIcon(15), run: actions.delete, isDanger: true },
  ];
}

/** A contextmenu handler that opens `menu` with `items` at the pointer. */
export function openMenuWith(
  menu: () => ContextMenu | null,
  items: () => MenuItem[],
): (event: MouseEvent) => void {
  return (event) => {
    event.preventDefault();
    event.stopPropagation();
    void menu()?.open(items(), { x: event.clientX, y: event.clientY });
  };
}

interface TreeHooks {
  workspaceId: () => string;
  menu: () => ContextMenu | null;
  addItem: (row: ContainerRow, kind: TreeItem["kind"]) => Promise<void>;
  openSettings: (row: ContainerRow) => void;
  rename: (id: string) => void;
  delete: (entry: { id: string; name: string }) => Promise<void>;
}

/** The tree's right-click menus: per row, or for the whole selection when the row is part of one. */
export class TreeRowMenus {
  constructor(private readonly hooks: TreeHooks) {}

  forContainer(row: ContainerRow): (event: MouseEvent) => void {
    const workspaceId = this.hooks.workspaceId();
    const isCollection = row.folderId === null;
    return openMenuWith(
      this.hooks.menu,
      () =>
        selectionMenuItems(row.id, workspaceId) ??
        containerMenuItems({
          addRequest: () => void this.hooks.addItem(row, "request"),
          addFolder: () => void this.hooks.addItem(row, "folder"),
          openSettings: () => {
            this.hooks.openSettings(row);
          },
          // A folder exports as a collection of its own (named after it).
          export: isCollection
            ? () => void exportCollection(workspaceId, row.collectionId)
            : () => void exportSelection(workspaceId, [row.id]),
          ...this.editActions(row),
        }),
    );
  }

  forRequest(item: TreeItem): (event: MouseEvent) => void {
    const workspaceId = this.hooks.workspaceId();
    return openMenuWith(
      this.hooks.menu,
      () => selectionMenuItems(item.id, workspaceId) ?? requestMenuItems(this.editActions(item)),
    );
  }

  private editActions(entry: { id: string; name: string }): EditActions {
    return {
      duplicate: () => void duplicateEntry(this.hooks.workspaceId(), entry.id),
      rename: () => {
        this.hooks.rename(entry.id);
      },
      delete: () => void this.hooks.delete(entry),
    };
  }
}
