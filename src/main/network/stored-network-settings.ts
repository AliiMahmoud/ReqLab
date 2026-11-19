import { z } from "zod";

const Pem = z
  .string()
  .max(100_000)
  .regex(/-----BEGIN [A-Z0-9 ]+-----/);

/** Kept in the encrypted workspace file (settings "network"); key material stays in main. */
export const StoredNetworkSettings = z.object({
  verifyTls: z.boolean(),
  caCertificates: z.array(z.object({ id: z.uuid(), fileName: z.string().max(255), pem: Pem })).max(50),
  clientCertificates: z
    .array(
      z.object({
        id: z.uuid(),
        host: z.string().max(253),
        certificateFile: z.string().max(255),
        certificatePem: Pem,
        keyFile: z.string().max(255),
        keyPem: Pem,
        passphrase: z.string().max(1_024),
      }),
    )
    .max(50),
  proxy: z.object({
    isEnabled: z.boolean(),
    url: z.string().max(2_048),
    bypass: z.string().max(4_096),
    username: z.string().max(1_024),
    password: z.string().max(1_024),
  }),
});
export type StoredNetworkSettings = z.infer<typeof StoredNetworkSettings>;

export const DEFAULT_NETWORK_SETTINGS: StoredNetworkSettings = {
  verifyTls: true,
  caCertificates: [],
  clientCertificates: [],
  proxy: { isEnabled: false, url: "", bypass: "localhost, 127.0.0.1, ::1", username: "", password: "" },
};
