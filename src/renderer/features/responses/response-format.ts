/** Small formatting helpers for the response panel. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatMilliseconds(milliseconds: number | null): string {
  if (milliseconds === null) return "—";
  return milliseconds < 10 ? `${milliseconds.toFixed(1)} ms` : `${String(Math.round(milliseconds))} ms`;
}

export type StatusTone = "success" | "redirect" | "client-error" | "server-error";

export function statusTone(status: number): StatusTone {
  if (status >= 500) return "server-error";
  if (status >= 400) return "client-error";
  if (status >= 300) return "redirect";
  return "success";
}

export function isHtml(contentType: string): boolean {
  return /^(text\/html|application\/xhtml\+xml)/i.test(contentType.trim());
}

export function isJson(contentType: string): boolean {
  return /^application\/([\w.+-]*\+)?json|^text\/json/i.test(contentType.trim());
}
