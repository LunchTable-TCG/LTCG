/**
 * Convex Auth Configuration
 *
 * SECURITY: Configure Privy JWT verification using Custom JWT provider
 * Privy JWTs use ES256 algorithm with issuer "privy.io"
 *
 * Note: Privy doesn't expose standard OIDC endpoints, so we use customJwt
 * with the verification key from Privy Dashboard embedded as a data URI.
 */

// Privy verification key in JWK format (from Dashboard → Configuration → App settings)
const privyJwks = {
  keys: [
    {
      kty: "EC",
      x: "CxGYMOFWtXHSFTH2_MdKCW15V12hW9cN4HWQrwPnK1c",
      y: "EdzpOXyha5b8E__zDRkdJ1i31fqrsHMnZj_qhohe0sI",
      crv: "P-256",
      use: "sig",
      alg: "ES256",
      kid: "privy-verification-key",
    },
  ],
};

export default {
  providers: [
    {
      type: "customJwt",
      // Privy JWT issuer is just "privy.io" (not a URL)
      issuer: "privy.io",
      // ES256 (ECDSA with P-256 curve)
      algorithm: "ES256",
      // Privy App ID - must match the "aud" claim in JWTs
      applicationID: process.env["PRIVY_APP_ID"],
      // JWKS as data URI since Privy doesn't expose a public JWKS endpoint
      jwks: "data:application/json," + encodeURIComponent(JSON.stringify(privyJwks)),
    },
  ],
};
