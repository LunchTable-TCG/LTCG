/**
 * Mock Privy JWT Helpers for Testing
 *
 * Creates test identities compatible with Privy's JWT format.
 * Used by convex-test's `withIdentity()` method.
 *
 * @see https://docs.privy.io/recipes/mock-jwt
 */

/**
 * Privy identity format for convex-test withIdentity()
 */
export interface PrivyIdentity {
  subject: string;
  issuer: string;
  tokenIdentifier: string;
  email: string;
}

/**
 * Options for creating mock Privy tokens
 */
export interface MockPrivyTokenOptions {
  email: string;
  privyId?: string;
  expiresIn?: number;
}

/**
 * Create a random Privy identity for testing
 *
 * @param email - Email address for the identity
 * @returns Identity object and privyId
 */
export function createPrivyIdentity(email: string): {
  identity: PrivyIdentity;
  privyId: string;
} {
  const randomId = Math.random().toString(36).substring(2, 15);
  const privyId = `did:privy:${randomId}`;

  return {
    identity: {
      subject: privyId,
      issuer: "https://auth.privy.io",
      tokenIdentifier: `https://auth.privy.io|${privyId}`,
      email,
    },
    privyId,
  };
}

/**
 * Simple string hash function (djb2 algorithm)
 * Used for deterministic ID generation without Node.js crypto
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to positive hex string
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Create a deterministic Privy identity for testing
 *
 * Same email always produces the same privyId, useful for
 * tests that need consistent identities across runs.
 *
 * @param email - Email address for the identity
 * @returns Identity object and privyId
 */
export function createDeterministicPrivyIdentity(email: string): {
  identity: PrivyIdentity;
  privyId: string;
} {
  // Create deterministic ID from email hash
  const hash = simpleHash(email);
  const privyId = `did:privy:${hash}`;

  return {
    identity: {
      subject: privyId,
      issuer: "https://auth.privy.io",
      tokenIdentifier: `https://auth.privy.io|${privyId}`,
      email,
    },
    privyId,
  };
}

/**
 * Create a mock Privy JWT token for testing
 *
 * Note: This is a simplified mock. Real Privy tokens are signed JWTs.
 * For testing purposes, convex-test's withIdentity() doesn't validate signatures.
 *
 * @param options - Token options
 * @returns Mock JWT token string
 */
export function createMockPrivyToken(options: MockPrivyTokenOptions): string {
  const { email, privyId, expiresIn = 3600 } = options;

  const id = privyId ?? createPrivyIdentity(email).privyId;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    sub: id,
    iss: "https://auth.privy.io",
    aud: "test-app",
    email,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iat: Math.floor(Date.now() / 1000),
  };

  // Create unsigned mock token (base64 encoded)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));

  // Mock signature (not cryptographically valid, but sufficient for tests)
  const mockSignature = "mock_signature_for_testing";

  return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
}

/**
 * Verify a mock Privy token (for testing purposes)
 *
 * Note: This does NOT verify cryptographic signatures.
 * It only checks the token structure and expiration.
 *
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyMockPrivyToken(
  token: string
): { sub: string; email: string; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payloadPart = parts[1];
    if (!payloadPart) return null;

    const payload = JSON.parse(atob(payloadPart));

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
