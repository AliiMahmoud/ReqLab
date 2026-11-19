import type { z } from "zod";
import { DatabaseCorrupted } from "../../errors";

/** Reads a JSON column through its schema: a tampered file yields an error, never unchecked data. */
export function readJsonColumn<T extends z.ZodType>(schema: T, text: unknown): z.output<T> {
  if (typeof text !== "string") throw new DatabaseCorrupted();
  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw new DatabaseCorrupted();
  }
}
