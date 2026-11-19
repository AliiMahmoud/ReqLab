/**
 * pm.expect: a chai-style subset (to / be / have / not / deep … equal, eql, include, property,
 * lengthOf, a, above, below, match, oneOf, keys, ok, true, false, null, undefined, exist, empty),
 * as JavaScript for the QuickJS sandbox.
 */
export const EXPECT_SOURCE = String.raw`
const __show = (value) => { try { return typeof value === "string" ? "'" + value + "'" : JSON.stringify(value) ?? String(value); } catch (error) { return String(value); } };
const __typeOf = (value) => (value === null ? "null" : Array.isArray(value) ? "array" : typeof value);
function __deepEqual(left, right) {
  if (left === right) return true;
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) return Number.isNaN(left) && Number.isNaN(right);
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => __deepEqual(left[key], right[key]));
}

class __Assertion {
  constructor(subject) { this.subject = subject; this.negated = false; this.__deep = false; }
  check(passed, message, negatedMessage) {
    if (passed === this.negated) __fail("pm.expect(" + __show(this.subject).slice(0, 60) + ")", this.negated ? negatedMessage : message);
    return this;
  }
  get not() { this.negated = !this.negated; return this; }
  get ok() { return this.check(Boolean(this.subject), "expected " + __show(this.subject) + " to be truthy", "expected " + __show(this.subject) + " to be falsy"); }
  get true() { return this.check(this.subject === true, "expected " + __show(this.subject) + " to be true", "expected value not to be true"); }
  get false() { return this.check(this.subject === false, "expected " + __show(this.subject) + " to be false", "expected value not to be false"); }
  get null() { return this.check(this.subject === null, "expected " + __show(this.subject) + " to be null", "expected value not to be null"); }
  get undefined() { return this.check(this.subject === undefined, "expected " + __show(this.subject) + " to be undefined", "expected value not to be undefined"); }
  get exist() { return this.check(this.subject !== null && this.subject !== undefined, "expected value to exist", "expected " + __show(this.subject) + " not to exist"); }
  get empty() {
    const size = typeof this.subject === "string" || Array.isArray(this.subject) ? this.subject.length : Object.keys(this.subject ?? {}).length;
    return this.check(size === 0, "expected " + __show(this.subject) + " to be empty", "expected " + __show(this.subject) + " not to be empty");
  }
  equal(expected) {
    const passed = this.__deep ? __deepEqual(this.subject, expected) : this.subject === expected;
    return this.check(passed, "expected " + __show(this.subject) + " to equal " + __show(expected), "expected " + __show(this.subject) + " not to equal " + __show(expected));
  }
  eql(expected) { this.__deep = true; return this.equal(expected); }
  above(limit) { return this.check(this.subject > limit, "expected " + __show(this.subject) + " to be above " + limit, "expected " + __show(this.subject) + " to be at most " + limit); }
  below(limit) { return this.check(this.subject < limit, "expected " + __show(this.subject) + " to be below " + limit, "expected " + __show(this.subject) + " to be at least " + limit); }
  least(limit) { return this.check(this.subject >= limit, "expected " + __show(this.subject) + " to be at least " + limit, "expected " + __show(this.subject) + " to be below " + limit); }
  most(limit) { return this.check(this.subject <= limit, "expected " + __show(this.subject) + " to be at most " + limit, "expected " + __show(this.subject) + " to be above " + limit); }
  within(low, high) { return this.check(this.subject >= low && this.subject <= high, "expected " + __show(this.subject) + " to be within " + low + ".." + high, "expected " + __show(this.subject) + " not to be within " + low + ".." + high); }
  a(type) { const actual = __typeOf(this.subject); return this.check(actual === String(type).toLowerCase(), "expected " + __show(this.subject) + " to be a " + type + " but it is a " + actual, "expected " + __show(this.subject) + " not to be a " + type); }
  include(item) {
    const subject = this.subject;
    let passed;
    if (typeof subject === "string") passed = subject.includes(item);
    else if (Array.isArray(subject)) passed = subject.some((entry) => (this.__deep || typeof item === "object" ? __deepEqual(entry, item) : entry === item));
    else passed = typeof item === "object" && item !== null && Object.keys(item).every((key) => __deepEqual(subject?.[key], item[key]));
    return this.check(passed, "expected " + __show(subject) + " to include " + __show(item), "expected " + __show(subject) + " not to include " + __show(item));
  }
  property(name, value) {
    const has = this.subject !== null && this.subject !== undefined && Object.prototype.hasOwnProperty.call(Object(this.subject), name);
    this.check(has, "expected " + __show(this.subject) + " to have property '" + name + "'", "expected " + __show(this.subject) + " not to have property '" + name + "'");
    if (arguments.length > 1 && !this.negated) {
      const actual = this.subject[name];
      if (!(this.__deep ? __deepEqual(actual, value) : actual === value)) throw new Error("expected property '" + name + "' to be " + __show(value) + " but got " + __show(actual));
    }
    if (has && !this.negated) this.subject = this.subject[name];
    return this;
  }
  lengthOf(size) { const actual = this.subject?.length; return this.check(actual === size, "expected " + __show(this.subject) + " to have length " + size + " but got " + actual, "expected length not to be " + size); }
  match(pattern) { return this.check(pattern.test(String(this.subject)), "expected " + __show(this.subject) + " to match " + pattern, "expected " + __show(this.subject) + " not to match " + pattern); }
  oneOf(list) { return this.check(list.includes(this.subject), "expected " + __show(this.subject) + " to be one of " + __show(list), "expected " + __show(this.subject) + " not to be one of " + __show(list)); }
  keys(...names) {
    const wanted = names.length === 1 && Array.isArray(names[0]) ? names[0] : names;
    const actual = Object.keys(this.subject ?? {});
    return this.check(wanted.every((name) => actual.includes(name)), "expected " + __show(this.subject) + " to have keys " + __show(wanted), "expected " + __show(this.subject) + " not to have keys " + __show(wanted));
  }
}
for (const word of ["to", "be", "been", "is", "that", "which", "and", "has", "have", "with", "at", "of", "same", "does", "also"]) {
  Object.defineProperty(__Assertion.prototype, word, { get() { return this; } });
}
Object.defineProperty(__Assertion.prototype, "deep", { get() { this.__deep = true; return this; } });
const __proto = __Assertion.prototype;
for (const [alias, name] of [["equals", "equal"], ["eq", "equal"], ["eqls", "eql"], ["gt", "above"], ["greaterThan", "above"], ["lt", "below"], ["lessThan", "below"], ["gte", "least"], ["lte", "most"], ["contain", "include"], ["contains", "include"], ["includes", "include"], ["key", "keys"], ["length", "lengthOf"]]) {
  if (!(alias in __proto)) Object.defineProperty(__proto, alias, { value: __proto[name], writable: true });
}
Object.defineProperty(__proto, "an", { value: __proto.a, writable: true });
`;
