import type { HeaderList } from "./http-types";

/** Headers ReqLab adds when the request does not set them itself. */
export const DEFAULT_HEADERS: HeaderList = [["User-Agent", "ReqLab/0.1"]];

/** A header ReqLab added by itself (same name and value as its default), not one the user wrote. */
export function isDefaultHeader(name: string, value: string): boolean {
  return DEFAULT_HEADERS.some(
    ([defaultName, defaultValue]) =>
      defaultName.toLowerCase() === name.toLowerCase() && defaultValue === value,
  );
}
