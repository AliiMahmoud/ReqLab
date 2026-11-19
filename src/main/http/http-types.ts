import type { Timings } from "@shared/models/http-exchange";

export type HeaderList = [name: string, value: string][];

/** A request ready for the network: variables resolved, body encoded, defaults added. */
export interface PreparedRequest {
  method: string;
  url: URL;
  headers: HeaderList;
  body: Buffer | undefined;
}

/** One HTTP exchange, before redirects are considered. */
export interface RawResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: HeaderList;
  body: Buffer;
  timings: Timings;
}

/** The answer after following redirects. */
export interface FinalResponse extends RawResponse {
  url: URL;
  redirectCount: number;
}

export function findHeader(headers: HeaderList, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  return headers.find(([key]) => key.toLowerCase() === lowerName)?.[1];
}

export function withoutHeaders(headers: HeaderList, names: readonly string[]): HeaderList {
  const lowerNames = new Set(names.map((name) => name.toLowerCase()));
  return headers.filter(([key]) => !lowerNames.has(key.toLowerCase()));
}
