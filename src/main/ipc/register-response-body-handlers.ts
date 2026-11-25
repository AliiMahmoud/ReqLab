import { writeFile } from "node:fs/promises";
import { showSaveDialog } from "../files/save-dialog";
import { responseFileName } from "../http/response-file-name";
import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";

/**
 * The response's Copy and Download: the body exactly as received, which main keeps for the last few
 * responses. A body holding a secret variable's value goes through the clipboard that clears itself.
 */
export function registerResponseBodyHandlers(router: IpcRouter, services: IpcServices): void {
  const { sender, clipboard } = services;
  registerShownBodyHandlers(router, services);
  router.handle("http:copy-body", async ({ requestId }) => {
    const body = sender.getBody(requestId);
    if (body === undefined) return { result: "gone" as const };
    const text = body.bytes.toString("utf8");
    if (isBinary(text)) return { result: "binary" as const };
    await (body.containsSecret ? clipboard.copySecret(text) : clipboard.copyText(text));
    return { result: body.containsSecret ? ("copied-secret" as const) : ("copied" as const) };
  });
  router.handle("http:save-body", async ({ requestId, requestName }) => {
    const body = sender.getBody(requestId);
    if (body === undefined) return { result: "gone" as const, containsSecret: false };
    // Any file type: the name typed in the dialog is kept exactly, nothing is appended to it.
    const name = responseFileName(requestName, body.contentType);
    const path = await showSaveDialog("Save response", name, { name: "All files", extensions: ["*"] });
    if (path === undefined) return { result: "cancelled" as const, containsSecret: false };
    await writeFile(path, body.bytes);
    return { result: "saved" as const, containsSecret: body.containsSecret };
  });
}

/** The fallback for a response main no longer keeps: the view's text (masked) or image bytes. */
function registerShownBodyHandlers(router: IpcRouter, { clipboard }: IpcServices): void {
  router.handle("http:copy-shown-body", async ({ text }) => {
    await clipboard.copyText(text);
    return true as const;
  });
  router.handle("http:save-shown-body", async ({ requestName, contentType, text, base64 }) => {
    const name = responseFileName(requestName, contentType);
    const path = await showSaveDialog("Save response", name, { name: "All files", extensions: ["*"] });
    if (path === undefined) return { result: "cancelled" as const };
    await writeFile(path, base64 === undefined ? (text ?? "") : Buffer.from(base64, "base64"));
    return { result: "saved" as const };
  });
}

/** What decoding puts in place of bytes that are not valid UTF-8. */
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);
const NUL = String.fromCharCode(0);

/** Not text: a NUL byte, or bytes that are not valid UTF-8. */
function isBinary(text: string): boolean {
  return text.includes(NUL) || text.includes(REPLACEMENT_CHARACTER);
}
