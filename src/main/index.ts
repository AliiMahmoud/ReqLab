import { app } from "electron";
import { startApplication } from "./app";
import { createLogger } from "./logging/logger";

const log = createLogger("startup");

startApplication().catch((error: unknown) => {
  log.error("ReqLab failed to start", error);
  app.exit(1);
});
