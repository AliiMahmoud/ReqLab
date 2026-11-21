import { css, html, LitElement, type TemplateResult } from "lit";
import { thinScrollbarStyles } from "../../components/thin-scrollbar";
import { safeStyle } from "../../directives/safe-style";
import type { HistoryEntry } from "@shared/models/history";
import { methodColor } from "../../components/method-colors";
import { formStyles } from "../../components/shared-styles";
import { watch } from "../../controllers/signal-watcher";
import { askToConfirm } from "../../stores/confirm-store";
import { clearHistory, historyEntries } from "../../stores/history-store";
import { openDraft } from "../../stores/tab-store";
import { treeSearch } from "../../stores/view-store";
import { rowButtonStyles, treeStyles } from "./tree-styles";

/** Recently sent requests (as written, credentials redacted). Click one to reopen it as a draft. */
export class HistoryList extends LitElement {
  static override styles = [
    thinScrollbarStyles,
    formStyles,
    treeStyles,
    rowButtonStyles,
    css`
      .url {
        font-family: var(--font-code);
        font-size: calc(11.5px * var(--text-scale));
      }
      .meta {
        font-family: var(--font-code);
        font-size: calc(10.5px * var(--text-scale));
        color: var(--color-text-faint);
        flex: none;
      }
      .status-ok {
        color: var(--color-success);
      }
      .status-bad {
        color: var(--color-danger);
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 var(--space-2) var(--space-2);
        color: var(--color-text-faint);
        font-size: calc(11px * var(--text-scale));
      }
      .toolbar button {
        padding: 2px 8px;
        font-size: calc(11px * var(--text-scale));
      }
    `,
  ];
  static override properties = { workspaceId: { attribute: false } };

  declare workspaceId: string;

  constructor() {
    super();
    watch(this, historyEntries, treeSearch);
  }

  override render(): TemplateResult {
    const needle = treeSearch.get().trim().toLowerCase();
    const entries = historyEntries
      .get()
      .filter((entry) => entry.definition.url.toLowerCase().includes(needle));
    if (historyEntries.get().length === 0) return html`<p class="empty">Requests you send appear here.</p>`;
    return html`
      <div class="toolbar">
        <span>${String(entries.length)} requests</span>
        <button class="ghost" @click=${this.confirmClear}>Clear</button>
      </div>
      <nav aria-label="History">${entries.map((entry) => this.renderEntry(entry))}</nav>
    `;
  }

  private renderEntry(entry: HistoryEntry): TemplateResult {
    const method = entry.definition.method.toUpperCase();
    return html`<div class="row">
      <button
        class="row-main"
        title=${entry.definition.url}
        @click=${() => {
          openFromHistory(entry);
        }}
      >
        <span class="method" style=${safeStyle({ color: methodColor(method) })}>${method}</span>
        <span class="name url">${entry.definition.url || "(no URL)"}</span>
        <span class="meta ${statusClass(entry.status)}"
          >${entry.status === null ? "failed" : String(entry.status)}</span
        >
        <span class="meta">${formatTime(entry.sentAt)}</span>
      </button>
    </div>`;
  }

  private readonly confirmClear = async (): Promise<void> => {
    const confirmed = await askToConfirm({
      kind: "clear-history",
      title: "Clear the request history?",
      message: "Every entry in this workspace's history is deleted.",
      confirmLabel: "Clear history",
      isDanger: true,
    });
    if (confirmed) await clearHistory(this.workspaceId);
  };
}

function openFromHistory(entry: HistoryEntry): void {
  openDraft(structuredClone(entry.definition), describeUrl(entry.definition.url));
}

function describeUrl(url: string): string {
  const withoutQuery = url.split("?")[0] ?? url;
  return withoutQuery.replace(/^[a-z]+:\/\//i, "").slice(0, 60) || "Untitled request";
}

function statusClass(status: number | null): string {
  if (status === null || status >= 400) return "status-bad";
  return status < 300 ? "status-ok" : "";
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

customElements.define("history-list", HistoryList);

declare global {
  interface HTMLElementTagNameMap {
    "history-list": HistoryList;
  }
}
