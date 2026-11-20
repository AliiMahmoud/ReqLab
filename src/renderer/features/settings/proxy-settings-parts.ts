import { html, type TemplateResult } from "lit";
import type { NetworkSettingsView, ProxyMode } from "@shared/models/network-settings";
import type { SelectOption } from "../../components/ui-select";
import "../../components/ui-select";

/** Settings › Network › Proxy: which proxy requests use, and the custom proxy's fields. */

const PROXY_MODES: SelectOption[] = [
  { value: "system", label: "System proxy" },
  { value: "custom", label: "Custom proxy" },
  { value: "none", label: "No proxy" },
];

const PROXY_HINTS: Record<ProxyMode, string> = {
  system: "Requests follow this computer's proxy settings.",
  custom: "Requests go through this HTTP proxy.",
  none: "Requests always connect directly, even when the computer has a proxy.",
};

export function isProxyMode(value: string): value is ProxyMode {
  return value in PROXY_HINTS;
}

/** The custom proxy's fields stay visible but disabled in the other modes, keeping their values. */
export function renderProxySection(
  proxy: NetworkSettingsView["proxy"],
  chooseMode: (mode: string) => void,
): TemplateResult {
  const isOff = proxy.mode !== "custom";
  return html`<section class=${isOff ? "is-off" : ""}>
    <div class="switch-row">
      <div>
        <h3>Proxy</h3>
        <p class="hint">${PROXY_HINTS[proxy.mode]}</p>
      </div>
      <ui-select
        .options=${PROXY_MODES}
        .value=${proxy.mode}
        .label=${"Proxy"}
        .onChange=${chooseMode}
      ></ui-select>
    </div>
    ${renderProxyAddress(proxy, isOff)} ${renderProxyCredentials(proxy.hasCredentials, isOff)}
    <p class="hint">https goes through a CONNECT tunnel, so the proxy cannot read it.</p>
  </section>`;
}

function renderProxyAddress(proxy: NetworkSettingsView["proxy"], isOff: boolean): TemplateResult {
  return html`<div class="row">
    <input
      ?disabled=${isOff}
      name="proxyUrl"
      aria-label="Proxy URL"
      placeholder="http://proxy.local:8080"
      .value=${proxy.url}
    />
    <input
      ?disabled=${isOff}
      name="proxyBypass"
      aria-label="Bypass list"
      placeholder="localhost, *.internal"
      .value=${proxy.bypass}
    />
  </div>`;
}

/** Empty fields keep the stored credentials. */
function renderProxyCredentials(hasCredentials: boolean, isDisabled: boolean): TemplateResult {
  return html`<div class="row">
    <input
      ?disabled=${isDisabled}
      name="proxyUsername"
      aria-label="Proxy username"
      autocomplete="off"
      placeholder=${hasCredentials ? "Username (stored)" : "Username (optional)"}
    />
    <input
      ?disabled=${isDisabled}
      name="proxyPassword"
      type="password"
      aria-label="Proxy password"
      autocomplete="off"
      placeholder=${hasCredentials ? "Password (stored)" : "Password"}
    />
  </div>`;
}
