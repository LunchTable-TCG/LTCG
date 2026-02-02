/**
 * Test Authentication Key Management
 *
 * Generates ECDSA P256 key pairs for signing mock Privy JWTs during E2E tests.
 * Uses the `jose` library for cryptographic operations.
 *
 * The key pair is lazily generated and cached for the duration of the test run.
 * This ensures consistent signing across all test JWT tokens.
 *
 * Usage:
 *   import { getTestKeyPair, getTestPublicJWKS } from './test-auth-keys';
 *
 *   // Get key pair for signing
 *   const { privateKey } = await getTestKeyPair();
 *
 *   // Get JWKS for verification endpoint
 *   const jwks = await getTestPublicJWKS();
 */

import * as jose from "jose";
import type { GenerateKeyPairResult } from "jose";

// Cached key pair - generated once per test run
let testKeyPair: GenerateKeyPairResult | null = null;

/**
 * Get or generate the test ECDSA key pair.
 *
 * Uses ES256 (ECDSA with P-256 curve and SHA-256) to match Privy's JWT signing algorithm.
 * The key pair is cached for reuse across multiple token generations.
 *
 * @returns Promise resolving to { publicKey, privateKey }
 */
export async function getTestKeyPair() {
  if (!testKeyPair) {
    testKeyPair = await jose.generateKeyPair("ES256");
  }
  return testKeyPair;
}

/**
 * Get the public JWKS (JSON Web Key Set) for the test key pair.
 *
 * Returns a JWKS structure that can be served from a test endpoint
 * for JWT verification. The key includes:
 * - `kid`: Key ID for identifying this key
 * - `use`: "sig" indicating this key is for signature verification
 *
 * @returns Promise resolving to JWKS object { keys: [JWK] }
 */
export async function getTestPublicJWKS() {
  const { publicKey } = await getTestKeyPair();
  const jwk = await jose.exportJWK(publicKey);
  return { keys: [{ ...jwk, kid: "test-key-1", use: "sig" }] };
}

/**
 * Reset the cached key pair.
 *
 * Useful for test isolation when you need a fresh key pair.
 * Generally not needed as the same key pair should work across all tests.
 */
export function resetTestKeyPair() {
  testKeyPair = null;
}
