import { html, type TemplateResult } from "lit";
import { EXPECT_WORDS, SCRIPT_API } from "./script-api-entries";
import { renderRunRequestGuide } from "./script-docs-run-request";

/** Ready-to-use examples, shown with a short title. */
const EXAMPLES: [string, string][] = [
  [
    "Save a token from a login response (post-response)",
    'const body = pm.response.json();\npm.environment.set("token", body.access_token);',
  ],
  [
    "Test the response (post-response)",
    'pm.test("status is 200", () => pm.response.to.have.status(200));\npm.test("has an id", () => {\n  const body = pm.response.json();\n  pm.expect(body).to.have.property("id");\n  pm.expect(body.id).to.be.a("number");\n});',
  ],
  [
    "Add a header before sending (pre-request)",
    'pm.request.headers.upsert({ key: "X-Request-Id", value: String(Date.now()) });',
  ],
  [
    "Log in first by running another saved request (pre-request)",
    'const login = await pm.execution.runRequest("<request id from its ID button>");\npm.request.headers.upsert({ key: "Authorization", value: "Bearer " + login.json().token });',
  ],
  [
    "A value for this send only",
    'pm.variables.set("page", "2"); // {{page}} in the URL, headers or body uses it',
  ],
  [
    "Fill {{variables}} into your own text",
    'const url = pm.variables.replaceIn("{{baseUrl}}/users");\nconsole.log(url);',
  ],
];

const SECTIONS: [string, string][] = [
  ["Variables", "pm.environment, pm.collectionVariables, pm.globals, pm.variables"],
  ["Request", "pm.request"],
  ["Response", "pm.response"],
  ["Tests", "pm.test, pm.expect"],
  ["Running other requests", "pm.execution"],
  ["Other", "pm.info, console"],
];

/** The help window's text: how scripts run, the pm API by section, assertions and examples. */
export function renderScriptDocs(): TemplateResult {
  return html`${renderHowScriptsRun()}
    ${SECTIONS.map(([title, roots]) => renderSection(title, roots.split(", ")))} ${renderRunRequestGuide()}
    <section>
      <h3>pm.expect(value)</h3>
      <p>
        Chain words to read like English, e.g. <code>pm.expect(x).to.be.above(3)</code>,
        <code>.to.not.include("a")</code>, <code>.to.deep.equal({…})</code>:
      </p>
      <p class="words">${EXPECT_WORDS.map((word) => html`<code>${word}</code> `)}</p>
    </section>
    <section>
      <h3>Examples</h3>
      ${EXAMPLES.map(
        ([title, code]) =>
          html`<p class="example-title">${title}</p>
            <pre>${code}</pre>`,
      )}
    </section>`;
}

function renderHowScriptsRun(): TemplateResult {
  return html`<section>
    <h3>How scripts run</h3>
    <ul class="notes">
      <li>
        <strong>Pre-request</strong> runs before the request is sent; <strong>Post-response</strong> after the
        response arrives.
      </li>
      <li>Order: the collection's script, then each folder's (outermost first), then the request's own.</li>
      <li>
        <code>pm.environment</code>, <code>pm.collectionVariables</code> and <code>pm.globals</code> changes
        are saved; <code>pm.variables.set</code> lasts for this send only and wins over every other scope.
      </li>
      <li>
        A failing pre-request script stops the send. Post-response scripts run for every response, including
        errors such as 404 or 502; their errors are shown in the Tests tab.
      </li>
      <li>
        A check outside <code>pm.test</code> (e.g. a bare <code>pm.response.to.be.ok;</code>) that fails is
        listed as a failed test and the script goes on; inside <code>pm.test</code> it fails just that test.
      </li>
      <li>
        Scripts run in a sealed sandbox: no files, no network (<code>pm.sendRequest</code> is not available;
        use <code>pm.execution.runRequest</code>), at most 10 seconds and 64 MB per run.
      </li>
      <li>Results (tests, console output, errors) are in the response's <strong>Tests</strong> tab.</li>
    </ul>
  </section>`;
}

function renderSection(title: string, roots: string[]): TemplateResult {
  const entries = SCRIPT_API.filter(([path]) =>
    roots.some((root) => path === root || path.startsWith(`${root}.`)),
  );
  return html`<section>
    <h3>${title}</h3>
    <dl>
      ${entries.map(
        ([path, kind, detail]) =>
          html`<dt><code>${kind === "function" ? `${path}()` : path}</code></dt>
            <dd>${detail}</dd>`,
      )}
    </dl>
  </section>`;
}
