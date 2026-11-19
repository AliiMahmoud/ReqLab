import type { ReqLabApi } from "@shared/api";

declare global {
  interface Window {
    readonly reqlab: ReqLabApi;
  }
}

/** The typed bridge exposed by preload. The only way the UI reaches the main process. */
export const api: ReqLabApi = window.reqlab;
