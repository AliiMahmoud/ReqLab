import { html, LitElement, type TemplateResult } from "lit";
import { api } from "./api";
import type { MenuCommand } from "@shared/main-events";
import { watch } from "./controllers/signal-watcher";
import { REQUEST_COMMAND_EVENT } from "./features/requests/request-commands";
import { FOCUS_SEARCH_EVENT } from "./features/sidebar/workspace-sidebar";
import { beautifyActiveBody } from "./stores/body-actions";
import { toggleResponse } from "./stores/layout-store";
import { closeActiveTab, openDraft, reopenClosedTab } from "./stores/tab-store";
import "./components/confirm-dialog";
import { goBack, goForward } from "./stores/navigation-store";
import { duplicateActiveRequest } from "./stores/duplicate-active";
import { installVariableAssist } from "./features/variables/variable-assist";
import "./features/workspaces/unlock-screen";
import "./features/workspaces/welcome-screen";
import "./features/workspaces/workspace-home";
import {
  findWorkspace,
  hasLoaded,
  isAddingWorkspace,
  openWorkspaceId,
  selectedWorkspaceId,
  startApp,
  workspaces,
} from "./stores/workspace-store";

/**
 * Root component. The open workspace; or, before one is open: the welcome screen (no workspaces yet,
 * or adding one) or the unlock card (a master password, or locked after inactivity).
 */
export class AppShell extends LitElement {
  readonly #stopListening: (() => void)[] = [];

  constructor() {
    super();
    watch(this, workspaces, openWorkspaceId, selectedWorkspaceId, isAddingWorkspace, hasLoaded);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopListening.push(api.onMenuCommand(runMenuCommand));
    void startApp();
  }

  override disconnectedCallback(): void {
    for (const stop of this.#stopListening.splice(0)) stop();
    super.disconnectedCallback();
  }

  override render(): TemplateResult | undefined {
    if (!hasLoaded.get()) return undefined;
    const open = findWorkspace(openWorkspaceId.get());
    if (open?.isUnlocked === true && !isAddingWorkspace.get()) {
      return html`<workspace-home .workspace=${open}></workspace-home>`;
    }
    const locked = findWorkspace(selectedWorkspaceId.get()) ?? workspaces.get()[0];
    // Screens without the header still need a strip to drag the window by.
    const dragStrip = html`<div class="drag-strip" aria-hidden="true"></div>`;
    if (locked === undefined || isAddingWorkspace.get())
      return html`${dragStrip}<welcome-screen></welcome-screen>`;
    return html`${dragStrip}<unlock-screen .workspace=${locked}></unlock-screen>`;
  }

  /** The single confirmation dialog sits beside whatever screen is shown. */
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot();
    if (!document.querySelector("confirm-dialog"))
      document.body.append(document.createElement("confirm-dialog"));
    if (!document.querySelector("variable-popover")) installVariableAssist();
    return root;
  }
}

/** Send and Save need the request area (it owns the save dialog), so they go to it as a window event. */
function requestCommand(command: "send" | "save"): () => void {
  return () => {
    window.dispatchEvent(new CustomEvent(REQUEST_COMMAND_EVENT, { detail: command }));
  };
}

const MENU_ACTIONS: Record<MenuCommand, () => void> = {
  "send-request": requestCommand("send"),
  "save-request": requestCommand("save"),
  "new-tab": () => {
    openDraft();
  },
  "close-tab": closeActiveTab,
  "reopen-closed-tab": reopenClosedTab,
  "toggle-response": toggleResponse,
  beautify: beautifyActiveBody,
  "focus-search": () => {
    window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT));
  },
  duplicate: () => void duplicateActiveRequest(),
  "go-back": goBack,
  "go-forward": goForward,
};

/** Shortcuts from the application menu; they only apply while a workspace is open. */
function runMenuCommand(command: MenuCommand): void {
  if (findWorkspace(openWorkspaceId.get())?.isUnlocked !== true || isAddingWorkspace.get()) return;
  MENU_ACTIONS[command]();
}

customElements.define("reqlab-app", AppShell);

declare global {
  interface HTMLElementTagNameMap {
    "reqlab-app": AppShell;
  }
}
