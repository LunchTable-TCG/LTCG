/**
 * Shared Convex Test Utilities
 * Helper functions for integration tests with real Convex backend
 */

import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

/**
 * Module discovery for convex-test
 * IMPORTANT: import.meta.glob MUST be at module level (not inside a function)
 * This is required for convex-test to discover and load Convex functions
 */
const modules = import.meta.glob("../convex/**/*.ts");

/**
 * Create a test instance for Convex tests
 * This is a synchronous wrapper around convexTest
 */
export function createTestInstance() {
  return convexTest(schema, modules);
}

/**
 * Create a test context with Convex testing helper (async version)
 */
export async function createTestContext() {
  return convexTest(schema, modules);
}

/**
 * Cleanup test context after test completes
 */
export async function cleanupTestContext(_helper: TestConvex<typeof schema>) {
  // convex-test handles cleanup automatically
}

/**
 * Wait for condition with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}

/**
 * Helper to insert test user and return userId
 */
export async function insertTestUser(
  helper: TestConvex<typeof schema>,
  userData: {
    email: string;
    username: string;
    name?: string;
    gold?: number;
    rankedElo?: number;
  }
): Promise<Id<"users">> {
  // @ts-ignore - Inline mutation for testing
  const userId = await helper.mutation(async (ctx: any) => {
    return await ctx.db.insert("users", {
      email: userData.email,
      username: userData.username,
      name: userData.name ?? userData.username,
      gold: userData.gold ?? 1000,
      rankedElo: userData.rankedElo ?? 1000,
      casualRating: 1000,
      totalWins: 0,
      totalLosses: 0,
      xp: 0,
      level: 1,
      createdAt: Date.now(),
    });
  });
  return userId;
}

/**
 * Helper to create test session for user (simulates authentication)
 */
export async function createTestSession(
  helper: TestConvex<typeof schema>,
  userId: Id<"users">
): Promise<Id<"authSessions">> {
  // @ts-ignore - Inline mutation for testing
  const sessionId = await helper.mutation(async (ctx: any) => {
    return await ctx.db.insert("authSessions", {
      userId,
      sessionToken: `test_session_${Date.now()}`,
      expirationTime: Date.now() + 86400000, // 24 hours
    });
  });
  return sessionId;
}

/**
 * Helper to clean up test data (delete user and related records)
 */
export async function deleteTestUser(
  helper: TestConvex<typeof schema>,
  userId: Id<"users">
): Promise<void> {
  // @ts-ignore - Inline mutation for testing
  await helper.mutation(async (ctx: any) => {
    // Delete sessions
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q: { eq: (field: string, value: unknown) => unknown }) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete decks
    const decks = await ctx.db
      .query("userDecks")
      .withIndex("by_user", (q: { eq: (field: string, value: unknown) => unknown }) => q.eq("userId", userId))
      .collect();
    for (const deck of decks) {
      // Delete deck cards
      const deckCards = await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q: { eq: (field: string, value: unknown) => unknown }) => q.eq("deckId", deck._id))
        .collect();
      for (const card of deckCards) {
        await ctx.db.delete(card._id);
      }
      await ctx.db.delete(deck._id);
    }

    // Delete user
    await ctx.db.delete(userId);
  });
}
