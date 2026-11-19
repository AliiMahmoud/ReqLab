import { parseCurl } from "../interop/curl/curl-to-request";
import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";

export function registerInteropHandlers(router: IpcRouter, { interop }: IpcServices): void {
  router.handle("import:choose-files", () => interop.chooseImportFiles());
  router.handle("import:run", (input) => interop.runImport(input));
  router.handle("export:workspace", (input) => interop.exportWorkspace(input));
  router.handle("import:into-workspace", (input) => interop.importIntoWorkspace(input));
  router.handle("export:collection", (input) => interop.exportCollection(input));
  router.handle("export:selection", (input) => interop.exportSelection(input));
  router.handle("import:parse-curl", ({ text }) => {
    const parsed = parseCurl(text);
    return { ...parsed, warnings: parsed.warnings.slice(0, 200) };
  });
}
