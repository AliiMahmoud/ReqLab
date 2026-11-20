import { html, type TemplateResult } from "lit";

/** Small pieces of the Network settings panel. */

export function renderSwitchRow(row: {
  name: string;
  title: string;
  hint: string;
  isOn: boolean;
}): TemplateResult {
  return html`<div class="switch-row">
    <div>
      <h3>${row.title}</h3>
      <p class="hint">${row.hint}</p>
    </div>
    <input
      class="switch"
      type="checkbox"
      role="switch"
      name=${row.name}
      aria-label=${row.title}
      .checked=${row.isOn}
    />
  </div>`;
}

export function isChecked(form: HTMLFormElement, name: string): boolean {
  return form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.checked ?? false;
}

/** Read from the input itself: FormData skips disabled inputs (the proxy fields outside Custom). */
export function inputValue(form: HTMLFormElement, name: string): string {
  return form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value ?? "";
}

export function preventSubmit(event: SubmitEvent): void {
  event.preventDefault();
}
