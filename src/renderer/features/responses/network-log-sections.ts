import { html, type TemplateResult } from "lit";
import type { LoggedExchange, NetworkLogView } from "@shared/models/network-log";
import { formatBytes, formatMilliseconds, statusTone } from "./response-format";

/** The parts of the Network log's Details view, top to bottom. */

const NETWORK_LABELS: Record<string, string> = {
  proxy: "Proxy",
  proxyAddress: "Proxy address",
  serverAddress: "Server address",
  localAddress: "Local address",
  tls: "TLS",
  tlsVerified: "Certificate verified",
  certificateSubject: "Certificate for",
  certificateIssuer: "Issued by",
  certificateValid: "Valid",
  certificateNames: "Names (SAN)",
  certificateFingerprint: "SHA-256 fingerprint",
};

/** Result, method and URL, total time and the proxy, in one line. */
export function renderSummary(log: NetworkLogView): TemplateResult {
  const first = log.exchanges[0];
  const last = log.exchanges.at(-1);
  const total = log.exchanges.reduce((sum, exchange) => sum + (exchange.response?.timings.total ?? 0), 0);
  return html`<div class="summary">
    ${renderResultBadge(log, last)}
    <strong>${first?.request.method ?? ""}</strong>
    <span class="url">${first?.request.url ?? ""}</span>
    <span class="muted"
      >${formatMilliseconds(total)} · started ${new Date(log.startedAt).toLocaleTimeString()}</span
    >
    <span class="muted">Proxy: ${first?.network["proxy"] ?? "—"}</span>
  </div>`;
}

function renderResultBadge(log: NetworkLogView, last: LoggedExchange | undefined): TemplateResult {
  const response = last?.response;
  if (log.error !== undefined || response === undefined)
    return html`<span class="badge tone-failed">Failed</span>`;
  return html`<span class="badge tone-${statusTone(response.status)}"
    >${response.status} ${response.statusText}</span
  >`;
}

export function renderError(error: NetworkLogView["error"]): TemplateResult | undefined {
  if (error === undefined) return undefined;
  return html`<div class="error-card" role="alert">
    <strong>Error:</strong> ${error.message}
    ${error.cause === undefined ? undefined : html`<code>${error.cause}</code>`}
  </div>`;
}

/** One request on the wire; a redirect is numbered after the first. */
export function renderExchange(exchange: LoggedExchange, index: number): TemplateResult {
  const { request, response } = exchange;
  const outcome =
    response === undefined ? "no response" : `${String(response.status)} ${response.statusText}`;
  return html`<details open>
    <summary>
      ${index === 0 ? "Request" : `Redirect ${String(index)}`} · ${request.method} ${request.url}
      <span class="muted">→ ${outcome}</span>
    </summary>
    ${renderPart("Network", renderPairs(networkRows(exchange.network)), true)}
    ${renderPart(`Request headers (${String(Object.keys(request.headers).length)})`, renderPairs(headerRows(request.headers)))}
    ${renderPart(`Request body (${formatBytes(request.bodySize)})`, renderBody(request.body))}
    ${response === undefined ? undefined : renderResponse(response)}
  </details>`;
}

function renderResponse(response: NonNullable<LoggedExchange["response"]>): TemplateResult {
  const { timings } = response;
  const timingRows: [string, string][] = [
    ["DNS", formatMilliseconds(timings.dns)],
    ["Connect", formatMilliseconds(timings.connect)],
    ["TLS", formatMilliseconds(timings.tls)],
    ["First byte", formatMilliseconds(timings.firstByte)],
    ["Download", formatMilliseconds(timings.download)],
    ["Total", formatMilliseconds(timings.total)],
  ];
  return html`${renderPart(`Response headers (${String(Object.keys(response.headers).length)}) · HTTP/${response.httpVersion}`, renderPairs(headerRows(response.headers)), true)}
  ${renderPart(`Response body (${formatBytes(response.bodySize)})`, renderBody(response.body))}
  ${renderPart("Timing", renderPairs(timingRows))}`;
}

/** Every event with its time since the start; failures in the error colour. */
export function renderTimeline(events: NetworkLogView["events"]): TemplateResult {
  return html`<details open>
    <summary>Timeline <span class="muted">(${events.length} events)</span></summary>
    <div class="section">
      <table class="timeline">
        ${events.map(
          (event) =>
            html`<tr class=${/error|failed|refused/i.test(event.text) ? "is-failure" : ""}>
              <td>+${event.ms} ms</td>
              <td>${event.text}</td>
            </tr>`,
        )}
      </table>
    </div>
  </details>`;
}

function renderPart(title: string, content: TemplateResult, isOpen = false): TemplateResult {
  return html`<details ?open=${isOpen}>
    <summary>${title}</summary>
    <div class="section">${content}</div>
  </details>`;
}

function renderPairs(rows: [string, string][]): TemplateResult {
  if (rows.length === 0) return html`<p class="empty">None.</p>`;
  return html`<table>
    ${rows.map(
      ([name, value]) =>
        html`<tr>
          <td>${name}</td>
          <td>${value}</td>
        </tr>`,
    )}
  </table>`;
}

function renderBody(body: string | undefined): TemplateResult {
  return body === undefined ? html`<p class="empty">No body.</p>` : html`<pre>${body}</pre>`;
}

function networkRows(network: Record<string, string>): [string, string][] {
  return Object.entries(network).map(([key, value]) => [NETWORK_LABELS[key] ?? key, value]);
}

function headerRows(headers: Record<string, string | string[]>): [string, string][] {
  return Object.entries(headers).flatMap(([name, value]) =>
    [value].flat().map((single): [string, string] => [name, single]),
  );
}
