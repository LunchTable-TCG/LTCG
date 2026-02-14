/**
 * Phase 2 Test: Story Chapter Completion Race
 *
 * Tests that concurrent chapter completion attempts result in only one
 * successful completion with no duplicate rewards granted.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Story Chapter Completion Race", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should prevent duplicate reward grants on concurrent completion", async () => {
    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "storyuser",
        email: "story@test.com",
        privyId: "privy_story",
        createdAt: Date.now(),
      });
    });

    // Setup: Create player currency
    await t.run(async (ctx) => {
      return await ctx.db.insert("playerCurrency", {
        userId,
        gold: 0,
        gems: 0,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Setup: Create player XP
    await t.run(async (ctx) => {
      return await ctx.db.insert("playerXP", {
        userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Setup: Create card definitions for rewards (3-star win grants 3 rare cards)
    await t.run(async (ctx) => {
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("cardDefinitions", {
          name: `Reward Card ${i}`,
          rarity: "rare",
          archetype: "neutral",
          cardType: "stereotype",
          cost: 3,
          attack: 100,
          defense: 100,
          flavorText: "Test card for story rewards",
          imageUrl: "test.png",
          createdAt: Date.now(),
          isActive: true,
        });
      }
    });

    // Setup: Create story chapter
    await t.run(async (ctx) => {
      return await ctx.db.insert("storyChapters", {
        actNumber: 1,
        chapterNumber: 1,
        title: "Test Chapter",
        description: "A test chapter",
        storyText: "Test story",
        aiOpponentDeckCode: "TEST001",
        aiDifficulty: "medium",
        battleCount: 1,
        baseRewards: { gold: 100, xp: 50 },
        archetypeImageUrl: "test.png",
        createdAt: Date.now(),
      });
    });

    // Setup: Create story progress (in_progress state)
    const progressId = await t.run(async (ctx) => {
      return await ctx.db.insert("storyProgress", {
        userId,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "normal",
        status: "in_progress",
        starsEarned: 0,
        timesAttempted: 1,
        timesCompleted: 0,
      });
    });

    // Setup: Create battle attempt
    const attemptId = await t.run(async (ctx) => {
      return await ctx.db.insert("storyBattleAttempts", {
        userId,
        progressId,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "normal",
        outcome: "won",
        starsEarned: 0,
        finalLP: 0,
        rewardsEarned: { gold: 0, xp: 0 },
        attemptedAt: Date.now(),
      });
    });

    // Execute: Try to complete chapter 3 times concurrently with same attempt
    const results = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_story" })
        .mutation(api.progression.story.completeChapter, {
          attemptId,
          won: true,
          finalLP: 100, // Perfect clear (3 stars)
        }),
      t
        .withIdentity({ subject: "privy_story" })
        .mutation(api.progression.story.completeChapter, {
          attemptId,
          won: true,
          finalLP: 100,
        }),
      t
        .withIdentity({ subject: "privy_story" })
        .mutation(api.progression.story.completeChapter, {
          attemptId,
          won: true,
          finalLP: 100,
        }),
    ]);

    // Verify: Only one succeeded (idempotency check prevents duplicates)
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(2);

    // Verify: Progress is completed with correct stars
    const progress = await t.run(async (ctx) => {
      return await ctx.db.get(progressId);
    });
    expect(progress?.status).toBe("completed");
    expect(progress?.starsEarned).toBe(3);

    // Verify: Rewards granted exactly once
    // Base reward: 100 gold * 1.0 (normal) * 1.3 (1 + 3 * 0.1 star bonus) = 130 gold
    const finalCurrency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });
    expect(finalCurrency?.gold).toBe(130);

    // Verify: Attempt record updated correctly
    const attempt = await t.run(async (ctx) => {
      return await ctx.db.get(attemptId);
    });
    expect(attempt?.outcome).toBe("won");
    expect(attempt?.starsEarned).toBe(3);
  });
});
