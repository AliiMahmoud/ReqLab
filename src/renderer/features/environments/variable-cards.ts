import { html, type TemplateResult } from "lit";
import type { VariableView } from "@shared/models/environment";
import { previewTemplate } from "./variable-owner-choice";

/** The two help cards under the table: how variables resolve, and a live preview of a template. */
export function renderVariableCards(options: {
  template: string;
  variables: VariableView[];
  setTemplate: (template: string) => void;
}): TemplateResult {
  return html`<div class="cards">
    <div class="card">
      <strong>Resolution order</strong>
      <p>
        Environment › Collection › Globals. The nearest value wins. Unknown names stay as written and show in
        red.
      </p>
    </div>
    <div class="card">
      <strong>Preview</strong>
      <input
        aria-label="Template to preview"
        .value=${options.template}
        @input=${(event: Event) => {
          options.setTemplate((event.target as HTMLInputElement).value);
        }}
      />
      <span class="resolved">→ ${previewTemplate(options.template, options.variables)}</span>
    </div>
  </div>`;
}
