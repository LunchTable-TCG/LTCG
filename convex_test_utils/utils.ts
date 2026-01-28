/**
 * Typed Test Utilities
 *
 * Provides properly typed helper functions for convex-test
 * to eliminate `any` types in test files.
 *
 * NOTE: convex-test's t.run() callbacks may still show implicit any warnings.
 * This is a known limitation of convex-test's type inference with strict TypeScript.
 * The database operations themselves are fully typed once inside the callback.
 *
 * You can suppress these warnings in test files by adding:
 * // @ts-nocheck
 * at the top of the test file, or by explicitly typing callbacks:
 * t.run(async (ctx: MutationCtx) => { ... })
 */

// @ts-nocheck - convex-test callback typing limitation
import type { ConvexTestingHelper } from "convex-test";
import type { Id } from "../_generated/dataModel";
import type { DataModel } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Type-safe wrapper for convex-test instance
 */
export type TestHelper = ConvexTestingHelper<DataModel>;

/**
 * Type-safe wrapper for database mutation context
 * Use this to explicitly type t.run() callbacks:
 * await t.run(async (ctx: TestMutationCtx) => { ... })
 */
export type TestMutationCtx = MutationCtx;

/**
 * Type-safe wrapper for database query context
 */
export type TestQueryCtx = QueryCtx;

/**
 * Test user data structure
 * Note: token removed - using Convex Auth session management
 */
export interface TestUser {
  userId: Id<"users">;
  username: string;
}

/**
 * Create a test user with currency
 *
 * @param t - ConvexTest instance
 * @param username - Username for the test user
 * @returns User ID and username
 */
export async function createTestUser(t: TestHelper, username = "testplayer"): Promise<TestUser> {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      username,
      email: `${username}@example.com`,
      name: username,
      rankedElo: 1000,
      casualRating: 1000,
      totalWins: 0,
      totalLosses: 0,
      createdAt: Date.now(),
    });
  });

  // Token-based auth removed - using Convex Auth instead
  // Sessions are managed automatically by Convex Auth via authSessions table

  await t.run(async (ctx) => {
    await ctx.db.insert("playerCurrency", {
      userId,
      gold: 1000,
      gems: 100,
      lifetimeGoldEarned: 1000,
      lifetimeGoldSpent: 0,
      lifetimeGemsEarned: 100,
      lifetimeGemsSpent: 0,
      lastUpdatedAt: Date.now(),
    });
  });

  return { userId, username };
}

/**
 * Create a test card definition
 *
 * @param t - ConvexTest instance
 * @param overrides - Optional field overrides
 * @returns Card definition ID
 */
export async function createTestCard(
  t: TestHelper,
  overrides: Partial<{
    name: string;
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    archetype: string;
    cardType: "creature" | "spell" | "enchantment" | "artifact";
    attack: number;
    defense: number;
    cost: number;
  }> = {}
): Promise<Id<"cardDefinitions">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("cardDefinitions", {
      name: overrides.name || "Test Card",
      rarity: overrides.rarity || "common",
      archetype: overrides.archetype || "fire",
      cardType: overrides.cardType || "creature",
      attack: overrides.attack ?? 3,
      defense: overrides.defense ?? 3,
      cost: overrides.cost ?? 2,
      imageUrl: "test.jpg",
      isActive: true,
      createdAt: Date.now(),
    });
  });
}

/**
 * Initialize player XP record
 *
 * @param t - ConvexTest instance
 * @param userId - User ID
 * @param initialXP - Starting XP (default: 0)
 * @param initialLevel - Starting level (default: 1)
 */
export async function initializePlayerXP(
  t: TestHelper,
  userId: Id<"users">,
  initialXP = 0,
  initialLevel = 1
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("playerXP", {
      userId,
      currentXP: initialXP,
      currentLevel: initialLevel,
      lifetimeXP: initialXP,
      lastUpdatedAt: Date.now(),
    });
  });
}

/**
 * Initialize story chapter for testing
 *
 * @param t - ConvexTest instance
 * @param actNumber - Act number
 * @param chapterNumber - Chapter number
 */
export async function createTestChapter(
  t: TestHelper,
  actNumber = 1,
  chapterNumber = 1
): Promise<Id<"storyChapters">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("storyChapters", {
      actNumber,
      chapterNumber,
      title: `Test Chapter ${actNumber}-${chapterNumber}`,
      description: "Test description",
      archetype: "infernal_dragons",
      archetypeImageUrl: "/test.png",
      difficulties: ["normal", "hard", "legendary"],
      createdAt: Date.now(),
    });
  });
}

