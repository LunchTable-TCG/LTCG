/**
 * Phase 2 Test: Achievement Progress Race
 *
 * Tests that concurrent progress updates for the same achievement result in
 * correct final progress with no lost updates.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { internal } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Achievement Progress Race", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should not lose progress in concurrent updates", async () => {
    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "achuser",
        email: "ach@test.com",
        privyId: "privy_ach",
        createdAt: Date.now(),
      });
    });

    // Setup: Create achievement definition
    await t.run(async (ctx) => {
      return await ctx.db.insert("achievementDefinitions", {
        achievementId: "win_10_games",
        name: "Novice Winner",
        description: "Win 10 games",
        category: "wins",
        rarity: "common",
        icon: "trophy",
        requirementType: "win_count",
        targetValue: 10,
        rewards: { gold: 100, xp: 50 },
        isSecret: false,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Setup: User at 7/10 progress
    const progressId = await t.run(async (ctx) => {
      return await ctx.db.insert("userAchievements", {
        userId,
        achievementId: "win_10_games",
        currentProgress: 7,
        isUnlocked: false,
      });
    });

    // Setup: Create player currency for rewards (if achievement unlocks)
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

    // Execute: Three concurrent game wins (should add 3 progress)
    await Promise.all([
      t.mutation(internal.progression.achievements.updateAchievementProgress, {
        userId,
        event: { type: "win_count", value: 1 },
      }),
      t.mutation(internal.progression.achievements.updateAchievementProgress, {
        userId,
        event: { type: "win_count", value: 1 },
      }),
      t.mutation(internal.progression.achievements.updateAchievementProgress, {
        userId,
        event: { type: "win_count", value: 1 },
      }),
    ]);

    // Verify: Progress is exactly 10 (7 + 3)
    const progress = await t.run(async (ctx) => {
      return await ctx.db.get(progressId);
    });
    expect(progress?.currentProgress).toBe(10);

    // Verify: Achievement is unlocked
    expect(progress?.isUnlocked).toBe(true);

    // Verify: Rewards granted (100 gold)
    const currency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });
    expect(currency?.gold).toBe(100);
  });
});
