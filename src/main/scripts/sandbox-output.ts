import { z } from "zod";
import { MAX_NAME_LENGTH, MAX_VALUE_LENGTH } from "@shared/limits";

const Row = z.object({
  key: z.string().max(MAX_NAME_LENGTH),
  value: z.string().max(MAX_VALUE_LENGTH),
  isEnabled: z.boolean(),
});

/** What the sandbox hands back. It ran untrusted code, so every field is checked and capped. */
export const SandboxOutput = z.object({
  scopes: z.object({
    environment: z.array(Row).max(5_000).optional(),
    collection: z.array(Row).max(5_000).optional(),
    globals: z.array(Row).max(5_000).optional(),
  }),
  local: z.record(z.string().max(MAX_NAME_LENGTH), z.string().max(MAX_VALUE_LENGTH)),
  /** The request as a pre-request script left it (checked again as a RequestDefinition). */
  request: z.unknown(),
  tests: z
    .array(
      z.object({
        name: z.string().transform((text) => text.slice(0, 500)),
        passed: z.boolean(),
        skipped: z.boolean().optional(),
        error: z
          .string()
          .transform((text) => text.slice(0, 2_000))
          .optional(),
      }),
    )
    .max(1_000),
  logs: z
    .array(z.object({ level: z.enum(["log", "info", "warn", "error"]), text: z.string().max(4_000) }))
    .max(1_000),
  errors: z
    .array(
      z.object({
        source: z.string().max(300),
        message: z.string().transform((text) => text.slice(0, 2_000)),
      }),
    )
    .max(100),
});
export type SandboxOutput = z.infer<typeof SandboxOutput>;
