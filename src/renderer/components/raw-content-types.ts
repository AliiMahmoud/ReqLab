import type { CodeLanguage } from "./code-area";
import type { SelectOption } from "./ui-select";

/** The Content-Type choices for a raw body, and how each is edited and beautified. */
const RAW_CONTENT_TYPES: { value: string; label: string; language: CodeLanguage }[] = [
  { value: "text/plain", label: "Text", language: "text" },
  { value: "application/json", label: "JSON", language: "json" },
  { value: "application/xml", label: "XML", language: "xml" },
  { value: "text/xml", label: "XML (text/xml)", language: "xml" },
  { value: "text/html", label: "HTML", language: "xml" },
  { value: "application/javascript", label: "JavaScript", language: "text" },
  { value: "text/css", label: "CSS", language: "text" },
  { value: "text/csv", label: "CSV", language: "text" },
  { value: "application/yaml", label: "YAML", language: "text" },
];

/** The list, plus the current type when it is not one of ours (e.g. from an import). */
export function rawContentTypeOptions(current: string): SelectOption[] {
  const options = RAW_CONTENT_TYPES.map(({ value, label }) => ({ value, label: `${label}  ·  ${value}` }));
  const isKnown = RAW_CONTENT_TYPES.some((type) => type.value === current);
  return isKnown || current.trim() === "" ? options : [...options, { value: current, label: current }];
}

/** Editor language for a content type: JSON and XML-like types get colours and folding. */
export function languageForContentType(contentType: string): CodeLanguage {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const known = RAW_CONTENT_TYPES.find((entry) => entry.value === type);
  if (known !== undefined) return known.language;
  if (/[/+]json$/.test(type)) return "json";
  return /[/+]xml$/.test(type) ? "xml" : "text";
}
