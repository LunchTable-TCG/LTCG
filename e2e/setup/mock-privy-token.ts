/**
 * Mock Privy JWT Token Generation
 *
 * Creates JWT tokens that match Privy's authentication token format.
 * These tokens are signed with test keys for E2E testing purposes.
 *
 * Token format follows Privy's official specification:
 * - Algorithm: ES256 (ECDSA with P-256)
 * - Issuer: "privy.io"
 * - Subject: "did:privy:{userId}"
 * - Audience: Privy App ID
 * - Custom claims: sid (session ID)
 *
 * Reference: https://docs.privy.io/recipes/mock-jwt
 *
 * Usage:
 *   import { createMockPrivyToken } from './mock-privy-token';
 *
 *   const token = await createMockPrivyToken('user123', 'app-id');
 */

import * as jose from "jose";
import { getTestKeyPair } from "./test-auth-keys";

/**
 * Create a mock Privy JWT token for testing.
 *
 * @param userId - The user identifier (will be prefixed with "did:privy:")
 * @param appId - The Privy application ID (used as audience)
 * @param options - Optional token configuration
 * @returns Promise resolving to signed JWT string
 */
export async function createMockPrivyToken(
  userId: string,
  appId: string,
  options: {
    /** Token expiration time (default: "1h") */
    expiresIn?: string;
    /** Session ID (default: auto-generated) */
    sessionId?: string;
    /** Additional claims to include */
    additionalClaims?: Record<string, unknown>;
  } = {}
) {
  const { privateKey } = await getTestKeyPair();
  const {
    expiresIn = "1h",
    sessionId = `test-session-${Date.now()}`,
    additionalClaims = {},
  } = options;

  // Ensure userId has the did:privy: prefix
  const subject = userId.startsWith("did:privy:") ? userId : `did:privy:${userId}`;

  return await new jose.SignJWT({
    sid: sessionId,
    ...additionalClaims,
  })
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setIssuer("privy.io")
    .setIssuedAt()
    .setAudience(appId)
    .setSubject(subject)
    .setExpirationTime(expiresIn)
    .sign(privateKey);
}

/**
 * Create a mock Privy token for a test user with common defaults.
 *
 * Convenience wrapper that generates a unique user ID if not provided.
 *
 * @param appId - The Privy application ID
 * @param userId - Optional user ID (auto-generated if not provided)
 * @returns Promise resolving to { token, userId, privyDid }
 */
export async function createTestUserToken(appId: string, userId?: string) {
  const actualUserId = userId ?? `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const privyDid = `did:privy:${actualUserId}`;
  const token = await createMockPrivyToken(actualUserId, appId);

  return {
    token,
    userId: actualUserId,
    privyDid,
  };
}

/**
 * Decode a JWT token without verification.
 *
 * Useful for debugging and inspecting token contents during tests.
 *
 * @param token - JWT string to decode
 * @returns Decoded token payload
 */
export function decodeToken(token: string) {
  return jose.decodeJwt(token);
}
