import { html, type TemplateResult } from "lit";
import type { Environment } from "@shared/models/environment";
import { setEnvironmentColor, setEnvironmentProtected } from "../../stores/environment-store";
import { renderColorTagPicker } from "./color-tag-picker";

/** Beside an environment's name: Protected, its colour tag, Duplicate and Delete. */
export function renderEnvironmentActions(options: {
  workspaceId: string;
  environment: Environment | undefined;
  duplicate: () => Promise<void>;
  delete: () => Promise<void>;
}): TemplateResult {
  const { workspaceId, environment } = options;
  if (environment === undefined) return html``;
  const toggleProtected = (event: Event): void => {
    void setEnvironmentProtected(workspaceId, environment.id, (event.target as HTMLInputElement).checked);
  };
  return html`
    <label
      class="protect"
      title="Ask before sending POST, PUT, PATCH or DELETE while this environment is active"
    >
      <input type="checkbox" .checked=${environment.isProtected} @change=${toggleProtected} />
      Protected
    </label>
    ${renderColorTagPicker(environment.color, (color) => {
      void setEnvironmentColor(workspaceId, environment.id, color);
    })}
    <button @click=${options.duplicate}>Duplicate</button>
    <button class="danger" @click=${options.delete}>Delete</button>
  `;
}
