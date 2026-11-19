import { z } from "zod";

/** Settings › General › Data folder: where ReqLab keeps its data. */
export const DataLocation = z.object({
  path: z.string(),
  /** The operating system's usual place for app data. */
  isStandard: z.boolean(),
  /** Portable mode: the data stays next to the app and cannot be moved here. */
  isPortable: z.boolean(),
  /** The last move or start-up problem, if any. */
  error: z.string().nullable(),
});
export type DataLocation = z.infer<typeof DataLocation>;

export const ChosenDataFolder = z.object({ token: z.uuid(), path: z.string() });
export const MoveDataInput = z.object({ token: z.uuid() });
