/**
 * Test Setup for Convex Tests
 *
 * NOTE: Before running tests, you must generate Convex types:
 *   bunx convex codegen
 *
 * This creates the _generated directory required by convex-test.
 */

import { convexTest } from "convex-test";
import type { MutationCtx, QueryCtx, ActionCtx } from "./_generated/server";
import schema from "./schema";

export type TestHelper = ReturnType<typeof convexTest>;

// Export context types for use in tests
export type TestMutationCtx = MutationCtx;
export type TestQueryCtx = QueryCtx;
export type TestActionCtx = ActionCtx;

// Export modules for convex-test
// Each module must be a lazy-loading function that returns a Promise
export const modules = {
  matchmaking: () => import("./matchmaking"),
  games: () => import("./games"),
  auth: () => import("./auth"),
  cards: () => import("./cards"),
  gameEvents: () => import("./gameEvents"),
  globalChat: () => import("./globalChat"),
  decks: () => import("./decks"),
  economy: () => import("./economy"),
  leaderboards: () => import("./leaderboards"),
  marketplace: () => import("./marketplace"),
  shop: () => import("./shop"),
  story: () => import("./story"),
  friends: () => import("./friends"),
  seedStarterCards: () => import("./seedStarterCards"),
  "lib/helpers": () => import("./lib/helpers"),
  "lib/validators": () => import("./lib/validators"),
  "lib/xpHelpers": () => import("./lib/xpHelpers"),
  "_generated/api": () => import("./_generated/api"),
  "_generated/dataModel": () => import("./_generated/dataModel"),
  "_generated/server": () => import("./_generated/server"),
  "__mocks__/ratelimiter": () => import("./__mocks__/ratelimiter"),
};

/**
 * Create a test instance with all Convex components properly registered
 *
 * This function registers:
 * - @convex-dev/aggregate (for leaderboards)
 * - @convex-dev/sharded-counter (for counters)
 *
 * Note: Component registration currently has compatibility issues with Bun's test runner.
 * The official @convex-dev component /test helpers use import.meta.glob which is
 * Vite-specific and not supported in Bun. Tests that depend on these components
 * (e.g., leaderboards using aggregate) should be skipped until this is resolved.
 *
 * Note: @convex-dev/ratelimiter does not export a /test helper as of v0.1.7.
 * Rate limiting is tested via integration tests in deployed environment.
 */
export function createTestInstance(): TestHelper {
  const t = convexTest(schema, modules) as TestHelper;

  // TODO: Register components when Bun compatibility is resolved
  // The official test helpers use import.meta.glob() which doesn't work in Bun:
  // - import { register as registerAggregate } from "@convex-dev/aggregate/test";
  // - import { register as registerShardedCounter } from "@convex-dev/sharded-counter/test";
  //
  // Workaround options:
  // 1. Use Vitest instead of Bun for tests (has import.meta.glob support)
  // 2. Manually implement component registration with Bun.Glob (complex)
  // 3. Skip tests that require components (current approach)

  return t;
}

// Mock rate limiter for tests (rate limiter component not available in test env)
export const mockRateLimiter = {
  checkRateLimit: async () => ({ allowed: true, retryAfter: null }),
  recordAction: async () => {},
  reset: async () => {},
};
