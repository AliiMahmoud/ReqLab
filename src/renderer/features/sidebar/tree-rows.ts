import { html, type TemplateResult } from "lit";
import { methodColor } from "../../components/method-colors";
import { safeStyle } from "../../directives/safe-style";
import { shortName } from "../../components/short-name";
import { askToConfirm } from "../../stores/confirm-store";

/** Helpers for the collection tree's rows: dragging, indentation and the delete question. */
export const DRAG_TYPE = "application/x-reqlab-item";

/** A collection (folderId null) or a folder: rows that can hold items and accept drops. */
export interface ContainerRow {
  id: string;
  name: string;
  collectionId: string;
  folderId: string | null;
  depth: number;
}

export function indent(depth: number): string {
  return `${String(8 + depth * 16)}px`;
}

/** The row being dragged: it never shows a drop marker on itself. */
let draggedId: string | undefined;

export function noteDragStart(id: string): void {
  draggedId = id;
}

export function draggedItemId(): string | undefined {
  return draggedId;
}

document.addEventListener("dragend", () => {
  draggedId = undefined;
});

export function startDrag(event: DragEvent, itemId: string): void {
  event.stopPropagation();
  noteDragStart(itemId);
  event.dataTransfer?.setData(DRAG_TYPE, itemId);
  if (event.dataTransfer !== null) event.dataTransfer.effectAllowed = "move";
}

export function confirmTreeDelete(name: string): Promise<boolean> {
  return askToConfirm({
    kind: "delete-tree-item",
    title: `Delete "${shortName(name)}"?`,
    message: "Everything inside it is deleted too. This cannot be undone.",
    confirmLabel: "Delete",
    isDanger: true,
  });
}

/** At most five letters, as in Postman's sidebar (DEL, OPT); the full name is in the request. */
function shortMethod(method: string): string {
  const upper = method.toUpperCase();
  const known: Record<string, string> = { DELETE: "DEL", OPTIONS: "OPT" };
  return known[upper] ?? upper.slice(0, 5);
}

/** The coloured method label of a request row (GET, POST, DEL…). */
export function renderMethodBadge(method: string): TemplateResult {
  return html`<span class="method" style=${safeStyle({ color: methodColor(method) })}
    >${shortMethod(method)}</span
  >`;
}

/** A dragstart handler that carries this item (request or folder) to a drop target. */
export function dragItem(itemId: string): (event: DragEvent) => void {
  return (event) => {
    startDrag(event, itemId);
  };
}
