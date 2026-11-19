import { z } from "zod";

export const ScriptPhase = z.enum(["prerequest", "test"]);

/** What scripts reported for one send: pm.test results, console output and script errors. */
export const ScriptReport = z.object({
  tests: z
    .array(
      z.object({
        name: z.string().max(500),
        passed: z.boolean(),
        skipped: z.boolean().optional(),
        error: z.string().max(2_000).optional(),
      }),
    )
    .max(1_000),
  logs: z
    .array(
      z.object({
        phase: ScriptPhase,
        level: z.enum(["log", "info", "warn", "error"]),
        text: z.string().max(4_000),
      }),
    )
    .max(1_000),
  errors: z
    .array(z.object({ phase: ScriptPhase, source: z.string().max(300), message: z.string().max(2_000) }))
    .max(100),
});
export type ScriptReport = z.infer<typeof ScriptReport>;
