/** File extensions for common response types. */
const EXTENSIONS: [RegExp, string][] = [
  [/json/i, "json"],
  [/xml/i, "xml"],
  [/html/i, "html"],
  [/javascript/i, "js"],
  [/css/i, "css"],
  [/csv/i, "csv"],
  [/^image\/png/i, "png"],
  [/^image\/jpe?g/i, "jpg"],
  [/^image\/gif/i, "gif"],
  [/^image\/webp/i, "webp"],
  [/^image\/svg/i, "svg"],
  [/pdf/i, "pdf"],
  [/zip/i, "zip"],
];

/**
 * The name a response is saved under: the request's name with the extension for the response's
 * type ("Get users" + JSON → "Get users.json"); nothing is added for types without one.
 */
export function responseFileName(requestName: string, contentType: string): string {
  const name =
    requestName
      .replace(/[\\/:*?"<>|]+/g, "_")
      .trim()
      .slice(0, 120) || "response";
  const extension = EXTENSIONS.find(([pattern]) => pattern.test(contentType))?.[1];
  if (extension === undefined || name.toLowerCase().endsWith(`.${extension}`)) return name;
  return `${name}.${extension}`;
}
