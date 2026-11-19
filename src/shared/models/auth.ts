import { z } from "zod";
import { JwtAlgorithms, OAuth2GrantTypes } from "../auth-defaults";
import { MAX_BODY_TEXT_LENGTH, MAX_KEY_LENGTH, MAX_VALUE_LENGTH } from "../limits";

export { JwtAlgorithms };

const Text = z.string().max(MAX_VALUE_LENGTH);

/**
 * How a request authenticates. Every field may hold {{variables}} (use secret variables for credentials).
 * "inherit" takes the nearest folder's or collection's auth; a collection that inherits has none.
 */
export const RequestAuth = z.discriminatedUnion("type", [
  z.object({ type: z.literal("inherit") }),
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("basic"), username: Text, password: Text }),
  /** Sent only after the server's 401 challenge, which the sender answers once. */
  z.object({ type: z.literal("digest"), username: Text, password: Text }),
  z.object({ type: z.literal("bearer"), token: Text }),
  z.object({
    type: z.literal("apikey"),
    key: z.string().max(MAX_KEY_LENGTH),
    value: Text,
    addTo: z.enum(["header", "query"]),
  }),
  z.object({
    type: z.literal("awsv4"),
    accessKey: Text,
    secretKey: Text,
    sessionToken: Text,
    region: Text,
    service: Text,
  }),
  z.object({
    type: z.literal("oauth2"),
    grantType: z.enum(OAuth2GrantTypes),
    authUrl: Text,
    tokenUrl: Text,
    clientId: Text,
    clientSecret: Text,
    scope: Text,
    /** Password grant only. */
    username: Text,
    password: Text,
  }),
  z.object({
    type: z.literal("jwt"),
    algorithm: z.enum(JwtAlgorithms),
    /** The shared secret (HS*) or a PEM private key (RS*). */
    secret: z.string().max(MAX_BODY_TEXT_LENGTH),
    /** The claims, as JSON text. */
    payload: z.string().max(MAX_BODY_TEXT_LENGTH),
    headerPrefix: z.string().max(100),
  }),
]);
export type RequestAuth = z.infer<typeof RequestAuth>;
export type AuthType = RequestAuth["type"];

export const INHERIT_AUTH: RequestAuth = { type: "inherit" };
