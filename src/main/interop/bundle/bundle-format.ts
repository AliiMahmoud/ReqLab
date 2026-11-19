import { gunzipSync, gzipSync } from "node:zlib";

import { ImportFailed, WrongPassphrase } from "../../errors";
import { openWithKey } from "../../storage/keys/envelope";
import { deriveKeyFromPassword, KdfParams } from "../../storage/keys/password-key-derivation";
import { parseUntrustedJson } from "../untrusted-json";

/**
 * A .reqlab bundle, deliberately not a zip:
 *   "RQLB" | version (1 byte) | KDF params length (2 bytes) | KDF params (JSON) | nonce | tag | ciphertext
 * The ciphertext is gzipped JSON sealed with AES-256-GCM under a key derived from the passphrase.
 * Earlier versions exported this format; it is still read so those files can be imported.
 * The header is the associated data, so the KDF parameters cannot be swapped.
 */
export const BUNDLE_MAGIC = Buffer.from("RQLB", "ascii");
/**
 * An unencrypted bundle: "RQLP" | version (1 byte) | gzipped JSON. Written by Export, which leaves
 * every secret value out because nothing protects the file.
 */
export const PLAIN_BUNDLE_MAGIC = Buffer.from("RQLP", "ascii");
const FORMAT_VERSION = 1;
const MAX_CONTENT_BYTES = 200 * 1024 * 1024;

/** A hostile file must not make us burn unbounded memory or time deriving the key. */
const BoundedKdfParams = KdfParams.refine((params) =>
  params.algorithm === "argon2id"
    ? params.memoryKiB <= 256 * 1024 && params.passes <= 10 && params.parallelism <= 16
    : params.cost <= 2 ** 20 && params.blockSize <= 16 && params.parallelization <= 4,
);

export async function openBundle(bytes: Buffer, passphrase: string): Promise<Buffer> {
  const { params, header, sealed } = readHeader(bytes);
  const key = await deriveKeyFromPassword(passphrase, params);
  let compressed: Buffer;
  try {
    compressed = openWithKey(key, sealed, header.toString("base64"));
  } catch {
    throw new WrongPassphrase();
  } finally {
    key.fill(0);
  }
  try {
    return gunzipSync(compressed, { maxOutputLength: MAX_CONTENT_BYTES });
  } catch {
    throw new ImportFailed("The bundle's contents are too large or damaged.");
  }
}

export function writePlainBundle(content: Buffer): Buffer {
  return Buffer.concat([PLAIN_BUNDLE_MAGIC, Buffer.from([FORMAT_VERSION]), gzipSync(content)]);
}

export function readPlainBundle(bytes: Buffer): Buffer {
  const headerLength = PLAIN_BUNDLE_MAGIC.length + 1;
  if (bytes.length < headerLength || !hasMagic(bytes, PLAIN_BUNDLE_MAGIC)) {
    throw new ImportFailed("This is not a ReqLab bundle.");
  }
  if (bytes.readUInt8(PLAIN_BUNDLE_MAGIC.length) !== FORMAT_VERSION) {
    throw new ImportFailed("This bundle was made by a newer version of ReqLab.");
  }
  try {
    return gunzipSync(bytes.subarray(headerLength), { maxOutputLength: MAX_CONTENT_BYTES });
  } catch {
    throw new ImportFailed("The bundle's contents are too large or damaged.");
  }
}

export function hasMagic(bytes: Buffer, magic: Buffer): boolean {
  return bytes.subarray(0, magic.length).equals(magic);
}

function readHeader(bytes: Buffer): { params: KdfParams; header: Buffer; sealed: Buffer } {
  const fixedLength = BUNDLE_MAGIC.length + 3;
  if (bytes.length < fixedLength || !bytes.subarray(0, BUNDLE_MAGIC.length).equals(BUNDLE_MAGIC)) {
    throw new ImportFailed("This is not a ReqLab bundle.");
  }
  if (bytes.readUInt8(BUNDLE_MAGIC.length) !== FORMAT_VERSION) {
    throw new ImportFailed("This bundle was made by a newer version of ReqLab.");
  }
  const headerLength = fixedLength + bytes.readUInt16BE(BUNDLE_MAGIC.length + 1);
  const paramsText = bytes.subarray(fixedLength, headerLength).toString("utf8");
  const params = BoundedKdfParams.safeParse(parseUntrustedJson(paramsText, "bundle header"));
  if (!params.success) throw new ImportFailed("The bundle's header is damaged.");
  return {
    params: params.data,
    header: bytes.subarray(0, headerLength),
    sealed: bytes.subarray(headerLength),
  };
}
