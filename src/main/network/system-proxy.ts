import { session } from "electron";

/**
 * The computer's proxy for a URL, as Electron resolves it from the system settings (including PAC
 * files). Only plain HTTP proxies ("PROXY host:port") are supported; anything else goes direct.
 */
export async function findSystemProxy(target: URL): Promise<URL | undefined> {
  const firstRule = (await session.defaultSession.resolveProxy(target.href)).split(";")[0] ?? "";
  const match = /^PROXY\s+(\S+)$/i.exec(firstRule.trim());
  if (match === null) return undefined;
  try {
    return new URL(`http://${match[1] ?? ""}`);
  } catch {
    return undefined;
  }
}
