/**
 * Tests for economy.ts
 *
 * Tests currency management including:
 * - Currency initialization
 * - Currency adjustments
 * - Transaction history
 * - Promo code redemption
 */

import { describe, it, expect } from "vitest";
import { createTestInstance } from "./test.setup";
import type { TestMutationCtx } from "./test.setup";
import { api, internal } from "./_generated/api";


describe("initializePlayerCurrency", () => {
  it("should create currency record with welcome bonus", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "newplayer",
        email: "new@example.com",
        createdAt: Date.now(),
      });
    });

    await t.mutation(internal.economy.initializePlayerCurrency, {
      userId,
      welcomeBonus: {
        gold: 500,
        gems: 100,
      },
    });

    const currency = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    expect(currency!).toMatchObject({
      gold: 500,
      gems: 100,
      lifetimeGoldEarned: 500,
      lifetimeGemsEarned: 100,
      lifetimeGoldSpent: 0,
      lifetimeGemsSpent: 0,
    });
  });

  it("should not reinitialize if currency already exists", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "existingplayer",
        email: "existing@example.com",
        createdAt: Date.now(),
      });
    });

    // Initialize once
    await t.mutation(internal.economy.initializePlayerCurrency, {
      userId,
      welcomeBonus: { gold: 500, gems: 100 },
    });

    // Try to initialize again
    await t.mutation(internal.economy.initializePlayerCurrency, {
      userId,
      welcomeBonus: { gold: 1000, gems: 200 },
    });

    const currency = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    // Should still have original values
    expect(currency?.gold).toBe(500);
    expect(currency?.gems).toBe(100);
  });
});

describe("adjustPlayerCurrency", () => {
  it("should increase gold correctly", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 100,
        gems: 50,
        lifetimeGoldEarned: 100,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 50,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      return uid;
    });

    await t.mutation(internal.economy.adjustPlayerCurrency, {
      userId,
      goldDelta: 250,
      transactionType: "gift",
      description: "Test reward",
    });

    const currency = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gold).toBe(350); // 100 + 250
    expect(currency?.lifetimeGoldEarned).toBe(350); // 100 + 250
  });

  it("should decrease gold correctly", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "spender",
        email: "spend@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 500,
        gems: 100,
        lifetimeGoldEarned: 500,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      return uid;
    });

    await t.mutation(internal.economy.adjustPlayerCurrency, {
      userId,
      goldDelta: -200,
      transactionType: "purchase",
      description: "Bought pack",
    });

    const currency = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gold).toBe(300); // 500 - 200
    expect(currency?.lifetimeGoldSpent).toBe(200);
  });

  it("should throw error when insufficient gold", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "pooruser",
        email: "poor@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 50,
        gems: 10,
        lifetimeGoldEarned: 50,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 10,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      return uid;
    });

    await expect(
      t.mutation(internal.economy.adjustPlayerCurrency, {
        userId,
        goldDelta: -200,
        transactionType: "purchase",
        description: "Can't afford",
      })
    ).rejects.toThrowError("Insufficient gold");
  });

  it("should adjust both gold and gems simultaneously", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "trader",
        email: "trade@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 1000,
        gems: 200,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 200,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      return uid;
    });

    await t.mutation(internal.economy.adjustPlayerCurrency, {
      userId,
      goldDelta: 500,
      gemsDelta: -100,
      transactionType: "conversion",
      description: "Gems to gold",
    });

    const currency = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gold).toBe(1500);
    expect(currency?.gems).toBe(100);
  });
});

describe("getPlayerBalance", () => {
  it("should return current balance", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 750,
        gems: 150,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 250,
        lifetimeGemsEarned: 200,
        lifetimeGemsSpent: 50,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });
    });

    const balance = await t.query(api.economy.getPlayerBalance, {
      token: "test-token",
    });

    expect(balance!).toMatchObject({
      gold: 750,
      gems: 150,
      lifetimeStats: {
        goldEarned: 1000,
        goldSpent: 250,
        gemsEarned: 200,
        gemsSpent: 50,
      },
    });
  });
});

