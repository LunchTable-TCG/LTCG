/**
 * User Test Fixtures
 * Deterministic test user factories for integration tests
 */

export interface TestUserData {
  email: string;
  username: string;
  password: string;
  name: string;
  gold?: number;
  gems?: number;
  rankedElo?: number;
  xp?: number;
  level?: number;
}

/**
 * Create a unique test user with default values
 * Uses timestamp + random to ensure uniqueness across test runs
 */
export function createTestUser(overrides?: Partial<TestUserData>): TestUserData {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    email: `test_${timestamp}_${random}@example.com`,
    username: `testuser_${timestamp}_${random}`,
    password: "TestPassword123!",
    name: `Test User ${timestamp}`,
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
  return createTestUser({
    username: `admin_${Date.now()}`,
    email: `admin_${Date.now()}@example.com`,
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
