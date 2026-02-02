/**
 * Mock Privy JWT Helper for Testing
 *
 * Creates valid JWT tokens that match Privy's format for testing.
 * Based on: https://docs.privy.io/recipes/mock-jwt
 *
 * Usage:
 * - Unit tests: Use `createMockPrivyToken()` to get a token
 * - Convex tests: Use `createPrivyIdentity()` for `withIdentity()`
 * - E2E tests: Use `MockPrivyAuth.injectAuthState()` to bypass login
 */

import * as jose from "jose";
import type { GenerateKeyPairResult } from "jose";

// Privy JWT configuration (matches auth.config.ts)
const PRIVY_ISSUER = "privy.io";
const PRIVY_ALGORITHM = "ES256";

// Test App ID - use the same as configured in auth.config.ts
const TEST_PRIVY_APP_ID =
  process.env["PRIVY_APP_ID"] ??
  process.env["NEXT_PUBLIC_PRIVY_APP_ID"] ??
  "cml0fnzn501t7lc0buoz8kt74";

/**
 * Cached keypair for consistent signing across tests
 * Regenerated per test run for isolation
 */
let cachedKeyPair: GenerateKeyPairResult | null = null;

/**
 * Generate or retrieve the test keypair
 * Uses ES256 (ECDSA with P-256 curve) to match Privy's algorithm
 */
export async function getTestKeyPair() {
  if (!cachedKeyPair) {
    cachedKeyPair = await jose.generateKeyPair(PRIVY_ALGORITHM);
  }
  return cachedKeyPair;
}

/**
 * Reset the cached keypair (useful for test isolation)
 */
export function resetTestKeyPair() {
  cachedKeyPair = null;
}

/**
 * Options for creating a mock Privy token
 */
export interface MockPrivyTokenOptions {
  /** Privy DID (did:privy:xxx) - will be used as JWT subject */
  privyId: string;
  /** Session ID for the token */
  sessionId?: string;
  /** Token expiration time (default: 1h) */
  expiresIn?: string;
  /** Custom claims to include */
  customClaims?: Record<string, unknown>;
  /** Override the app ID (audience) */
  appId?: string;
}

/**
 * Create a mock Privy JWT token for testing
 *
 * The token follows Privy's JWT format:
 * - Algorithm: ES256
 * - Issuer: "privy.io"
 * - Audience: Your Privy App ID
 * - Subject: Privy DID (did:privy:xxx)
 * - Custom claim: sid (session ID)
 *
 * @example
 * ```ts
 * const token = await createMockPrivyToken({
 *   privyId: "did:privy:test_user_123",
 * });
 * ```
 */
