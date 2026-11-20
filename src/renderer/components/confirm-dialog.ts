import { css, html, LitElement, type TemplateResult } from "lit";
import { watch } from "../controllers/signal-watcher";
import {
  answerConfirmation,
  pendingConfirmation,
  type ConfirmChoice,
  type ConfirmRequest,
} from "../stores/confirm-store";
import { dialogStyles } from "./dialog-styles";
import { closeIcon } from "./icons";
import { formStyles } from "./shared-styles";
import { showModal } from "./modal-dialog";

/**
 * The app's one question dialog: Cancel, the primary action and, when asked for, a second action
 * (e.g. "Don't save"), with "Don't ask again" and an × that cancels. Mounted once, at the root.
 */
export class ConfirmDialog extends LitElement {
  static override styles = [
    formStyles,
    dialogStyles,
    css`
      dialog {
        position: relative;
      }
      .close {
        position: absolute;
        top: 12px;
        right: 12px;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--color-text-muted);
      }
      strong {
        display: block;
        padding-right: 32px;
        overflow-wrap: anywhere;
      }
      .actions .secondary {
        margin-right: auto;
      }
    `,
  ];

  constructor() {
    super();
    watch(this, pendingConfirmation);
  }

  override render(): TemplateResult {
    const pending = pendingConfirmation.get();
    return html`<dialog @cancel=${this.decline}>
      ${pending === undefined ? undefined : this.renderQuestion(pending)}
    </dialog>`;
  }

  private renderQuestion(pending: ConfirmRequest): TemplateResult {
    return html`<button type="button" class="close" aria-label="Cancel" title="Cancel" @click=${this.decline}>
        ${closeIcon()}
      </button>
      <form @submit=${this.accept}>
        <strong>${pending.title}</strong>
        <p class="hint">${pending.message}</p>
        <label class="checkbox"
          ><input type="checkbox" name="dontAskAgain" /><span>Don't ask again</span></label
        >
        <div class="actions">
          ${
            pending.secondaryLabel === undefined
              ? undefined
              : html`<button type="button" class="secondary" @click=${this.chooseSecondary}>
                  ${pending.secondaryLabel}
                </button>`
          }
          <button type="button" @click=${this.decline}>Cancel</button>
          <button class="primary ${pending.isDanger ? "danger" : ""}">${pending.confirmLabel}</button>
        </div>
      </form>`;
  }

  protected override updated(): void {
    const dialog = this.renderRoot.querySelector("dialog");
    if (dialog === null) return;
    const isAsking = pendingConfirmation.get() !== undefined;
    if (isAsking && !dialog.open) {
      this.renderRoot.querySelector("form")?.reset();
      showModal(dialog);
      this.renderRoot.querySelector<HTMLButtonElement>("button.primary")?.focus();
    }
    if (!isAsking && dialog.open) dialog.close();
  }

  private answer(choice: ConfirmChoice): void {
    const form = this.renderRoot.querySelector("form");
    const dontAskAgain = form !== null && new FormData(form).get("dontAskAgain") === "on";
    answerConfirmation(choice, dontAskAgain);
  }

  private readonly accept = (event: SubmitEvent): void => {
    event.preventDefault();
    this.answer("primary");
  };

  private readonly chooseSecondary = (): void => {
    this.answer("secondary");
  };

  private readonly decline = (event: Event): void => {
    event.preventDefault();
    answerConfirmation("cancel", false);
  };
}

customElements.define("confirm-dialog", ConfirmDialog);

declare global {
  interface HTMLElementTagNameMap {
    "confirm-dialog": ConfirmDialog;
  }
}
