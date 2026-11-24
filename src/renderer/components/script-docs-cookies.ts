import { html, type TemplateResult } from "lit";

const READ_A_COOKIE = `// Post-response: the session cookie the login response just set.
const session = pm.cookies.get("session");
pm.test("logged in", () => pm.expect(session).to.be.a("string"));
pm.environment.set("sessionId", session);`;

const USE_THE_JAR = `// Pre-request: put a cookie in the jar, read and remove others, for any URL.
const jar = pm.cookies.jar();
await jar.set("https://api.example.com", "locale", "en");
await jar.set("https://api.example.com", { name: "beta", value: "1", path: "/v2", expires: "2030-01-01" });
const theme = await jar.get("https://example.com", "theme");
const all = await jar.getAll("https://api.example.com/v2");
await jar.unset("https://api.example.com", "old");
await jar.clear("https://tracking.example");`;

const WITH_CALLBACKS = `// The same, Postman-style with a callback (error, result).
pm.cookies.jar().get("https://api.example.com", "session", (error, value) => {
  console.log("session is", value);
});`;

/** The help window's section on pm.cookies and the cookie jar. */
export function renderCookiesGuide(): TemplateResult {
  return html`<section>
    <h3>Cookies</h3>
    <p>
      <code>pm.cookies</code> holds the cookies of the workspace's jar that go with this request: matched to
      its URL by domain, path and <code>Secure</code>, exactly as when they are sent.
    </p>
    ${renderNotes()} ${renderJarMethods()} ${renderExamples()}
  </section>`;
}

function renderNotes(): TemplateResult {
  return html`<ul class="notes">
    <li>
      <strong>Pre-request:</strong> the cookies for the request's URL, with its <code>{{variables}}</code>
      filled in.
    </li>
    <li>
      <strong>Post-response:</strong> the cookies for the response's final URL (after redirects), including
      those its <code>Set-Cookie</code> headers just set.
    </li>
    <li>
      <code>pm.cookies.jar()</code> reads and changes the jar for any URL. Changes are saved to the jar when
      the script ends (later reads in the same script already see them) and are listed in the Cookies window.
    </li>
    <li>
      Each jar method takes an optional callback <code>(error, result)</code> and also returns a promise, so
      <code>await</code> works too. A URL without <code>http://</code> or <code>https://</code> is read as
      <code>http://</code>.
    </li>
  </ul>`;
}

function renderJarMethods(): TemplateResult {
  return html`<dl>
    <dt><code>jar.get(url, name)</code></dt>
    <dd>The value of the cookie named <code>name</code> sent to <code>url</code>, or undefined.</dd>
    <dt><code>jar.getAll(url)</code></dt>
    <dd>Every cookie sent to <code>url</code>: name, value, domain, path, expires, secure, httpOnly.</dd>
    <dt><code>jar.set(url, name, value)</code> or <code>jar.set(url, { name, value, … })</code></dt>
    <dd>
      Adds or replaces a cookie for <code>url</code>'s host. Options: <code>path</code> (default
      <code>/</code>), <code>domain</code> (to share it with subdomains; must cover the URL's host),
      <code>expires</code>, <code>secure</code>, <code>httpOnly</code>.
    </dd>
    <dt><code>jar.unset(url, name)</code></dt>
    <dd>Removes the cookies named <code>name</code> that would be sent to <code>url</code>.</dd>
    <dt><code>jar.clear(url)</code></dt>
    <dd>Removes every cookie that would be sent to <code>url</code>.</dd>
  </dl>`;
}

function renderExamples(): TemplateResult {
  return html`<p class="example-title">Read a cookie the response set</p>
    <pre>${READ_A_COOKIE}</pre>
    <p class="example-title">Change the jar</p>
    <pre>${USE_THE_JAR}</pre>
    <p class="example-title">With callbacks</p>
    <pre>${WITH_CALLBACKS}</pre>`;
}
