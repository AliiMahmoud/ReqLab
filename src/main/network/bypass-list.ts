/**
 * The custom proxy's exceptions, written as in Windows' proxy settings: entries separated by ";"
 * (or "," / spaces). An address that starts with an entry goes direct:
 * - "intranet", "10.*", "192.168.1.5": the address starts with it ("*" is a wildcard);
 * - "*.corp.com" or ".corp.com": corp.com and every subdomain;
 * - "<local>": names without a dot, such as "myserver".
 */
export function isBypassed(host: string, list: string): boolean {
  const name = host.toLowerCase().replace(/^\[|\]$/g, "");
  return list
    .split(/[\s,;]+/)
    .map((entry) => entry.toLowerCase().replace(/^[a-z]+:\/\//, ""))
    .filter((entry) => entry !== "")
    .some((entry) => matchesEntry(name, entry));
}

function matchesEntry(name: string, entry: string): boolean {
  if (entry === "<local>") return !name.includes(".");
  const domain = /^\*?\.(.+)$/.exec(entry)?.[1];
  if (domain !== undefined && !domain.includes("*") && name === domain) return true;
  return startsWithPattern(name, entry.startsWith(".") ? `*${entry}` : entry);
}

function startsWithPattern(name: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}`).test(name);
}
