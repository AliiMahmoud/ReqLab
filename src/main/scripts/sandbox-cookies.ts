/**
 * pm.cookies and pm.cookies.jar(), as JavaScript that runs inside the QuickJS sandbox. The jar's
 * cookies come in as plain data (`__in.cookies`); reads match them to a URL with the same rules
 * as sending (domain, path, Secure). Changes apply to this copy at once (later reads see them) and
 * are listed in `__output.cookieChanges`, which the host checks and saves when the scripts end.
 */
export const PM_COOKIES_SOURCE = String.raw`
const __cookieJar = (__in.cookies ?? []).map((cookie) => ({ ...cookie }));
__output.cookieChanges = [];

/** QuickJS has no URL class: "http(s)://host[:port]/path" is enough to match cookies. */
const __cookieTarget = (url) => {
  const text = String(url ?? "").trim();
  const full = /^[a-z]+:\/\//i.test(text) ? text : "http://" + text;
  // A host name (letters, digits, dots, hyphens) or a [v6] address, then a port, a path or the end.
  const match = /^(https?):\/\/([a-z0-9.-]+|\[[0-9a-f:.]+\])(?::\d+)?(\/[^?#]*)?(?:[?#].*)?$/i.exec(full);
  if (match === null) return undefined;
  return { host: match[2].toLowerCase(), path: match[3] || "/", isSecure: match[1].toLowerCase() === "https" };
};
const __cookieMatches = (cookie, target) => {
  const domain = target.host === cookie.domain || (!cookie.hostOnly && target.host.endsWith("." + cookie.domain));
  const path = target.path === cookie.path
    || (target.path.startsWith(cookie.path) && (cookie.path.endsWith("/") || target.path[cookie.path.length] === "/"));
  return domain && path && (!cookie.secure || target.isSecure);
};
/** The cookies a request to url would send, longest path first. */
const __cookiesFor = (url) => {
  const target = __cookieTarget(url);
  if (target === undefined) return [];
  return __cookieJar.filter((cookie) => __cookieMatches(cookie, target)).sort((a, b) => b.path.length - a.path.length);
};
const __cookieView = (cookie) => ({
  name: cookie.name, value: cookie.value, domain: cookie.domain, path: cookie.path,
  expires: cookie.expires, secure: cookie.secure, httpOnly: cookie.httpOnly, hostOnly: cookie.hostOnly,
});
const __removeCookie = (cookie) => {
  const index = __cookieJar.findIndex((each) => each.domain === cookie.domain && each.path === cookie.path && each.name === cookie.name);
  if (index >= 0) __cookieJar.splice(index, 1);
  __output.cookieChanges.push({ action: "delete", cookie: { domain: cookie.domain, path: cookie.path, name: cookie.name } });
};

/** Like Postman's jar: a callback (error, result) if given, and a promise either way. */
const __answer = (callback, value) => { if (typeof callback === "function") callback(null, value); return Promise.resolve(value); };
const __refuse = (callback, message) => {
  const error = new Error(message);
  if (typeof callback === "function") { callback(error); return Promise.resolve(undefined); }
  return Promise.reject(error);
};

const __newCookie = (target, spec) => {
  const domain = spec.domain ? String(spec.domain).replace(/^\./, "").toLowerCase() : target.host;
  if (spec.domain && target.host !== domain && !target.host.endsWith("." + domain)) return "The cookie's domain " + domain + " does not cover " + target.host + ".";
  const expires = spec.expires === undefined || spec.expires === null ? null : new Date(spec.expires);
  if (expires !== null && isNaN(expires.getTime())) return "The cookie's expires is not a valid date.";
  return {
    name: String(spec.name), value: __text(spec.value ?? ""), domain, path: spec.path ? String(spec.path) : "/",
    expires: expires === null ? null : expires.toISOString(),
    secure: spec.secure === true, httpOnly: spec.httpOnly === true, hostOnly: !spec.domain,
  };
};

const __jar = {
  get: (url, name, callback) => __answer(callback, __cookiesFor(url).find((cookie) => cookie.name === name)?.value),
  getAll: (url, callback) => __answer(callback, __cookiesFor(url).map(__cookieView)),
  /** set(url, name, value, callback) or set(url, { name, value, path, domain, expires, secure, httpOnly }, callback) */
  set: (url, nameOrCookie, valueOrCallback, maybeCallback) => {
    const isObject = typeof nameOrCookie === "object" && nameOrCookie !== null;
    const spec = isObject ? nameOrCookie : { name: nameOrCookie, value: valueOrCallback };
    const callback = isObject ? valueOrCallback : maybeCallback;
    const target = __cookieTarget(url);
    if (target === undefined) return __refuse(callback, "Not an http(s) URL: " + url);
    if (!spec.name) return __refuse(callback, "A cookie needs a name.");
    const cookie = __newCookie(target, spec);
    if (typeof cookie === "string") return __refuse(callback, cookie);
    const index = __cookieJar.findIndex((each) => each.domain === cookie.domain && each.path === cookie.path && each.name === cookie.name);
    if (index >= 0) __cookieJar.splice(index, 1);
    __cookieJar.push(cookie);
    __output.cookieChanges.push({ action: "set", cookie });
    return __answer(callback, __cookieView(cookie));
  },
  unset: (url, name, callback) => {
    for (const cookie of __cookiesFor(url).filter((each) => each.name === name)) __removeCookie(cookie);
    return __answer(callback, undefined);
  },
  clear: (url, callback) => {
    for (const cookie of __cookiesFor(url)) __removeCookie(cookie);
    return __answer(callback, undefined);
  },
};

/** pm.cookies: the cookies for the request's URL (after the response: its final URL, with cookies it set). */
function __cookieList(currentUrl) {
  const list = () => __cookiesFor(currentUrl());
  return {
    get: (name) => list().find((cookie) => cookie.name === name)?.value,
    has: (name, value) => list().some((cookie) => cookie.name === name && (value === undefined || cookie.value === value)),
    one: (name) => { const cookie = list().find((each) => each.name === name); return cookie ? __cookieView(cookie) : undefined; },
    all: () => list().map(__cookieView),
    count: () => list().length,
    // Longest path first wins, as when sending.
    toObject: () => Object.fromEntries(list().reverse().map((cookie) => [cookie.name, cookie.value])),
    jar: () => __jar,
  };
}
`;
