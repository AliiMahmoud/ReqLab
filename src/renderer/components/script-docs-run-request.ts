import { html, type TemplateResult } from "lit";

const FROM_ANOTHER_COLLECTION = `// Pre-request of a request in "Orders": log in with the "Login" request of the "Auth" collection.
const login = await pm.execution.runRequest("3f6c2a1e-…"); // the Login request's ID
if (login.code !== 200) throw new Error("Login failed: " + login.code);
pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + login.json().access_token });`;

const ID_IN_A_VARIABLE = `// Keep the ID in an environment variable (e.g. loginRequestId), so scripts read like English.
const login = await pm.execution.runRequest(pm.environment.get("loginRequestId"));
pm.environment.set("token", login.json().access_token);`;

const HANDLE_ERRORS = `try {
  const report = await pm.execution.runRequest(pm.environment.get("reportRequestId"));
  pm.test("report is ready", () => pm.expect(report.json().status).to.equal("done"));
} catch (error) {
  console.error("Could not run the report request:", error.message);
}`;

/** The help window's section on pm.execution.runRequest: running any saved request, in any collection. */
export function renderRunRequestGuide(): TemplateResult {
  return html`<section>
    <h3>Running a request from another collection</h3>
    <p>
      <code>await pm.execution.runRequest(id)</code> sends any saved request of this workspace, from any
      collection, and gives you its response.
    </p>
    ${renderNotes()}
    <p class="example-title">Log in through another collection's request</p>
    <pre>${FROM_ANOTHER_COLLECTION}</pre>
    <p class="example-title">Keep the request's ID in a variable</p>
    <pre>${ID_IN_A_VARIABLE}</pre>
    <p class="example-title">Go on when it fails</p>
    <pre>${HANDLE_ERRORS}</pre>
  </section>`;
}

const NOTES: [string, string][] = [
  [
    "Its ID",
    "Type pm.execution.runRequest( and pick the request by name from the list that opens (type to search); its ID is inserted and its name is shown next to it. Or click the ID button next to the request's name to copy it.",
  ],
  [
    "How it runs",
    "As if you sent it yourself: with its own auth (inherited from its folder or collection), its own collection variables and its own pre-request / post-response scripts, in the environment selected now.",
  ],
  [
    "Variables",
    "Changes your script made before the call are saved first, so the other request sees them. What its scripts set in the environment and globals is visible to your script right after the call; its collection variables belong to its own collection (pass values through the environment instead).",
  ],
  [
    "The result",
    "Works like pm.response: code, status, responseTime, responseSize, headers.get(name), text(), json(), to.have.status(…).",
  ],
  [
    "Always await it",
    "It works in pre-request and post-response scripts. If the request cannot be sent (unknown ID, network error, its own pre-request script failed) the call throws: catch it to go on.",
  ],
  [
    "Limits",
    "Up to 10 runs per request's scripts, and requests may run requests at most 3 levels deep (so two requests running each other stop). Waiting for the response does not count towards the 10-second script limit.",
  ],
];

function renderNotes(): TemplateResult {
  return html`<ul class="notes">
    ${NOTES.map(([title, text]) => html`<li><strong>${title}:</strong> ${text}</li>`)}
  </ul>`;
}
