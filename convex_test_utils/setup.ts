/**
 * Test Setup for Convex Tests
 *
 * NOTE: Before running tests, you must generate Convex types:
 *   bunx convex codegen
 *
 * This creates the _generated directory required by convex-test.
 */

import { convexTest } from "convex-test";
import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerShardedCounter } from "@convex-dev/sharded-counter/test";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import schema from "../schema";

export type TestHelper = ReturnType<typeof convexTest>;

// Export context types for use in tests
export type TestMutationCtx = MutationCtx;
export type TestQueryCtx = QueryCtx;
export type TestActionCtx = ActionCtx;

// Export modules for convex-test
// Each module must be a lazy-loading function that returns a Promise
export const modules = {
  matchmaking: () => import("../social/matchmaking"),
  games: () => import("../gameplay/games"),
  auth: () => import("../auth"),
  agents: () => import("../agents"),
  cards: () => import("../core/cards"),
  gameEvents: () => import("../gameplay/gameEvents"),
  globalChat: () => import("../social/globalChat"),
  decks: () => import("../core/decks"),
  economy: () => import("../economy/economy"),
  leaderboards: () => import("../social/leaderboards"),
  marketplace: () => import("../economy/marketplace"),
  shop: () => import("../economy/shop"),
  story: () => import("../progression/story"),
  friends: () => import("../social/friends"),
  seedStarterCards: () => import("../scripts/seedStarterCards"),
  "progression/quests": () => import("../progression/quests"),
  "progression/achievements": () => import("../progression/achievements"),
  "progression/matchHistory": () => import("../progression/matchHistory"),
  "lib/helpers": () => import("../lib/helpers"),
  "lib/validators": () => import("../lib/validators"),
  "lib/xpHelpers": () => import("../lib/xpHelpers"),
  "infrastructure/aggregates": () => import("../infrastructure/aggregates"),
  "infrastructure/shardedCounters": () => import("../infrastructure/shardedCounters"),
  "__mocks__/ratelimiter": () => import("../__mocks__/ratelimiter"),
};

/**
 * Create a test instance with Convex components
 *
 * This function registers:
 * - @convex-dev/aggregate (for leaderboards)
 * - @convex-dev/sharded-counter (for spectator counters)
 *
 * TESTING STRATEGY:
 *
 * 1. **Unit Tests (Vitest)**: Test business logic without components
 *    - Run with: `bun run test`
 *    - Components are registered but may not work without `convex dev` running
 *
 * 2. **Integration Tests**: Test with real components
 *    - Run `convex dev` in a separate terminal
 *    - Components will be fully functional
 *    - Use for testing leaderboard queries, spectator counters, etc.
 *
 * Note: Vitest is required (not Bun test runner) because component helpers
 * use import.meta.glob() which is Vite-specific.
 *
 * Note: @convex-dev/ratelimiter does not export a /test helper.
 * Rate limiting is tested via integration tests in deployed environment.
 */
export function createTestInstance(): TestHelper {
  const t = convexTest(schema, modules);

  // Component registration - works with Vitest but may require `convex dev` for full functionality
  try {
    registerAggregate(t);
    registerShardedCounter(t);
  } catch (error) {
    console.warn(
      "Component registration failed - this is expected without `convex dev` running.",
      error
    );
  }

  return t;
}

// Mock rate limiter for tests (rate limiter component not available in test env)
export const mockRateLimiter = {
  checkRateLimit: async () => ({ allowed: true, retryAfter: null }),
  recordAction: async () => {},
  reset: async () => {},
};
