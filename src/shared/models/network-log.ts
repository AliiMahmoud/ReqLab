import { z } from "zod";
import { CancelRequestInput, Timings } from "./http-exchange";

/** Header values as sent or received; a name sent twice has a list. Credentials are "[redacted]". */
const LoggedHeaders = z.record(z.string(), z.union([z.string(), z.array(z.string())]));
const LoggedText = z.string().max(20_000);

/** One request on the wire (each redirect is another): as sent, how it travelled, what came back. */
export const LoggedExchange = z.object({
  request: z.object({
    method: z.string().max(20),
    url: z.string().max(100_000),
    headers: LoggedHeaders,
    body: LoggedText.optional(),
    bodySize: z.number().int().nonnegative(),
  }),
  /** Proxy, addresses, TLS and the server's certificate, as plain labelled facts. */
  network: z.record(z.string(), z.string().max(2_000)),
  response: z
    .object({
      status: z.number().int(),
      statusText: z.string().max(500),
      httpVersion: z.string().max(10),
      headers: LoggedHeaders,
      body: LoggedText.optional(),
      bodySize: z.number().int().nonnegative(),
      timings: Timings,
    })
    .optional(),
});
export type LoggedExchange = z.infer<typeof LoggedExchange>;

/**
 * The network log of one send, like Postman's console: recorded in main at the network layer
 * (after the proxy is chosen), with credentials redacted and secret variables masked.
 */
export const NetworkLogView = z.object({
  startedAt: z.string(),
  exchanges: z.array(LoggedExchange).max(20),
  error: z.object({ message: z.string().max(2_000), cause: z.string().max(2_000).optional() }).optional(),
  /** Every step with its time since the start: DNS, connects, proxy answers, TLS, errors. */
  events: z.array(z.object({ ms: z.number().nonnegative(), text: z.string().max(2_000) })).max(300),
});
export type NetworkLogView = z.infer<typeof NetworkLogView>;

export const NetworkLogInput = CancelRequestInput;
