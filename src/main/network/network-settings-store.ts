import { randomUUID, X509Certificate, createPrivateKey } from "node:crypto";
import type { NetworkSettingsView, UpdateNetworkSettingsInput } from "@shared/models/network-settings";
import { InvalidInput } from "../errors";
import type { WorkspaceData } from "../workspaces/workspace-data";
import { pickPemFile } from "./pick-pem-file";
import { DEFAULT_NETWORK_SETTINGS, StoredNetworkSettings } from "./stored-network-settings";

const SETTING_KEY = "network";

/** Per-workspace TLS, client-certificate and proxy settings. Files are picked and checked here, in main. */
export class NetworkSettingsStore {
  constructor(private readonly data: WorkspaceData) {}

  read(workspaceId: string): StoredNetworkSettings {
    return (
      this.data.settings(workspaceId).read(SETTING_KEY, StoredNetworkSettings) ?? DEFAULT_NETWORK_SETTINGS
    );
  }

  view(workspaceId: string): NetworkSettingsView {
    const settings = this.read(workspaceId);
    return {
      verifyTls: settings.verifyTls,
      caCertificates: settings.caCertificates.map(({ id, fileName, pem }) => ({
        id,
        fileName,
        ...describeCertificate(pem),
      })),
      clientCertificates: settings.clientCertificates.map(
        ({ id, host, certificateFile, keyFile, passphrase }) => ({
          id,
          host,
          certificateFile,
          keyFile,
          hasPassphrase: passphrase !== "",
        }),
      ),
      proxy: {
        mode: settings.proxy.mode,
        url: settings.proxy.url,
        bypass: settings.proxy.bypass,
        hasCredentials: settings.proxy.username !== "",
      },
    };
  }

  update(input: UpdateNetworkSettingsInput): NetworkSettingsView {
    const current = this.read(input.workspaceId);
    const { username = current.proxy.username, password = current.proxy.password } = input.proxy;
    this.write(input.workspaceId, {
      ...current,
      verifyTls: input.verifyTls,
      proxy: {
        mode: input.proxy.mode,
        url: input.proxy.url,
        bypass: input.proxy.bypass,
        username,
        password,
      },
    });
    return this.view(input.workspaceId);
  }

  /** Returns null when the user cancels the file dialog. */
  async addCaCertificate(workspaceId: string): Promise<NetworkSettingsView | null> {
    const file = await pickPemFile("Add a CA certificate (PEM)");
    if (file === undefined) return null;
    describeCertificate(file.pem);
    const current = this.read(workspaceId);
    const caCertificates = [
      ...current.caCertificates,
      { id: randomUUID(), fileName: file.name, pem: file.pem },
    ];
    this.write(workspaceId, { ...current, caCertificates });
    return this.view(workspaceId);
  }

  /** Certificate, then private key; the key must open with the passphrase. Null when cancelled. */
  async addClientCertificate(
    workspaceId: string,
    request: { host: string; passphrase?: string | undefined },
  ): Promise<NetworkSettingsView | null> {
    const certificate = await pickPemFile(`Client certificate for ${request.host} (PEM)`);
    if (certificate === undefined) return null;
    describeCertificate(certificate.pem);
    const key = await pickPemFile(`Private key for ${request.host} (PEM)`);
    if (key === undefined) return null;
    const passphrase = request.passphrase ?? "";
    assertKeyOpens(key.pem, passphrase);
    const current = this.read(workspaceId);
    const entry = {
      id: randomUUID(),
      host: request.host.toLowerCase(),
      certificateFile: certificate.name,
      certificatePem: certificate.pem,
      keyFile: key.name,
      keyPem: key.pem,
      passphrase,
    };
    this.write(workspaceId, { ...current, clientCertificates: [...current.clientCertificates, entry] });
    return this.view(workspaceId);
  }

  removeCertificate(workspaceId: string, id: string): NetworkSettingsView {
    const current = this.read(workspaceId);
    this.write(workspaceId, {
      ...current,
      caCertificates: current.caCertificates.filter((certificate) => certificate.id !== id),
      clientCertificates: current.clientCertificates.filter((certificate) => certificate.id !== id),
    });
    return this.view(workspaceId);
  }

  /** Settings › Request's "SSL certificate verification" (the same switch as Network's). */
  setVerifyTls(workspaceId: string, verifyTls: boolean): void {
    this.write(workspaceId, { ...this.read(workspaceId), verifyTls });
  }

  private write(workspaceId: string, settings: StoredNetworkSettings): void {
    this.data.settings(workspaceId).write(SETTING_KEY, StoredNetworkSettings.parse(settings));
  }
}

function describeCertificate(pem: string): { subject: string; validTo: string } {
  try {
    const certificate = new X509Certificate(pem);
    return { subject: certificate.subject.replace(/\n/g, ", "), validTo: certificate.validTo };
  } catch {
    throw new InvalidInput("The file is not a valid PEM certificate.");
  }
}

function assertKeyOpens(pem: string, passphrase: string): void {
  try {
    createPrivateKey({ key: pem, passphrase });
  } catch {
    throw new InvalidInput("The private key could not be opened. Check the file and its passphrase.");
  }
}
