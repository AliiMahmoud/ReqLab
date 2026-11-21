import { css, html, LitElement, type TemplateResult } from "lit";
import type { InheritedAuth } from "@shared/models/scripts";
import { api } from "../../api";
import { AUTH_TYPE_LABELS } from "../../components/auth-fields";
import { openContainerSettings } from "../containers/open-container-settings";

/** Under "Inherit": which folder or collection the auth comes from, and what it is (like Postman). */
export class InheritedAuthHint extends LitElement {
  static override styles = css`
    p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: calc(12.5px * var(--text-scale));
      line-height: 1.6;
    }
    button {
      padding: 0;
      border: none;
      background: none;
      color: var(--color-link);
      font: inherit;
      cursor: pointer;
    }
    button:hover {
      text-decoration: underline;
    }
  `;
  static override properties = {
    workspaceId: { attribute: false },
    itemId: { attribute: false },
    inherited: { state: true },
  };

  declare workspaceId: string;
  declare itemId: string | null;
  declare inherited: InheritedAuth | undefined;

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("itemId") || changed.has("workspaceId")) void this.load();
  }

  /** Read again when the settings window saves, so the hint follows. */
  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("reqlab:container-settings-saved", this.reload);
  }

  override disconnectedCallback(): void {
    window.removeEventListener("reqlab:container-settings-saved", this.reload);
    super.disconnectedCallback();
  }

  override render(): TemplateResult {
    if (this.itemId === null)
      return html`<p>
        This draft is not in a collection yet, so there is nothing to inherit: it is sent without auth.
      </p>`;
    const inherited = this.inherited;
    if (inherited === undefined) return html`<p>…</p>`;
    const from = inherited.from;
    if (from === null)
      return html`<p>No folder or collection above this request has auth, so it is sent without auth.</p>`;
    const open = (): void => {
      openContainerSettings(
        { id: from.id, name: from.name, isCollection: from.kind === "collection" },
        "auth",
      );
    };
    return html`<p>
      Uses <strong>${labelOf(inherited.type)}</strong> from the ${from.kind}
      <button @click=${open}>${from.name}</button>.
    </p>`;
  }

  private readonly reload = (): void => {
    void this.load();
  };

  private async load(): Promise<void> {
    if (this.itemId === null) return;
    const result = await api.getInheritedAuth({ workspaceId: this.workspaceId, itemId: this.itemId });
    this.inherited = result.ok ? result.value : undefined;
  }
}

function labelOf(type: string): string {
  return AUTH_TYPE_LABELS.find(([value]) => value === type)?.[1] ?? type;
}

customElements.define("inherited-auth-hint", InheritedAuthHint);

declare global {
  interface HTMLElementTagNameMap {
    "inherited-auth-hint": InheritedAuthHint;
  }
}
