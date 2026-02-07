/**
 * Phase 2 Test: Battle Pass XP Tier Overflow Race
 *
 * Tests that concurrent XP gains crossing tier boundaries result in correct
 * final XP and tier calculation, with no XP lost.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { internal } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Battle Pass XP Tier Overflow", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should handle concurrent XP gains crossing tier boundary", async () => {
    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "xpuser",
        email: "xp@test.com",
        privyId: "privy_xp",
        createdAt: Date.now(),
      });
    });

    // Setup: Create season
    const seasonId = await t.run(async (ctx) => {
      return await ctx.db.insert("seasons", {
        name: "Season XP",
        number: 1,
        status: "active",
        startDate: Date.now() - 86400000,
        endDate: Date.now() + 86400000 * 30,
        rankResetType: "soft",
        softResetPercentage: 75,
        rewards: [],
        createdAt: Date.now(),
        createdBy: userId,
        updatedAt: Date.now(),
      });
    });

    // Setup: Create battle pass
    const battlePassId = await t.run(async (ctx) => {
      return await ctx.db.insert("battlePassSeasons", {
        seasonId,
        name: "Season XP Battle Pass",
        status: "active",
        xpPerTier: 1000,
        totalTiers: 50,
        startDate: Date.now() - 86400000,
        endDate: Date.now() + 86400000 * 30,
        createdAt: Date.now(),
        createdBy: userId,
        updatedAt: Date.now(),
      });
    });

    // Setup: User at 950 XP (50 away from tier 1)
    const progressId = await t.run(async (ctx) => {
      return await ctx.db.insert("battlePassProgress", {
        userId,
        battlePassId,
        currentXP: 950, // 50 away from tier 1
        currentTier: 0,
        isPremium: false,
        claimedFreeTiers: [],
        claimedPremiumTiers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Execute: Grant 100 XP three times concurrently (total 300 XP)
    await Promise.all([
      t.mutation(internal.progression.battlePass.addBattlePassXP, {
        userId,
        xpAmount: 100,
        source: "test_concurrent_1",
      }),
      t.mutation(internal.progression.battlePass.addBattlePassXP, {
        userId,
        xpAmount: 100,
        source: "test_concurrent_2",
      }),
      t.mutation(internal.progression.battlePass.addBattlePassXP, {
        userId,
        xpAmount: 100,
        source: "test_concurrent_3",
      }),
    ]);

    // Verify: Final XP is correct (950 + 300 = 1250)
    const progress = await t.run(async (ctx) => {
      return await ctx.db.get(progressId);
    });
    expect(progress?.currentXP).toBe(1250);

    // Verify: Tier calculated correctly (1250 / 1000 = tier 1)
    expect(progress?.currentTier).toBe(1);
  });
});