/**
 * Create player card inventory entry
 *
 * @param t - ConvexTest instance
 * @param userId - User ID
 * @param cardDefId - Card definition ID
 * @param quantity - Number of cards
 */
export async function givePlayerCard(
  t: TestHelper,
  userId: Id<"users">,
  cardDefId: Id<"cardDefinitions">,
  quantity = 1
): Promise<void> {
  await t.run(async (ctx) => {
    const existing = await ctx.db
      .query("playerCards")
      .withIndex("by_user_card", (q) => q.eq("userId", userId).eq("cardDefinitionId", cardDefId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + quantity,
      });
    } else {
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardDefId,
        quantity,
        acquiredAt: Date.now(),
      });
    }
  });
}

/**
 * Get player's current currency balance
 *
 * @param t - ConvexTest instance
 * @param userId - User ID
 * @returns Currency record or null
 */
export async function getPlayerCurrency(t: TestHelper, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  });
}

/**
 * Get player's XP record
 *
 * @param t - ConvexTest instance
 * @param userId - User ID
 * @returns XP record or null
 */
export async function getPlayerXP(t: TestHelper, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  });
}

/**
 * Get player's badges
 *
 * @param t - ConvexTest instance
 * @param userId - User ID
 * @returns Array of badge records
 */
export async function getPlayerBadges(t: TestHelper, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("playerBadges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  });
}

/**
 * Get player's story progress for a chapter
 *
 * @param t - ConvexTest instance
 * @param userId - User ID
 * @param chapterId - Chapter ID
 * @returns Array of progress records
 */
export async function getStoryProgress(
  t: TestHelper,
  userId: Id<"users">,
  chapterId: Id<"storyChapters">
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("storyProgress")
      .withIndex("by_user_chapter", (q) => q.eq("userId", userId).eq("chapterId", chapterId))
      .collect();
  });
}

/**
 * Set player currency directly (for testing)
 *
 * @param t - ConvexTest instance
 * @param userId - User ID
 * @param gold - Gold amount
 * @param gems - Gems amount
 */
export async function setPlayerCurrency(
  t: TestHelper,
  userId: Id<"users">,
  gold: number,
  gems: number
): Promise<void> {
  await t.run(async (ctx) => {
    const existing = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        gold,
        gems,
        lastUpdatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold,
        gems,
        lifetimeGoldEarned: gold,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: gems,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    }
  });
}

/**
 * Seed basic card definitions for story mode testing
 * Creates common, rare, and epic cards for the infernal_dragons archetype
 *
 * @param t - ConvexTest instance
 * @returns Object with created card IDs
 */
export async function seedStoryCards(t: TestHelper): Promise<{
  commonCards: Id<"cardDefinitions">[];
  rareCards: Id<"cardDefinitions">[];
  epicCards: Id<"cardDefinitions">[];
}> {
  const commonCards: Id<"cardDefinitions">[] = [];
  const rareCards: Id<"cardDefinitions">[] = [];
  const epicCards: Id<"cardDefinitions">[] = [];

  await t.run(async (ctx) => {
    // Create 3 common cards
    for (let i = 1; i <= 3; i++) {
      const id = await ctx.db.insert("cardDefinitions", {
        name: `Common Dragon ${i}`,
        rarity: "common",
        archetype: "fire", // Use valid archetype from schema
        cardType: "creature",
        attack: 2 + i,
        defense: 2 + i,
        cost: 2,
        imageUrl: "test.jpg",
        isActive: true,
        createdAt: Date.now(),
      });
      commonCards.push(id);
    }

    // Create 2 rare cards
    for (let i = 1; i <= 2; i++) {
      const id = await ctx.db.insert("cardDefinitions", {
        name: `Rare Dragon ${i}`,
        rarity: "rare",
        archetype: "fire", // Use valid archetype from schema
        cardType: "creature",
        attack: 4 + i,
        defense: 4 + i,
        cost: 4,
        imageUrl: "test.jpg",
        isActive: true,
        createdAt: Date.now(),
      });
      rareCards.push(id);
    }

    // Create 1 epic card
    const epicId = await ctx.db.insert("cardDefinitions", {
      name: "Epic Dragon Lord",
      rarity: "epic",
      archetype: "fire", // Use valid archetype from schema
      cardType: "creature",
      attack: 7,
      defense: 7,
      cost: 6,
      imageUrl: "test.jpg",
      isActive: true,
      createdAt: Date.now(),
    });
    epicCards.push(epicId);
  });

  return { commonCards, rareCards, epicCards };
}
