/**
 * The pm.* API, as JavaScript that runs inside the QuickJS sandbox (never in Node). It reads the
 * plain-data input (`__input`, a JSON string) and writes everything the host needs into `__output`.
 * No host function is exposed: only data goes in and out.
 */
export const PM_API_SOURCE = String.raw`
"use strict";
const __in = JSON.parse(__input);
const __output = { scopes: {}, local: {}, request: null, tests: [], logs: [], errors: [] };
/**
 * A failed check inside pm.test fails that test (it throws). Outside a test it is recorded as a
 * failed test of its own and the script goes on, so one check does not skip the rest of the script.
 */
let __testDepth = 0;
const __fail = (label, message) => {
  if (__testDepth > 0) throw new Error(message);
  if (__output.tests.length < 1000) __output.tests.push({ name: label, passed: false, error: message });
};
const __text = (value) => (typeof value === "string" ? value : JSON.stringify(value) ?? String(value));

function __scope(name, rows, canWrite) {
  const list = rows.map((row) => ({ ...row }));
  const find = (key) => list.find((row) => row.key === key);
  const changed = () => { __output.scopes[name] = list; };
  const refuse = () => { throw new Error("No " + name + " is selected, so it cannot be changed."); };
  return {
    get: (key) => { const row = find(key); return row && row.isEnabled ? row.value : undefined; },
    has: (key) => Boolean(find(key)),
    set: (key, value) => {
      if (!canWrite) refuse();
      const row = find(String(key));
      if (row) { row.value = __text(value); row.isEnabled = true; }
      else list.push({ key: String(key), value: __text(value), isEnabled: true });
      changed();
    },
    unset: (key) => { if (!canWrite) refuse(); const index = list.findIndex((row) => row.key === key); if (index >= 0) { list.splice(index, 1); changed(); } },
    clear: () => { if (!canWrite) refuse(); list.length = 0; changed(); },
    toObject: () => Object.fromEntries(list.filter((row) => row.isEnabled).map((row) => [row.key, row.value])),
    /** After pm.execution.runRequest: the values as they are now (the other request may have set some). */
    __reload: (rows) => { if (Array.isArray(rows)) { list.length = 0; list.push(...rows.map((row) => ({ ...row }))); } },
  };
}

const __environment = __scope("environment", __in.scopes.environment ?? [], __in.scopes.environment !== null);
const __collection = __scope("collection", __in.scopes.collection ?? [], __in.scopes.collection !== null);
const __globals = __scope("globals", __in.scopes.globals ?? [], true);
const __local = __output.local;
Object.assign(__local, __in.local ?? {});

const __lookUp = (key) => {
  if (Object.prototype.hasOwnProperty.call(__local, key)) return __local[key];
  for (const scope of [__environment, __collection, __globals]) { const value = scope.get(key); if (value !== undefined) return value; }
  return undefined;
};

function __headerList(rows, canWrite) {
  const find = (key) => rows.findIndex((row) => row.key.toLowerCase() === String(key).toLowerCase());
  const toRow = (header, value) => {
    if (typeof header === "string" && value === undefined) { const at = header.indexOf(":"); return { key: header.slice(0, at).trim(), value: header.slice(at + 1).trim(), isEnabled: true }; }
    if (typeof header === "string") return { key: header, value: __text(value), isEnabled: true };
    return { key: String(header.key), value: __text(header.value), isEnabled: header.disabled !== true };
  };
  const guard = () => { if (!canWrite) throw new Error("The response headers cannot be changed."); };
  return {
    get: (key) => { const index = find(key); return index >= 0 ? rows[index].value : undefined; },
    has: (key) => find(key) >= 0,
    add: (header, value) => { guard(); rows.push(toRow(header, value)); },
    upsert: (header, value) => { guard(); const row = toRow(header, value); const index = find(row.key); if (index >= 0) rows[index] = row; else rows.push(row); },
    remove: (key) => { guard(); const index = find(key); if (index >= 0) rows.splice(index, 1); },
    toObject: () => Object.fromEntries(rows.filter((row) => row.isEnabled !== false).map((row) => [row.key, row.value])),
    all: () => rows.map((row) => ({ key: row.key, value: row.value })),
  };
}

function __request(definition, canWrite) {
  if (canWrite) __output.request = definition;
  const url = () => ({ toString: () => definition.url, raw: definition.url });
  const body = {
    get mode() { return definition.body.type; },
    get raw() { return definition.body.text ?? ""; },
    set raw(text) { if (!canWrite) throw new Error("The request cannot be changed after it was sent."); if ("text" in definition.body) definition.body.text = __text(text); },
  };
  const request = { headers: __headerList(definition.headers, canWrite), body };
  Object.defineProperty(request, "url", { get: url, set: (value) => { if (!canWrite) throw new Error("The request cannot be changed after it was sent."); definition.url = String(value); }, enumerable: true });
  Object.defineProperty(request, "method", { get: () => definition.method, set: (value) => { if (canWrite) definition.method = String(value).toUpperCase(); }, enumerable: true });
  return request;
}

function __response(response) {
  if (response === null) return undefined;
  const assert = (passed, message, label) => { if (!passed) __fail(label, message); };
  const have = {
    status: (expected) => typeof expected === "number"
      ? assert(response.code === expected, "expected response to have status code " + expected + " but got " + response.code, "pm.response.to.have.status(" + expected + ")")
      : assert(response.status === expected, "expected response to have status reason '" + expected + "' but got '" + response.status + "'", "pm.response.to.have.status('" + expected + "')"),
    header: (key, value) => {
      const actual = __headerList(response.headers, false).get(key);
      assert(actual !== undefined, "expected response to have header " + key, "pm.response.to.have.header(" + key + ")");
      if (value !== undefined) assert(actual === value, "expected header " + key + " to be '" + value + "' but got '" + actual + "'", "pm.response.to.have.header(" + key + ")");
    },
    jsonBody: () => { try { JSON.parse(response.body); } catch (error) { assert(false, "expected response body to be valid JSON", "pm.response.to.have.jsonBody()"); } },
  };
  return {
    code: response.code,
    status: response.status,
    responseTime: response.responseTime,
    responseSize: response.size,
    headers: __headerList(response.headers, false),
    text: () => response.body,
    json: () => JSON.parse(response.body),
    to: {
      have: have,
      be: {
        get ok() { assert(response.code >= 200 && response.code < 300, "expected response to be 2xx but got " + response.code, "pm.response.to.be.ok"); return true; },
        get success() { return this.ok; },
        get clientError() { assert(response.code >= 400 && response.code < 500, "expected a 4xx response but got " + response.code, "pm.response.to.be.clientError"); return true; },
        get serverError() { assert(response.code >= 500, "expected a 5xx response but got " + response.code, "pm.response.to.be.serverError"); return true; },
      },
    },
  };
}
`;
