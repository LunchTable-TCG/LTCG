/**
 * User Test Fixtures
 * Deterministic test user factories for integration tests
 *
 * Uses Privy-compatible identity format following:
 * https://docs.privy.io/recipes/mock-jwt
 */

import { createDeterministicPrivyIdentity, createPrivyIdentity } from "../helpers/mockPrivyJwt";

export interface TestUserData {
  email: string;
  username: string;
  password: string;
  name: string;
  privyId: string;
  identity: {
    subject: string;
    issuer: string;
    tokenIdentifier: string;
    email: string;
  };
  gold?: number;
  gems?: number;
  rankedElo?: number;
  xp?: number;
  level?: number;
}

/**
 * Create a unique test user with default values and Privy identity
 * Uses timestamp + random to ensure uniqueness across test runs
 *
 * @example
 * ```ts
 * const user = createTestUser();
 * const asUser = t.withIdentity(user.identity);
 * ```
 */
export function createTestUser(overrides?: Partial<TestUserData>): TestUserData {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  const email = overrides?.email ?? `test_${timestamp}_${random}@example.com`;
  const { identity, privyId } = createPrivyIdentity(email);

  return {
    email,
    username: overrides?.username ?? `testuser_${timestamp}_${random}`,
    password: "TestPassword123!",
    name: overrides?.name ?? `Test User ${timestamp}`,
    privyId,
    identity,
    gold: 1000,
    gems: 0,
    rankedElo: 1000,
    xp: 0,
    level: 1,
    ...overrides,
  };
}

/**
 * Create multiple test users at once
 */
export function createTestUsers(count: number): TestUserData[] {
  return Array.from({ length: count }, () => createTestUser());
}

/**
 * Create a test admin user with elevated privileges
 */
export function createTestAdmin(): TestUserData {
  const timestamp = Date.now();
  return createTestUser({
    username: `admin_${timestamp}`,
    email: `admin_${timestamp}@example.com`,
  });
}

/**
 * Create a test user with specific rating (for matchmaking tests)
 */
export function createTestUserWithRating(rating: number): TestUserData {
  return createTestUser({
    rankedElo: rating,
  });
}

/**
 * Create a test user with specific gold balance
 */
export function createTestUserWithGold(gold: number): TestUserData {
  return createTestUser({
    gold,
  });
}

/**
 * Create a poor test user (low resources)
 */
export function createPoorTestUser(): TestUserData {
  return createTestUser({
    gold: 50,
    gems: 0,
  });
}

/**
 * Create a rich test user (high resources)
 */
export function createRichTestUser(): TestUserData {
  return createTestUser({
    gold: 100000,
    gems: 10000,
  });
}

/**
 * Create a deterministic test user (same input = same output)
 * Useful for consistent test data across runs
 *
 * @example
 * ```ts
 * const alice = createDeterministicTestUser("alice@test.com", "alice");
 * // alice.privyId will always be the same
 * ```
 */
export function createDeterministicTestUser(
  email: string,
  username: string,
  overrides?: Partial<TestUserData>
): TestUserData {
  const { identity, privyId } = createDeterministicPrivyIdentity(email);

  return {
    email,
    username,
    password: "TestPassword123!",
    name: username,
    privyId,
    identity,
    gold: 1000,
    gems: 0,
    rankedElo: 1000,
    xp: 0,
    level: 1,
    ...overrides,
  };
}
