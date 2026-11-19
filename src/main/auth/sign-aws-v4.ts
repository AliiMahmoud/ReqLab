import { createHash, createHmac } from "node:crypto";
import type { HeaderList, PreparedRequest } from "../http/http-types";

export interface AwsCredentials {
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  region: string;
  service: string;
}

/**
 * AWS Signature Version 4 (header form). Signs host and the x-amz-* headers it adds;
 * S3 also gets x-amz-content-sha256. Pure: the clock is passed in.
 */
export function signAwsV4(request: PreparedRequest, credentials: AwsCredentials, now: Date): HeaderList {
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(request.body ?? Buffer.alloc(0));
  const added = headersToAdd({ amzDate, payloadHash, credentials });
  const { canonicalRequest, signedNames } = buildCanonicalRequest(request, { added, payloadHash });
  const scope = `${dateStamp}/${credentials.region}/${credentials.service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(Buffer.from(canonicalRequest, "utf8")),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(credentials, dateStamp))
    .update(stringToSign)
    .digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKey}/${scope}, SignedHeaders=${signedNames}, Signature=${signature}`;
  return [...added, ["Authorization", authorization]];
}

/** The request reduced to the exact text AWS signs: method, path, sorted query and headers, body hash. */
function buildCanonicalRequest(
  request: PreparedRequest,
  { added, payloadHash }: { added: HeaderList; payloadHash: string },
): { canonicalRequest: string; signedNames: string } {
  const toSign: HeaderList = [["host", request.url.host], ...added];
  const signed = toSign.map(([name, value]) => [name.toLowerCase(), value.trim()] as const);
  signed.sort(([a], [b]) => compare(a, b));
  const signedNames = signed.map(([name]) => name).join(";");
  const canonicalRequest = [
    request.method,
    request.url.pathname === "" ? "/" : request.url.pathname,
    canonicalQuery(request.url),
    signed.map(([name, value]) => `${name}:${value}\n`).join(""),
    signedNames,
    payloadHash,
  ].join("\n");
  return { canonicalRequest, signedNames };
}

function headersToAdd(input: {
  amzDate: string;
  payloadHash: string;
  credentials: AwsCredentials;
}): HeaderList {
  const headers: HeaderList = [["X-Amz-Date", input.amzDate]];
  if (input.credentials.service === "s3") headers.push(["X-Amz-Content-Sha256", input.payloadHash]);
  if (input.credentials.sessionToken !== "")
    headers.push(["X-Amz-Security-Token", input.credentials.sessionToken]);
  return headers;
}

/** Sorted by name then value, each part RFC 3986 encoded. */
function canonicalQuery(url: URL): string {
  return [...url.searchParams]
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([keyA, valueA], [keyB, valueB]) => (keyA === keyB ? compare(valueA, valueB) : compare(keyA, keyB)))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function signingKey(credentials: AwsCredentials, dateStamp: string): Buffer {
  const kDate = createHmac("sha256", `AWS4${credentials.secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(credentials.region).digest();
  const kService = createHmac("sha256", kRegion).update(credentials.service).digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}

function encodeRfc3986(text: string): string {
  return encodeURIComponent(text).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function compare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
