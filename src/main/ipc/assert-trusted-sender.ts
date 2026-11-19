import type { IpcMainInvokeEvent } from "electron";
import { UntrustedSender } from "../errors";
import { isTrustedRendererUrl } from "../security/app-origin";

/** Only the top frame of ReqLab's own UI may call main. Never an iframe (e.g. an HTML response preview). */
export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  const isTrusted = frame !== null && frame.parent === null && isTrustedRendererUrl(frame.url);
  if (!isTrusted) throw new UntrustedSender();
}
