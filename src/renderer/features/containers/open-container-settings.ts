import type { ContainerSection } from "../../stores/request-tab";
import { openContainerTab } from "../../stores/tab-store";

export interface ContainerTarget {
  id: string;
  name: string;
  isCollection: boolean;
}

/** A collection's or folder's settings open in a tab (like Postman), or show the open one. */
export function openContainerSettings(target: ContainerTarget, section: ContainerSection = "auth"): void {
  openContainerTab(target, section);
}
