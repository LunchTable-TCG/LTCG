/**
 * Phase 2 Test: Battle Pass Tier Claim Race
 *
 * Tests that concurrent claims of the same tier result in only one successful
 * claim, preventing duplicate rewards.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Battle Pass Tier Claim Race", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should prevent claiming same tier multiple times", async () => {
    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "bpuser",
        email: "bp@test.com",
        privyId: "privy_bp",
        createdAt: Date.now(),
      });
    });

    // Setup: Create season
    const seasonId = await t.run(async (ctx) => {
      return await ctx.db.insert("seasons", {
        name: "Season 1",
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

    // Setup: Create battle pass season
    const battlePassId = await t.run(async (ctx) => {
      return await ctx.db.insert("battlePassSeasons", {
        seasonId,
        name: "Season 1 Battle Pass",
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

    // Setup: Create tier with free reward
    await t.run(async (ctx) => {
      return await ctx.db.insert("battlePassTiers", {
        battlePassId,
        tier: 5,
        freeReward: {
          type: "gold",
          amount: 100,
        },
        isMilestone: false,
      });
    });

    // Setup: Progress user to tier 5 with enough XP
    const progressId = await t.run(async (ctx) => {
      return await ctx.db.insert("battlePassProgress", {
        userId,
        battlePassId,
        currentXP: 5500, // Tier 5 earned (5500 / 1000 = 5.5)
        currentTier: 5,
        isPremium: false,
        claimedFreeTiers: [0, 1, 2, 3, 4], // Claimed tiers 0-4
        claimedPremiumTiers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Setup: Create player currency for rewards
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

    // Execute: Try to claim tier 5 three times concurrently
    const results = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_bp" })
        .mutation(api.progression.battlePass.claimBattlePassReward, {
          tier: 5,
          track: "free",
        }),
      t
        .withIdentity({ subject: "privy_bp" })
        .mutation(api.progression.battlePass.claimBattlePassReward, {
          tier: 5,
          track: "free",
        }),
      t
        .withIdentity({ subject: "privy_bp" })
        .mutation(api.progression.battlePass.claimBattlePassReward, {
          tier: 5,
          track: "free",
        }),
    ]);

    // Verify: Only one succeeded
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(2);

    // Verify: Tier 5 only claimed once
    const progress = await t.run(async (ctx) => {
      return await ctx.db.get(progressId);
    });
    expect(progress?.claimedFreeTiers).toContain(5);
    expect(progress?.claimedFreeTiers.filter((tier) => tier === 5).length).toBe(1);

    // Verify: Rewards granted exactly once (100 gold)
    const currency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });
    expect(currency?.gold).toBe(100);
  });
});