describe("getTransactionHistory", () => {
  it("should return paginated transaction history", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "historyuser",
        email: "history@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 500,
        gems: 100,
        lifetimeGoldEarned: 500,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "history-token",
        expiresAt: Date.now() + 3600000,
      });

      // Create 25 transactions
      for (let i = 0; i < 25; i++) {
        await ctx.db.insert("currencyTransactions", {
          userId: uid,
          transactionType: "reward",
          currencyType: "gold",
          amount: 10,
          balanceAfter: 500 + (i * 10),
          description: `Transaction ${i}`,
          createdAt: Date.now() + i,
        });
      }

      return uid;
    });

    const page1 = await t.query(api.economy.getTransactionHistory, {
      token: "history-token",
      page: 1,
    });

    expect(page1.transactions.length).toBe(20); // Default page size
    expect(page1.total).toBe(25);
    expect(page1.hasMore).toBe(true);

    const page2 = await t.query(api.economy.getTransactionHistory, {
      token: "history-token",
      page: 2,
    });

    expect(page2.transactions.length).toBe(5);
    expect(page2.hasMore).toBe(false);
  });

  it("should filter by currency type", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "filteruser",
        email: "filter@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 500,
        gems: 100,
        lifetimeGoldEarned: 500,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "filter-token",
        expiresAt: Date.now() + 3600000,
      });

      // Create mixed transactions
      for (let i = 0; i < 10; i++) {
        await ctx.db.insert("currencyTransactions", {
          userId: uid,
          transactionType: "reward",
          currencyType: "gold",
          amount: 10,
          balanceAfter: 500,
          description: "Gold transaction",
          createdAt: Date.now() + i,
        });
      }

      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("currencyTransactions", {
          userId: uid,
          transactionType: "reward",
          currencyType: "gems",
          amount: 5,
          balanceAfter: 100,
          description: "Gem transaction",
          createdAt: Date.now() + i + 10,
        });
      }
    });

    const goldOnly = await t.query(api.economy.getTransactionHistory, {
      token: "filter-token",
      currencyType: "gold",
    });

    expect(goldOnly.transactions.length).toBe(10);
    expect(goldOnly.transactions.every(t => t.currencyType === "gold")).toBe(true);

    const gemsOnly = await t.query(api.economy.getTransactionHistory, {
      token: "filter-token",
      currencyType: "gems",
    });

    expect(gemsOnly.transactions.length).toBe(5);
    expect(gemsOnly.transactions.every(t => t.currencyType === "gems")).toBe(true);
  });
});