export async function createMockPrivyToken(options: MockPrivyTokenOptions) {
  const { publicKey, privateKey } = await getTestKeyPair();

  const sessionId = options.sessionId ?? `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const appId = options.appId ?? TEST_PRIVY_APP_ID;
  const expiresIn = options.expiresIn ?? "1h";

  const jwt = await new jose.SignJWT({
    sid: sessionId,
    ...options.customClaims,
  })
    .setProtectedHeader({ alg: PRIVY_ALGORITHM, typ: "JWT" })
    .setIssuer(PRIVY_ISSUER)
    .setIssuedAt()
    .setAudience(appId)
    .setSubject(options.privyId)
    .setExpirationTime(expiresIn)
    .sign(privateKey);

  return {
    token: jwt,
    publicKey,
    privateKey,
    claims: {
      iss: PRIVY_ISSUER,
      aud: appId,
      sub: options.privyId,
      sid: sessionId,
    },
  };
}

/**
 * Verify a mock Privy JWT token
 * Useful for testing verification logic
 */
export async function verifyMockPrivyToken(token: string, appId?: string) {
  const { publicKey } = await getTestKeyPair();

  try {
    const { payload } = await jose.jwtVerify(token, publicKey, {
      issuer: PRIVY_ISSUER,
      audience: appId ?? TEST_PRIVY_APP_ID,
    });
    return { valid: true, payload };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a Privy-compatible identity object for convex-test's withIdentity()
 *
 * This creates the identity format expected by Convex after JWT verification.
 * Use this in Convex backend tests.
 *
 * @example
 * ```ts
 * const { identity, privyId } = createPrivyIdentity("testuser@example.com");
 * const asUser = t.withIdentity(identity);
 * ```
 */
export function createPrivyIdentity(email: string, customId?: string) {
  const uniqueId = customId ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const privyId = `did:privy:${uniqueId}`;

  return {
    identity: {
      subject: privyId,
      issuer: PRIVY_ISSUER,
      tokenIdentifier: `${PRIVY_ISSUER}|${privyId}`,
      email,
    },
    privyId,
  };
}

/**
 * Create a deterministic Privy identity from an email
 * Useful when you need consistent IDs across test runs
 *
 * @example
 * ```ts
 * const { identity, privyId } = createDeterministicPrivyIdentity("test@example.com");
 * // privyId will always be the same for "test@example.com"
 * ```
 */
export function createDeterministicPrivyIdentity(email: string) {
  // Create a deterministic ID from email (for consistent test data)
  const sanitizedEmail = email.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const privyId = `did:privy:test_${sanitizedEmail}`;

  return {
    identity: {
      subject: privyId,
      issuer: PRIVY_ISSUER,
      tokenIdentifier: `${PRIVY_ISSUER}|${privyId}`,
      email,
    },
    privyId,
  };
}

/**
 * Mock Privy authentication helper for E2E tests
 *
 * Provides utilities to bypass Privy's actual authentication
 * and inject mock auth state directly into the browser.
 */
export class MockPrivyAuth {
  /**
   * Create auth state that can be injected into localStorage/cookies
   * for E2E tests to bypass the login flow
   */
  static async createAuthState(options: MockPrivyTokenOptions) {
    const { token, claims } = await createMockPrivyToken(options);

    // Privy stores auth state in localStorage
    // The exact key format may vary by Privy version
    const authState = {
      "privy:token": token,
      "privy:user": JSON.stringify({
        id: options.privyId,
        createdAt: Date.now(),
        linkedAccounts: [
          {
            type: "email",
            address: `test_${Date.now()}@example.com`,
            verifiedAt: Date.now(),
          },
        ],
      }),
      "privy:session": JSON.stringify({
        sessionId: claims.sid,
        expiresAt: Date.now() + 3600000, // 1 hour
      }),
    };

    return { token, authState, claims };
  }

  /**
   * Generate localStorage script to inject auth state
   * Use with Playwright's page.addInitScript()
   *
   * @example
   * ```ts
   * const script = await MockPrivyAuth.getInjectionScript({
   *   privyId: "did:privy:test_123",
   * });
   * await page.addInitScript(script);
   * await page.goto("/protected-route");
   * ```
   */
  static async getInjectionScript(options: MockPrivyTokenOptions) {
    const { authState } = await this.createAuthState(options);

    return `
      (function() {
        const authState = ${JSON.stringify(authState)};
        for (const [key, value] of Object.entries(authState)) {
          localStorage.setItem(key, value);
        }
      })();
    `;
  }

  /**
   * Inject auth state directly into a Playwright page
   *
   * @example
   * ```ts
   * await MockPrivyAuth.injectAuthState(page, {
   *   privyId: "did:privy:test_user",
   * });
   * await page.goto("/dashboard");
   * ```
   */
  static async injectAuthState(
    page: { evaluate: (fn: (authState: Record<string, string>) => void, arg: Record<string, string>) => Promise<void> },
    options: MockPrivyTokenOptions
  ) {
    const { authState } = await this.createAuthState(options);

    await page.evaluate((state: Record<string, string>) => {
      for (const [key, value] of Object.entries(state)) {
        localStorage.setItem(key, value);
      }
    }, authState);
  }
}

/**
 * Test user factory with Privy integration
 *
 * Creates test users with proper Privy IDs and identities
 */
export class TestUserWithPrivy {
  static create(overrides?: { email?: string; username?: string }) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);

    const email = overrides?.email ?? `test_${timestamp}_${random}@example.com`;
    const username = overrides?.username ?? `testuser_${timestamp}_${random}`;

    const { identity, privyId } = createPrivyIdentity(email);

    return {
      email,
      username,
      privyId,
      identity,
      password: "TestPassword123!",
    };
  }

  /**
   * Create a deterministic test user (same input = same output)
   */
  static createDeterministic(email: string, username: string) {
    const { identity, privyId } = createDeterministicPrivyIdentity(email);

    return {
      email,
      username,
      privyId,
      identity,
      password: "TestPassword123!",
    };
  }
}
