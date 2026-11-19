const MAX_SHOWN_LENGTH = 60;

/** A name short enough for a dialog title: long ones end with "…" (names can be 200 characters). */
export function shortName(name: string): string {
  return name.length <= MAX_SHOWN_LENGTH ? name : `${name.slice(0, MAX_SHOWN_LENGTH - 1).trimEnd()}…`;
}
