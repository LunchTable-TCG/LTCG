/**
 * Phase 2 Test: Inbox Reward Claim Race
 *
 * Tests that concurrent reward claim attempts result in only one successful
 * claim, preventing duplicate reward grants.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Inbox Reward Claim Race", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should prevent duplicate reward claims", async () => {
    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "claimuser",
        email: "claim@test.com",
        privyId: "privy_claimer",
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

    // Setup: Create unclaimed reward message (100 gold)
    const messageId = await t.run(async (ctx) => {
      return await ctx.db.insert("userInbox", {
        userId,
        type: "reward",
        title: "Daily Reward",
        message: "Here's your daily gold!",
        data: {
          rewardType: "gold",
          gold: 100,
        },
        isRead: false,
        createdAt: Date.now(),
      });
    });

    // Execute: Try to claim reward 3 times concurrently
    const results = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_claimer" })
        .mutation(api.social.inbox.claimReward, { messageId }),
      t
        .withIdentity({ subject: "privy_claimer" })
        .mutation(api.social.inbox.claimReward, { messageId }),
      t
        .withIdentity({ subject: "privy_claimer" })
        .mutation(api.social.inbox.claimReward, { messageId }),
    ]);

    // Verify: Only one succeeded
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(2);

    // Verify: Message is marked as claimed
    const message = await t.run(async (ctx) => {
      return await ctx.db.get(messageId);
    });
    expect(message?.claimedAt).toBeDefined();

    // Verify: User received exactly 100 gold (not 300)
    const currency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });
    expect(currency?.gold).toBe(100);
  });
});
