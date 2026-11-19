import type { RequestDefinition } from "@shared/models/request";
import { RequestFailed } from "../../errors";
import { encodeBody } from "../../http/body-encoders/body-encoder-registry";
import { fillPathVariables } from "../../http/fill-path-variables";
import { findHeader, type HeaderList, type PreparedRequest } from "../../http/http-types";
import { requireValue, type PipelineStep } from "../request-context";

const DEFAULT_HEADERS: HeaderList = [
  ["User-Agent", "ReqLab/0.1"],
  ["Accept", "*/*"],
  ["Accept-Encoding", "gzip, deflate, br"],
];

/** Turns the resolved definition into bytes and headers ready for the network. */
export const prepareRequest: PipelineStep = (context) => {
  const resolved = requireValue(context.resolved, "prepareRequest");
  context.prepared = buildPreparedRequest(resolved);
};

function buildPreparedRequest(definition: RequestDefinition): PreparedRequest {
  const url = parseHttpUrl(fillPathVariables(definition.url, definition.pathVariables));
  const userHeaders: HeaderList = definition.headers
    .filter((header) => header.isEnabled && header.key.trim() !== "")
    .map((header) => [header.key.trim(), header.value]);
  const encoded = encodeBody(definition.body);
  const headers = [...userHeaders, ...missingDefaults(userHeaders)];
  if (encoded !== undefined && findHeader(headers, "content-type") === undefined) {
    headers.push(["Content-Type", encoded.contentType]);
  }
  if (encoded !== undefined) headers.push(["Content-Length", String(encoded.bytes.length)]);
  return { method: definition.method.toUpperCase(), url, headers, body: encoded?.bytes };
}

function missingDefaults(userHeaders: HeaderList): HeaderList {
  return DEFAULT_HEADERS.filter(([name]) => findHeader(userHeaders, name) === undefined);
}

/** Like Postman, an address without a scheme means http://. Only http and https are sent. */
function parseHttpUrl(text: string): URL {
  const trimmed = text.trim();
  if (trimmed === "") throw new RequestFailed("Enter a URL.");
  const unresolved = /\{\{([^{}]+)\}\}/.exec(trimmed)?.[1];
  if (unresolved !== undefined) {
    throw new RequestFailed(
      `The URL uses {{${unresolved.trim()}}}, which is not defined in the active environment, collection or globals.`,
    );
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new RequestFailed("The URL is not valid. Check for unresolved {{variables}}.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RequestFailed("Only http:// and https:// addresses can be sent.");
  }
  return url;
}
