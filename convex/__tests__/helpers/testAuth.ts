/**
 * Convex Test Authentication Helpers
 *
 * Provides utilities for creating authenticated test users in Convex tests.
 * Follows Privy's JWT format: https://docs.privy.io/recipes/mock-jwt
 *
 * Usage:
 * ```ts
 * import { createAuthenticatedUser, getTestIdentity } from "../helpers/testAuth";
 *
 * const t = convexTest(schema, modules);
 * const { userId, privyId, identity } = await createAuthenticatedUser(t, {
 *   email: "test@example.com",
 *   username: "testuser",
 * });
 * const asUser = t.withIdentity(identity);
 * ```
 */

import {
  createDeterministicPrivyIdentity,
  createPrivyIdentity,
} from "../../../tests/helpers/mockPrivyJwt";
import type { MutationCtx } from "../../_generated/server";

// Type for the test instance - using any to avoid complex convex-test generic type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestInstance = any;

/**
 * Options for creating an authenticated test user
 */
export interface CreateAuthenticatedUserOptions {
  email: string;
  username: string;
  /** Use deterministic ID (same email = same privyId across runs) */
  deterministic?: boolean;
  /** Additional user data */
  userData?: {
    name?: string;
    gold?: number;
    rankedElo?: number;
    xp?: number;
    level?: number;
  };
}

/**
 * Result from creating an authenticated user
 */
export interface AuthenticatedUser {
  /** Convex user ID */
  userId: string;
  /** Privy DID (did:privy:xxx) */
  privyId: string;
  /** Identity object for withIdentity() */
  identity: {
    subject: string;
    issuer: string;
    tokenIdentifier: string;
    email: string;
  };
}

/**
 * Create an authenticated test user in the database
 *
 * This creates both:
 * 1. A user record in the Convex database
 * 2. A properly formatted identity for withIdentity()
 *
 * @example
 * ```ts
 * const t = convexTest(schema, modules);
 * const { userId, privyId, identity } = await createAuthenticatedUser(t, {
 *   email: "test@example.com",
 *   username: "testuser",
 * });
 *
 * const asUser = t.withIdentity(identity);
 * const result = await asUser.mutation(api.myMutation, { ... });
 * ```
 */
export async function createAuthenticatedUser(
  t: TestInstance,
  options: CreateAuthenticatedUserOptions
): Promise<AuthenticatedUser> {
  const { email, username, deterministic = false, userData = {} } = options;

  // Create Privy identity
  const { identity, privyId } = deterministic
    ? createDeterministicPrivyIdentity(email)
    : createPrivyIdentity(email);

  // Insert user into database
  const userId = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("users", {
      email,
      username,
      privyId,
      name: userData.name ?? username,
      gold: userData.gold ?? 1000,
      rankedElo: userData.rankedElo ?? 1000,
      xp: userData.xp ?? 0,
      level: userData.level ?? 1,
      createdAt: Date.now(),
    });
  });

  return {
    userId: userId as string,
    privyId,
    identity,
  };
}

/**
 * Get a Privy-compatible identity without creating a database user
 *
 * Useful when you want to test unauthenticated behavior or
 * create the user manually with specific data.
 *
 * @example
 * ```ts
 * const { identity, privyId } = getTestIdentity("test@example.com");
 * const asUser = t.withIdentity(identity);
 *
 * // This should fail - user doesn't exist in DB
 * await expect(asUser.query(api.getUser, {})).rejects.toThrow();
 * ```
 */
export function getTestIdentity(email: string, deterministic = false) {
  return deterministic ? createDeterministicPrivyIdentity(email) : createPrivyIdentity(email);
}

/**
 * Create multiple authenticated test users
 *
 * @example
 * ```ts
 * const users = await createAuthenticatedUsers(t, [
 *   { email: "alice@test.com", username: "alice" },
 *   { email: "bob@test.com", username: "bob" },
 * ]);
 * ```
 */
export async function createAuthenticatedUsers(
  t: TestInstance,
  options: CreateAuthenticatedUserOptions[]
): Promise<AuthenticatedUser[]> {
  const users: AuthenticatedUser[] = [];
  for (const opt of options) {
    const user = await createAuthenticatedUser(t, opt);
    users.push(user);
  }
  return users;
}

/**
 * Create a test user with specific gold balance
 */
export async function createUserWithGold(
  t: TestInstance,
  email: string,
  username: string,
  gold: number
): Promise<AuthenticatedUser> {
  return createAuthenticatedUser(t, {
    email,
    username,
    userData: { gold },
  });
}

/**
 * Create a test user with specific ELO rating
 */
export async function createUserWithRating(
  t: TestInstance,
  email: string,
  username: string,
  rankedElo: number
): Promise<AuthenticatedUser> {
  return createAuthenticatedUser(t, {
    email,
    username,
    userData: { rankedElo },
  });
}
