/**
 * The HTML preview of a response. It is shown in <iframe sandbox=""> (no scripts, no forms,
 * unique origin) and starts with its own CSP that blocks every remote resource.
 * Trusted Types require srcdoc to come from a named policy; this is the only one besides Lit's.
 */
const PREVIEW_POLICY_NAME = "response-preview";
const PREVIEW_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";

interface PreviewPolicy {
  createHTML(input: string): unknown;
}

let policy: PreviewPolicy | undefined;

export function createPreviewDocument(responseHtml: string): unknown {
  const document = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">${responseHtml}`;
  policy ??= createPolicy();
  return policy === undefined ? document : policy.createHTML(document);
}

function createPolicy(): PreviewPolicy | undefined {
  const factory = (window as { trustedTypes?: { createPolicy(name: string, rules: object): PreviewPolicy } })
    .trustedTypes;
  return factory?.createPolicy(PREVIEW_POLICY_NAME, { createHTML: (input: string) => input });
}
