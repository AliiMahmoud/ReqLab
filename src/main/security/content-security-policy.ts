/**
 * The renderer may load only its own code and styles, may not open any network
 * connection, and may only create DOM from trusted templates (Trusted Types).
 * Even a fully compromised renderer cannot send data anywhere.
 */
const PRODUCTION_POLICY: Record<string, string[]> = {
  "default-src": ["'none'"],
  "script-src": ["'self'"],
  "style-src": ["'self'"],
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'"],
  "connect-src": ["'none'"],
  "frame-src": ["'self'"],
  "worker-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'none'"],
  "form-action": ["'none'"],
  "frame-ancestors": ["'none'"],
  "require-trusted-types-for": ["'script'"],
  // lit-html renders templates; response-preview builds the sandboxed HTML preview (srcdoc).
  "trusted-types": ["lit-html", "response-preview"],
};

/** Vite's dev server needs inline styles and a websocket for hot reload. Never shipped. */
const DEVELOPMENT_OVERRIDES: Record<string, string[]> = {
  "style-src": ["'self'", "'unsafe-inline'"],
  "connect-src": ["'self'", "ws:"],
  "require-trusted-types-for": [],
  "trusted-types": [],
};

export function buildContentSecurityPolicy(forDevelopment: boolean): string {
  const policy = forDevelopment ? { ...PRODUCTION_POLICY, ...DEVELOPMENT_OVERRIDES } : PRODUCTION_POLICY;
  return Object.entries(policy)
    .filter(([, sources]) => sources.length > 0)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

export function buildSecurityHeaders(forDevelopment: boolean): Record<string, string> {
  return {
    "Content-Security-Policy": buildContentSecurityPolicy(forDevelopment),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}
