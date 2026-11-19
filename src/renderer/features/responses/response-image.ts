import { css, html, LitElement, type TemplateResult } from "lit";
import type { ResponseView } from "@shared/models/http-exchange";
import { formatBytes } from "./response-format";

type ImageView = NonNullable<ResponseView["body"]["image"]>;

/** An image response, centred on a checkerboard (so transparency shows), with its pixel size. */
export class ResponseImage extends LitElement {
  static override styles = css`
    :host {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-4);
      overflow: auto;
    }
    .checker {
      display: flex;
      max-width: 100%;
      max-height: calc(100% - 28px);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-small);
      background-color: var(--color-raised);
      background-image: conic-gradient(
        var(--color-border-soft) 25%,
        transparent 0 50%,
        var(--color-border-soft) 0 75%,
        transparent 0
      );
      background-size: 16px 16px;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .caption {
      color: var(--color-text-faint);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
  `;
  static override properties = {
    image: { attribute: false },
    size: { attribute: false },
    dimensions: { state: true },
  };

  declare image: ImageView;
  declare size: number;
  declare dimensions: string | undefined;

  override render(): TemplateResult {
    const measure = (event: Event): void => {
      const picture = event.target as HTMLImageElement;
      this.dimensions = `${String(picture.naturalWidth)} × ${String(picture.naturalHeight)} px`;
    };
    return html`<div class="checker">
        <img
          src=${`data:${this.image.mimeType};base64,${this.image.base64}`}
          alt="Response image"
          @load=${measure}
        />
      </div>
      <span class="caption">${this.dimensions ?? this.image.mimeType} · ${formatBytes(this.size)}</span>`;
  }
}

customElements.define("response-image", ResponseImage);

declare global {
  interface HTMLElementTagNameMap {
    "response-image": ResponseImage;
  }
}
