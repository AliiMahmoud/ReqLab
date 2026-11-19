/** Zod-free auth constants, so the UI bundle does not pull in the validation library. */
export const JwtAlgorithms = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"] as const;

/** "authorization_code" always uses PKCE (S256), as OAuth 2.1 requires. */
export const OAuth2GrantTypes = ["authorization_code", "client_credentials", "password"] as const;
