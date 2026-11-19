import type { IncomingMessage } from "node:http";
import { PassThrough, type Transform } from "node:stream";
import { constants, createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { RequestFailed } from "../errors";
import { DECOMPRESSION_ALLOWANCE_BYTES, MAX_DECOMPRESSION_RATIO, MAX_RESPONSE_BYTES } from "./http-limits";

/** Reads and decompresses a response body, refusing oversized bodies and decompression bombs. */
export function readResponseBody(response: IncomingMessage, maxBytes = MAX_RESPONSE_BYTES): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const decoder = createDecoder(response.headers["content-encoding"]);
    const chunks: Buffer[] = [];
    const sizes = { received: 0, decoded: 0 };
    const fail = (error: Error): void => {
      response.destroy();
      decoder.destroy();
      reject(error);
    };
    response.on("data", (chunk: Buffer) => {
      sizes.received += chunk.length;
      if (sizes.received > maxBytes) fail(tooLarge(maxBytes));
    });
    decoder.on("data", (chunk: Buffer) => {
      sizes.decoded += chunk.length;
      chunks.push(chunk);
      const problem = findSizeProblem(sizes, maxBytes);
      if (problem !== undefined) fail(problem);
    });
    decoder.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    decoder.on("error", () => {
      fail(new RequestFailed("The response body could not be decompressed."));
    });
    response.on("error", fail);
    response.pipe(decoder);
  });
}

function findSizeProblem(sizes: { received: number; decoded: number }, maxBytes: number): Error | undefined {
  if (sizes.decoded > maxBytes) return tooLarge(maxBytes);
  const allowed = Math.max(DECOMPRESSION_ALLOWANCE_BYTES, sizes.received * MAX_DECOMPRESSION_RATIO);
  if (sizes.decoded > allowed) {
    return new RequestFailed("The response expands more than 100× when decompressed. Stopped for safety.");
  }
  return undefined;
}

function tooLarge(maxBytes: number): Error {
  const limit = `${String(Math.round(maxBytes / 1024 / 1024))} MB`;
  return new RequestFailed(
    `The response is larger than ${limit} (Settings › General › Request › Max response size).`,
  );
}

/** Lenient flushing, like browsers: a truncated or empty compressed body is not an error. */
function createDecoder(encoding: string | undefined): Transform {
  switch (encoding?.trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return createGunzip({ finishFlush: constants.Z_SYNC_FLUSH });
    case "deflate":
      return createInflate({ finishFlush: constants.Z_SYNC_FLUSH });
    case "br":
      return createBrotliDecompress({ finishFlush: constants.BROTLI_OPERATION_FLUSH });
    default:
      return new PassThrough();
  }
}
