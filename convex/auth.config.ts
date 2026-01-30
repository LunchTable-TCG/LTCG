/**
 * Convex Auth Configuration
 *
 * SECURITY: Configure Privy JWT verification using Custom JWT provider
 * Privy JWTs use ES256 algorithm with issuer "privy.io"
 *
 * See: https://docs.privy.io/authentication/user-authentication/access-tokens
 */

// Privy App ID (prefer server-side env, fallback to NEXT_PUBLIC for dev parity)
const PRIVY_APP_ID =
  process.env["PRIVY_APP_ID"] ??
  process.env["NEXT_PUBLIC_PRIVY_APP_ID"] ??
  "cml0fnzn501t7lc0buoz8kt74";

if (!PRIVY_APP_ID) {
  throw new Error("Missing PRIVY_APP_ID for Convex auth configuration");
}

// Use Privy's JWKS URL to avoid breakage when keys rotate
const PRIVY_JWKS_URL = `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`;

export default {
  providers: [
    {
      type: "customJwt",
      // Privy JWT issuer is just "privy.io" (not a URL)
      issuer: "privy.io",
      // ES256 (ECDSA with P-256 curve)
      algorithm: "ES256",
      // Privy App ID - must match the "aud" claim in JWTs
      applicationID: PRIVY_APP_ID,
      // JWKS URL to allow key rotation without code changes
      jwks: PRIVY_JWKS_URL,
    },
  ],
};
