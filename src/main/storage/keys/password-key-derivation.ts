import * as crypto from "node:crypto";
import { z } from "zod";

const KEY_BYTES = 32;
const SALT_BYTES = 16;

export const KdfParams = z.discriminatedUnion("algorithm", [
  z.object({
    algorithm: z.literal("argon2id"),
    salt: z.base64(),
    memoryKiB: z.number().int().min(19_456),
    passes: z.number().int().min(2),
    parallelism: z.number().int().min(1),
  }),
  z.object({
    algorithm: z.literal("scrypt"),
    salt: z.base64(),
    cost: z
      .number()
      .int()
      .min(2 ** 15),
    blockSize: z.number().int().min(8),
    parallelization: z.number().int().min(1),
  }),
]);
export type KdfParams = z.infer<typeof KdfParams>;

/** Argon2id when the bundled Node has it (Node 24.7+), otherwise scrypt. The choice is stored with the key. */
export function createKdfParams(): KdfParams {
  const salt = crypto.randomBytes(SALT_BYTES).toString("base64");
  if (isArgon2Available()) {
    return { algorithm: "argon2id", salt, memoryKiB: 64 * 1024, passes: 3, parallelism: 4 };
  }
  return { algorithm: "scrypt", salt, cost: 2 ** 17, blockSize: 8, parallelization: 1 };
}

export function deriveKeyFromPassword(password: string, params: KdfParams): Promise<Buffer> {
  // NFKC so the same password typed on different keyboards gives the same key.
  const message = Buffer.from(password.normalize("NFKC"), "utf8");
  const salt = Buffer.from(params.salt, "base64");
  return params.algorithm === "argon2id"
    ? deriveWithArgon2id(message, salt, params)
    : deriveWithScrypt(message, salt, params);
}

let argon2Support: boolean | undefined;

/**
 * Electron's Node is built on BoringSSL, which exposes crypto.argon2 but may not implement it.
 * So we try one tiny derivation instead of trusting that the function exists.
 */
function isArgon2Available(): boolean {
  argon2Support ??= canRunArgon2();
  return argon2Support;
}

function canRunArgon2(): boolean {
  try {
    const nonce = crypto.randomBytes(SALT_BYTES);
    crypto.argon2Sync("argon2id", {
      message: "probe",
      nonce,
      memory: 8,
      passes: 1,
      parallelism: 1,
      tagLength: 4,
    });
    return true;
  } catch {
    return false;
  }
}

type Argon2idParams = Extract<KdfParams, { algorithm: "argon2id" }>;
type ScryptParams = Extract<KdfParams, { algorithm: "scrypt" }>;

function deriveWithArgon2id(message: Buffer, nonce: Buffer, params: Argon2idParams): Promise<Buffer> {
  const options = {
    message,
    nonce,
    memory: params.memoryKiB,
    passes: params.passes,
    parallelism: params.parallelism,
    tagLength: KEY_BYTES,
  };
  return new Promise((resolve, reject) => {
    crypto.argon2("argon2id", options, (error, key) => {
      message.fill(0);
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function deriveWithScrypt(message: Buffer, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  const options = {
    N: params.cost,
    r: params.blockSize,
    p: params.parallelization,
    maxmem: 256 * 1024 * 1024,
  };
  return new Promise((resolve, reject) => {
    crypto.scrypt(message, salt, KEY_BYTES, options, (error, key) => {
      message.fill(0);
      if (error) reject(error);
      else resolve(key);
    });
  });
}