describe("redeemPromoCode", () => {
  it("should redeem valid promo code", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "promouser",
        email: "promo@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 100,
        gems: 50,
        lifetimeGoldEarned: 100,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 50,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "promo-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("promoCodes", {
        code: "WELCOME200",
        description: "Welcome bonus",
        rewardType: "gold",
        rewardAmount: 200,
        isActive: true,
        redemptionCount: 0,
        createdAt: Date.now(),
      });
    });

    const result = await t.mutation(api.economy.redeemPromoCode, {
      token: "promo-token",
      code: "WELCOME200",
    });

    expect(result.success).toBe(true);
    expect(result.rewardDescription).toContain("200");

    const balance = await t.query(api.economy.getPlayerBalance, {
      token: "promo-token",
    });

    expect(balance.gold).toBe(300); // 100 + 200
  });

  it("should reject inactive promo code", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("promoCodes", {
        code: "INACTIVE",
        description: "Inactive promo",
        rewardType: "gold",
        rewardAmount: 100,
        isActive: false,
        redemptionCount: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.economy.redeemPromoCode, {
        token: "test-token",
        code: "INACTIVE",
      })
    ).rejects.toThrowError("This promo code is no longer active");
  });

  it("should reject duplicate redemption", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "greedy",
        email: "greedy@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 100,
        gems: 50,
        lifetimeGoldEarned: 100,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 50,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "greedy-token",
        expiresAt: Date.now() + 3600000,
      });

      const promoId = await ctx.db.insert("promoCodes", {
        code: "ONETIME",
        description: "One-time promo",
        rewardType: "gems",
        rewardAmount: 50,
        isActive: true,
        redemptionCount: 0,
        createdAt: Date.now(),
      });

      return uid;
    });

    // Redeem once
    await t.mutation(api.economy.redeemPromoCode, {
      token: "greedy-token",
      code: "ONETIME",
    });

    // Try to redeem again
    await expect(
      t.mutation(api.economy.redeemPromoCode, {
        token: "greedy-token",
        code: "ONETIME",
      })
    ).rejects.toThrowError("You have already redeemed this promo code");
  });

  it("should reject expired promo code", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "lateuser",
        email: "late@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "late-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("promoCodes", {
        code: "EXPIRED",
        description: "Expired promo",
        rewardType: "gold",
        rewardAmount: 100,
        isActive: true,
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        redemptionCount: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.economy.redeemPromoCode, {
        token: "late-token",
        code: "EXPIRED",
      })
    ).rejects.toThrowError("This promo code has expired");
  });

  it("should reject when max redemptions reached", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "toolate",
        email: "toolate@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "toolate-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("promoCodes", {
        code: "LIMITED",
        description: "Limited promo",
        rewardType: "gold",
        rewardAmount: 100,
        isActive: true,
        maxRedemptions: 10,
        redemptionCount: 10, // Already at max
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.economy.redeemPromoCode, {
        token: "toolate-token",
        code: "LIMITED",
      })
    ).rejects.toThrowError("This promo code has reached its redemption limit");
  });
});

describe("redeemPromoCode - Pack Rewards", () => {
  it("should grant cards when redeeming pack promo code", async () => {
    const t = createTestInstance();

    const { userId, token } = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      const token = "test-token";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });

      // Create card definitions for pack opening (all rarities)
      const rarities = ["common", "uncommon", "rare", "epic", "legendary"] as const;
      for (const rarity of rarities) {
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert("cardDefinitions", {
            name: `Test ${rarity} Card ${i}`,
            rarity,
            archetype: "fire",
            cardType: "creature",
            attack: 1,
            defense: 1,
            cost: 1,
            isActive: true,
            createdAt: Date.now(),
          });
        }
      }

      await ctx.db.insert("shopProducts", {
        productId: "BASIC_PACK",
        name: "Basic Pack",
        description: "5 random cards",
        productType: "pack",
        goldPrice: 100,
        isActive: true,
        sortOrder: 1,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        createdAt: Date.now(),
      });

      await ctx.db.insert("promoCodes", {
        code: "FREEPACK",
        description: "Free pack promo",
        rewardType: "pack",
        rewardAmount: 2,
        rewardPackId: "BASIC_PACK",
        isActive: true,
        redemptionCount: 0,
        createdAt: Date.now(),
      });

      return { userId, token };
    });

    const result = await t.mutation(api.economy.redeemPromoCode, {
      token,
      code: "FREEPACK",
    });

    expect(result.success).toBe(true);
    expect(result.cardsReceived).toBeDefined();
    expect(result.cardsReceived).toHaveLength(10);

    const history = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("packOpeningHistory")
        .withIndex("by_user_time", (q: any) => q.eq("userId", userId))
        .collect();
    });
    expect(history).toHaveLength(2);
  });

  it("should throw error for invalid pack ID in promo code", async () => {
    const t = createTestInstance();

    const { token } = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      const token = "test-token";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });

      await ctx.db.insert("promoCodes", {
        code: "BADPACK",
        description: "Invalid pack promo",
        rewardType: "pack",
        rewardAmount: 1,
        rewardPackId: "NONEXISTENT_PACK",
        isActive: true,
        redemptionCount: 0,
        createdAt: Date.now(),
      });

      return { token };
    });

    await expect(
      t.mutation(api.economy.redeemPromoCode, {
        token,
        code: "BADPACK",
      })
    ).rejects.toThrow(/Invalid pack configuration/i);
  });
});
