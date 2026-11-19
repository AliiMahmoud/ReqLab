import { z } from "zod";
import { WorkspaceScoped } from "./collection";

/** What the UI may see. Certificates appear by name and subject; private keys and passwords never. */
export const NetworkSettingsView = z.object({
  verifyTls: z.boolean(),
  caCertificates: z.array(
    z.object({ id: z.uuid(), fileName: z.string(), subject: z.string(), validTo: z.string() }),
  ),
  clientCertificates: z.array(
    z.object({
      id: z.uuid(),
      host: z.string(),
      certificateFile: z.string(),
      keyFile: z.string(),
      hasPassphrase: z.boolean(),
    }),
  ),
  proxy: z.object({
    isEnabled: z.boolean(),
    url: z.string(),
    bypass: z.string(),
    hasCredentials: z.boolean(),
  }),
});
export type NetworkSettingsView = z.infer<typeof NetworkSettingsView>;

/** A host for a client certificate: "api.example.com" or "*.example.com". */
export const CertificateHost = z
  .string()
  .trim()
  .min(1)
  .max(253)
  .regex(/^(\*\.)?[a-z0-9.-]+$/i, "Use a host name like api.example.com or *.example.com.");

export const ProxyUrl = z
  .string()
  .trim()
  .max(2_048)
  .refine((text) => text === "" || /^http:\/\/[^\s/]+(:\d+)?\/?$/i.test(text), "Use http://host:port.");

export const UpdateNetworkSettingsInput = WorkspaceScoped.extend({
  verifyTls: z.boolean(),
  proxy: z.object({
    isEnabled: z.boolean(),
    url: ProxyUrl,
    bypass: z.string().max(4_096),
    /** Undefined keeps the stored credentials; empty strings remove them. */
    username: z.string().max(1_024).optional(),
    password: z.string().max(1_024).optional(),
  }),
});
export type UpdateNetworkSettingsInput = z.infer<typeof UpdateNetworkSettingsInput>;

export const AddClientCertificateInput = WorkspaceScoped.extend({
  host: CertificateHost,
  passphrase: z.string().max(1_024).optional(),
});

export const RemoveCertificateInput = WorkspaceScoped.extend({ id: z.uuid() });
