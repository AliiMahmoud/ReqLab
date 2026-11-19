/** Builds the pm object, tests and console from the pieces in the other sandbox sources. */
export const PM_OBJECT_SOURCE = String.raw`
const __log = (level) => (...parts) => { if (__output.logs.length < 500) __output.logs.push({ level, text: parts.map(__text).join(" ").slice(0, 4000) }); };
const console = { log: __log("log"), info: __log("info"), warn: __log("warn"), error: __log("error"), debug: __log("log") };

const pm = {
  info: { eventName: __in.event, requestName: __in.requestName, iteration: 0, iterationCount: 1 },
  environment: Object.assign(__environment, { name: __in.environmentName ?? "" }),
  collectionVariables: __collection,
  globals: __globals,
  variables: {
    get: (key) => __lookUp(key),
    has: (key) => __lookUp(key) !== undefined,
    set: (key, value) => { __local[String(key)] = __text(value); },
    unset: (key) => { delete __local[key]; },
    toObject: () => ({ ...__globals.toObject(), ...__collection.toObject(), ...__environment.toObject(), ...__local }),
    replaceIn: (template) => String(template).replace(/\{\{([^{}]+)\}\}/g, (whole, name) => __lookUp(name.trim()) ?? whole),
  },
  request: __request(__in.request, __in.event === "prerequest"),
  response: __response(__in.response),
  expect: (subject) => new __Assertion(subject),
  test: (name, check) => {
    if (__output.tests.length >= 1000) return;
    __testDepth += 1;
    try { check(); __output.tests.push({ name: String(name), passed: true }); }
    catch (error) { __output.tests.push({ name: String(name), passed: false, error: String(error && error.message ? error.message : error) }); }
    finally { __testDepth -= 1; }
  },
  sendRequest: () => { throw new Error("pm.sendRequest is not supported: scripts cannot reach the network."); },
  execution: {
    /** Runs a saved request of this workspace (with its auth and scripts) and resolves with its response. */
    runRequest: async (requestId) => {
      // Changes made so far are saved first (the other request sees them), and its own come back.
      const reply = JSON.parse(await __runRequest(String(requestId), JSON.stringify(__output.scopes)));
      __environment.__reload(reply.scopes.environment);
      __collection.__reload(reply.scopes.collection);
      __globals.__reload(reply.scopes.globals);
      return __response(reply.response);
    },
  },
};
pm.test.skip = (name) => { __output.tests.push({ name: String(name), passed: true, skipped: true }); };
const postman = { setEnvironmentVariable: (key, value) => pm.environment.set(key, value), getEnvironmentVariable: (key) => pm.environment.get(key) };
`;
