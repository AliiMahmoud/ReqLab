import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Encrypts and authenticates `plaintext` with AES-256-GCM.
 * `associatedData` binds the result to its context (e.g. a workspace id), so it cannot be moved elsewhere.
 * Layout: nonce (12) | auth tag (16) | ciphertext.
 */
export function sealWithKey(key: Buffer, plaintext: Buffer, associatedData: string): Buffer {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
}

/** Throws if the key is wrong or a single bit of the sealed data was changed. */
export function openWithKey(key: Buffer, sealed: Buffer, associatedData: string): Buffer {
  const nonce = sealed.subarray(0, NONCE_BYTES);
  const tag = sealed.subarray(NONCE_BYTES, NONCE_BYTES + TAG_BYTES);
  const ciphertext = sealed.subarray(NONCE_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_BYTES });
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
