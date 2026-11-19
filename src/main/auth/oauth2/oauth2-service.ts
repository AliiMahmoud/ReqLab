import type { OAuth2TokenStatus } from "@shared/models/oauth2";
import { RequestFailed } from "../../errors";
import { createNetworkPlan, type NetworkPlan } from "../../network/network-plan";
import type { NetworkSettingsStore } from "../../network/network-settings-store";
import { authorizeInBrowser } from "./authorize-in-browser";
import { tokenCacheKey, type OAuth2Config } from "./oauth2-config";
import { requestToken } from "./token-endpoint";
import { isExpired, type OAuth2TokenStore, type StoredToken } from "./token-store";

/**
 * Gets OAuth 2.0 access tokens and keeps them in the encrypted workspace. Configs passed here
 * already have their {{variables}} resolved. Tokens never leave main.
 */
export class OAuth2Service {
  constructor(
    private readonly tokens: OAuth2TokenStore,
    private readonly networkSettings: NetworkSettingsStore,
  ) {}

  status(workspaceId: string, config: OAuth2Config): OAuth2TokenStatus {
    return this.tokens.status(this.tokens.read(workspaceId, tokenCacheKey(config)));
  }

  clear(workspaceId: string, config: OAuth2Config): OAuth2TokenStatus {
    this.tokens.clear(workspaceId, tokenCacheKey(config));
    return this.status(workspaceId, config);
  }

  /** The "Get new access token" button: always a fresh token (the browser for authorization code). */
  async fetchNew(workspaceId: string, config: OAuth2Config): Promise<OAuth2TokenStatus> {
    const token = await this.grant(config, this.network(workspaceId));
    this.tokens.write(workspaceId, tokenCacheKey(config), token);
    return this.tokens.status(token);
  }

  /** For sending: the cached token, refreshed or fetched again when it expired. */
  async accessToken(workspaceId: string, config: OAuth2Config): Promise<string> {
    const key = tokenCacheKey(config);
    const cached = this.tokens.read(workspaceId, key);
    if (cached !== undefined && !isExpired(cached)) return cached.accessToken;
    const network = this.network(workspaceId);
    const token = await this.renew(config, { cached, network });
    this.tokens.write(workspaceId, key, token);
    return token.accessToken;
  }

  private async renew(
    config: OAuth2Config,
    { cached, network }: { cached: StoredToken | undefined; network: NetworkPlan },
  ): Promise<StoredToken> {
    if (typeof cached?.refreshToken === "string")
      return this.refresh(config, { refreshToken: cached.refreshToken, network });
    if (config.grantType === "authorization_code") {
      throw new RequestFailed('No OAuth 2.0 token yet: click "Get new access token" in Authorization.');
    }
    return this.grant(config, network);
  }

  private async refresh(
    config: OAuth2Config,
    { refreshToken, network }: { refreshToken: string; network: NetworkPlan },
  ): Promise<StoredToken> {
    const form = { grant_type: "refresh_token", refresh_token: refreshToken, ...scopeOf(config) };
    const { token } = await requestToken({ ...credentialsOf(config), form, network });
    // Servers may not send a new refresh token; the old one stays valid then.
    return { ...token, refreshToken: token.refreshToken ?? refreshToken };
  }

  private async grant(config: OAuth2Config, network: NetworkPlan): Promise<StoredToken> {
    const form = await grantForm(config);
    const { token } = await requestToken({ ...credentialsOf(config), form, network });
    return token;
  }

  private network(workspaceId: string): NetworkPlan {
    return createNetworkPlan(this.networkSettings.read(workspaceId));
  }
}

async function grantForm(config: OAuth2Config): Promise<Record<string, string>> {
  switch (config.grantType) {
    case "client_credentials":
      return { grant_type: "client_credentials", ...scopeOf(config) };
    case "password":
      return {
        grant_type: "password",
        username: config.username,
        password: config.password,
        ...scopeOf(config),
      };
    case "authorization_code": {
      const authorization = await authorizeInBrowser(config);
      return {
        grant_type: "authorization_code",
        code: authorization.code,
        redirect_uri: authorization.redirectUri,
        code_verifier: authorization.codeVerifier,
      };
    }
  }
}

function credentialsOf(config: OAuth2Config): { tokenUrl: string; clientId: string; clientSecret: string } {
  return { tokenUrl: config.tokenUrl, clientId: config.clientId, clientSecret: config.clientSecret };
}

function scopeOf(config: OAuth2Config): Record<string, string> {
  return config.scope === "" ? {} : { scope: config.scope };
}
