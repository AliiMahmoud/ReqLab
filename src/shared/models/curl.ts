import { z } from "zod";
import { RequestDefinition } from "./request";

/** 1 MB is far beyond any real command; it keeps a huge paste from tying up main. */
export const ParseCurlInput = z.object({ text: z.string().min(1).max(1_000_000) });

export const ParsedCurl = z.object({
  definition: RequestDefinition,
  warnings: z.array(z.string()).max(200),
});
export type ParsedCurl = z.infer<typeof ParsedCurl>;
