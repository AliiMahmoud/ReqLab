import { css, html, LitElement, type TemplateResult } from "lit";
import type { DataLocation } from "@shared/models/data-location";
import { api } from "../../api";
import { formStyles } from "../../components/shared-styles";
import { askToConfirm } from "../../stores/confirm-store";
import { callApi, showNotice } from "../../stores/notice-store";
import { settingsDialogStyles } from "./settings-dialog-styles";
import { settingRowStyles } from "./setting-row-styles";

/**
 * Settings › General › Data folder: where workspaces, keys and settings live. Changing it moves
 * everything there (ReqLab restarts to do it, while nothing has the files open).
 */
export class DataLocationSection extends LitElement {
  static override styles = [
    formStyles,
    settingsDialogStyles,
    settingRowStyles,
    css`
      .path {
        font-family: var(--font-code);
        font-size: calc(12px * var(--text-scale));
        word-break: break-all;
      }
      .buttons {
        display: flex;
        gap: var(--space-2);
        flex-shrink: 0;
      }
      .error {
        margin: 6px 0 0;
        color: var(--color-warning);
        font-size: calc(12px * var(--text-scale));
      }
    `,
  ];
  static override properties = { location: { state: true } };

  declare location: DataLocation | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    void callApi(api.getDataLocation()).then((location) => {
      this.location = location;
    });
  }

  override render(): TemplateResult | undefined {
    const location = this.location;
    if (location === undefined) return undefined;
    return html`<h3 class="group">Data folder</h3>
      <div class="setting">
        <div>
          <div class="title">${location.isStandard ? "Standard folder" : "Custom folder"}</div>
          <p class="hint path">${location.path}</p>
          ${location.isPortable ? html`<p class="hint">Portable mode: the data stays next to the app.</p>` : undefined}
          ${location.error === null ? undefined : html`<p class="error">${location.error}</p>`}
        </div>
        ${location.isPortable ? undefined : this.renderButtons(location)}
      </div>`;
  }

  private renderButtons(location: DataLocation): TemplateResult {
    return html`<div class="buttons">
      ${location.isStandard ? undefined : html`<button @click=${this.useStandard}>Use default</button>`}
      <button @click=${this.change}>Change…</button>
    </div>`;
  }

  private readonly change = async (): Promise<void> => {
    const chosen = await callApi(api.chooseDataFolder());
    if (chosen === undefined || chosen === null) return;
    if (!(await confirmMove(chosen.path))) return;
    if ((await callApi(api.moveData({ token: chosen.token }))) !== undefined) await announceRestart();
  };

  private readonly useStandard = async (): Promise<void> => {
    if (!(await confirmMove("the standard folder"))) return;
    if ((await callApi(api.moveDataToStandard())) !== undefined) await announceRestart();
  };
}

async function announceRestart(): Promise<void> {
  const restartsItself = (await callApi(api.restartsItself())) ?? true;
  showNotice(
    restartsItself
      ? "Restarting to move the data…"
      : "Closing: start ReqLab again to finish moving the data.",
    false,
  );
}

function confirmMove(where: string): Promise<boolean> {
  return askToConfirm({
    kind: "move-data",
    title: "Move ReqLab's data?",
    message: `Workspaces, keys and settings move to ${where}. ReqLab closes and opens again to move them; open tabs come back as they are.`,
    confirmLabel: "Move and restart",
    isDanger: false,
  });
}

customElements.define("data-location-section", DataLocationSection);

declare global {
  interface HTMLElementTagNameMap {
    "data-location-section": DataLocationSection;
  }
}
