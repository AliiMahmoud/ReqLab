import { signal } from "./signal";
import { activeTabId, tabs } from "./tab-store";
import { mainView } from "./view-store";

/** A place the user was: a request tab, or the Environments page. */
type Place = { kind: "tab"; tabId: string } | { kind: "environments" };

const MAX_HISTORY = 50;
const backStack: Place[] = [];
const forwardStack: Place[] = [];
let current: Place | undefined;
let isTravelling = false;

/** Whether Back / Forward have somewhere to go (the title bar's arrows use these). */
export const canGoBack = signal(false);
export const canGoForward = signal(false);

/**
 * Back / forward through the tabs and pages visited, like a browser. Every switch of tab or page is
 * remembered; places that no longer exist (closed tabs) are skipped.
 */
export function goBack(): void {
  travel(backStack, forwardStack);
}

export function goForward(): void {
  travel(forwardStack, backStack);
}

function travel(from: Place[], to: Place[]): void {
  for (let place = from.pop(); place !== undefined; place = from.pop()) {
    if (!stillExists(place) || isSame(place, current)) continue;
    if (current !== undefined) to.push(current);
    show(place);
    break;
  }
  syncFlags();
}

function show(place: Place): void {
  isTravelling = true;
  if (place.kind === "environments") {
    mainView.set("environments");
  } else {
    mainView.set("requests");
    activeTabId.set(place.tabId);
  }
  isTravelling = false;
  current = place;
}

/** Called on every tab or page change that was not itself a Back / Forward. */
function remember(): void {
  if (isTravelling) return;
  const next = placeShown();
  if (next === undefined || isSame(next, current)) return;
  if (current !== undefined) backStack.push(current);
  if (backStack.length > MAX_HISTORY) backStack.shift();
  forwardStack.length = 0;
  current = next;
  syncFlags();
}

function placeShown(): Place | undefined {
  if (mainView.get() === "environments") return { kind: "environments" };
  const tabId = activeTabId.get();
  return tabId === undefined ? undefined : { kind: "tab", tabId };
}

function stillExists(place: Place): boolean {
  return place.kind === "environments" || tabs.get().some((tab) => tab.id === place.tabId);
}

function isSame(a: Place, b: Place | undefined): boolean {
  if (b === undefined || a.kind !== b.kind) return false;
  return a.kind === "environments" || (b.kind === "tab" && a.tabId === b.tabId);
}

function syncFlags(): void {
  canGoBack.set(backStack.some((place) => stillExists(place) && !isSame(place, current)));
  canGoForward.set(forwardStack.some((place) => stillExists(place) && !isSame(place, current)));
}

activeTabId.subscribe(remember);
mainView.subscribe(remember);
tabs.subscribe(syncFlags);

// The back / forward buttons on the side of a mouse.
document.addEventListener("mouseup", (event) => {
  if (event.button === 3) goBack();
  if (event.button === 4) goForward();
});
