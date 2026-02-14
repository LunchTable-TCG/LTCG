/**
 * Shop System Tests
 *
 * Tests pack purchasing, currency validation, and pack opening mechanics.
 * Covers happy paths, insufficient funds, invalid products, and edge cases.
 */

import { api } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// Type helper to avoid TS2589/TS7053 deep instantiation errors
// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const economyShop: any = (api as any)["economy/shop"];

// Helper to create test instance
const createTestInstance = () => convexTest(schema, modules);

// Helper to create user with privyId for authentication
async function createTestUser(
  t: ReturnType<typeof createTestInstance>,
  email: string,
  username: string
) {
  const privyId = `did:privy:test_${email.replace(/[^a-z0-9]/gi, "_")}`;
  const userId = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("users", {
      email,
      username,
      privyId,
      createdAt: Date.now(),
    });
  });
  return { userId, privyId };
}

describe("purchasePack", () => {
  it("should purchase pack with gold successfully", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "shop@test.com", "shoptest");

    const asUser = t.withIdentity({ subject: privyId });

    // Create player currency
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create cards for all rarities that might be pulled
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("cardDefinitions", {
        name: "Common Card",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 2,
        attack: 1000,
        defense: 800,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Uncommon Card",
        rarity: "uncommon",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 3,
        attack: 1500,
        defense: 1200,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Rare Card",
        rarity: "rare",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 4,
        attack: 2000,
        defense: 1500,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Epic Card",
        rarity: "epic",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 5,
        attack: 2500,
        defense: 2000,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Legendary Card",
        rarity: "legendary",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 7,
        attack: 3000,
        defense: 2500,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Create shop product
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "basic_pack_1",
        name: "Basic Pack",
        description: "5 random cards",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.mutation(economyShop.purchasePack, {
      productId: "basic_pack_1",
      useGems: false,
    });

    expect(result.success).toBe(true);
    expect(result.cardsReceived).toHaveLength(5);
    expect(result.currencyUsed).toBe("gold");
    expect(result.amountPaid).toBe(1000);

    // Verify currency was deducted
    const currency = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gold).toBe(4000); // 5000 - 1000
  });

  it("should purchase pack with gems successfully", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "gem@test.com", "gemtest");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 200,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create cards for all rarities that might be pulled
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("cardDefinitions", {
        name: "Common Card",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 2,
        attack: 1000,
        defense: 800,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Uncommon Card",
        rarity: "uncommon",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 3,
        attack: 1500,
        defense: 1200,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Rare Card",
        rarity: "rare",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 4,
        attack: 2000,
        defense: 1500,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Epic Card",
        rarity: "epic",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 5,
        attack: 2500,
        defense: 2000,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Legendary Card",
        rarity: "legendary",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 7,
        attack: 3000,
        defense: 2500,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "premium_pack_1",
        name: "Premium Pack",
        description: "5 cards with higher rarity",
        productType: "pack",
        goldPrice: 2000,
        gemPrice: 100,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "rare",
        },
        isActive: true,
        sortOrder: 2,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.mutation(economyShop.purchasePack, {
      productId: "premium_pack_1",
      useGems: true,
    });

    expect(result.success).toBe(true);
    expect(result.currencyUsed).toBe("gems");
    expect(result.amountPaid).toBe(100);

    const currency = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gems).toBe(100); // 200 - 100
  });

  it("should throw error for insufficient gold", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "poor@test.com", "poortest");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 500, // Not enough
        gems: 10,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "expensive_pack",
        name: "Expensive Pack",
        description: "Costs 1000 gold",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(economyShop.purchasePack, {
        productId: "expensive_pack",
        useGems: false,
      })
    ).rejects.toThrowError(/Insufficient gold/);
  });

  it("should throw error for insufficient gems", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "nogems@test.com", "nogems");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 25, // Not enough
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "gem_pack",
        name: "Gem Pack",
        description: "Costs 50 gems",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(economyShop.purchasePack, {
        productId: "gem_pack",
        useGems: true,
      })
    ).rejects.toThrowError(/Insufficient gems/);
  });

  it("should throw error for inactive product", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "inactive@test.com", "inactivetest");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "disabled_pack",
        name: "Disabled Pack",
        description: "No longer available",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        isActive: false, // Inactive
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(economyShop.purchasePack, {
        productId: "disabled_pack",
        useGems: false,
      })
    ).rejects.toThrowError(/Product not found/);
  });

  it("should throw error for non-existent product", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "notfound@test.com", "notfoundtest");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(economyShop.purchasePack, {
        productId: "nonexistent_pack",
        useGems: false,
      })
    ).rejects.toThrowError(/Product not found/);
  });

  it("should throw error for wrong product type", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "wrongtype@test.com", "wrongtype");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "currency_bundle",
        name: "Gold Bundle",
        description: "Buy gold with gems",
        productType: "currency",
        gemPrice: 50,
        currencyConfig: {
          currencyType: "gold",
          amount: 5000,
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(economyShop.purchasePack, {
        productId: "currency_bundle",
        useGems: true,
      })
    ).rejects.toThrowError(/This endpoint is only for pack purchases/);
  });

  it("should record pack opening history", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "history@test.com", "historytest");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create cards for all rarities that might be pulled
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("cardDefinitions", {
        name: "Common Card",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 2,
        attack: 1000,
        defense: 800,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Uncommon Card",
        rarity: "uncommon",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 3,
        attack: 1500,
        defense: 1200,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Rare Card",
        rarity: "rare",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 4,
        attack: 2000,
        defense: 1500,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Epic Card",
        rarity: "epic",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 5,
        attack: 2500,
        defense: 2000,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Legendary Card",
        rarity: "legendary",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 7,
        attack: 3000,
        defense: 2500,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "history_pack",
        name: "History Pack",
        description: "Test pack for history",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 3,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(economyShop.purchasePack, {
      productId: "history_pack",
      useGems: false,
    });

    const history = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db
        .query("packOpeningHistory")
        .withIndex("by_user_time", (q) => q.eq("userId", userId))
        .collect();
    });

    expect(history).toHaveLength(1);
    expect(history[0]?.productId).toBe("history_pack");
    expect(history[0]?.cardsReceived).toHaveLength(3);
    expect(history[0]?.currencyUsed).toBe("gold");
  });
});

describe("purchaseBox", () => {
  it("should purchase box with multiple packs", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "box@test.com", "boxtest");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 10000,
        gems: 500,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create cards for all rarities that might be pulled
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("cardDefinitions", {
        name: "Common Card",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 2,
        attack: 1000,
        defense: 800,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Uncommon Card",
        rarity: "uncommon",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 3,
        attack: 1500,
        defense: 1200,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Rare Card",
        rarity: "rare",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 4,
        attack: 2000,
        defense: 1500,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Epic Card",
        rarity: "epic",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 5,
        attack: 2500,
        defense: 2000,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("cardDefinitions", {
        name: "Legendary Card",
        rarity: "legendary",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 7,
        attack: 3000,
        defense: 2500,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Create pack product
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "box_pack_base",
        name: "Base Pack",
        description: "5 cards",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    // Create box product
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "starter_box",
        name: "Starter Box",
        description: "3 packs + 2 bonus cards",
        productType: "box",
        goldPrice: 2500,
        gemPrice: 125,
        boxConfig: {
          packProductId: "box_pack_base",
          packCount: 3,
          bonusCards: 2,
        },
        isActive: true,
        sortOrder: 10,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.mutation(economyShop.purchaseBox, {
      productId: "starter_box",
      useGems: false,
    });

    expect(result.success).toBe(true);
    expect(result.packsOpened).toBe(3);
    expect(result.bonusCards).toBe(2);
    expect(result.cardsReceived.length).toBeGreaterThanOrEqual(15); // 3 packs * 5 cards = 15 + 2 bonus
    expect(result.currencyUsed).toBe("gold");
    expect(result.amountPaid).toBe(2500);
  });

  it("should throw error for wrong product type on box purchase", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "wrongbox@test.com", "wrongbox");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 10000,
        gems: 500,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "single_pack",
        name: "Single Pack",
        description: "Just one pack",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(economyShop.purchaseBox, {
        productId: "single_pack",
        useGems: false,
      })
    ).rejects.toThrowError(/This endpoint is only for box purchases/);
  });
});

describe("purchaseCurrencyBundle", () => {
  it("should convert gems to gold", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "currency@test.com", "currencytest");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 200,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "gold_bundle_medium",
        name: "Medium Gold Bundle",
        description: "5000 gold for 100 gems",
        productType: "currency",
        gemPrice: 100,
        currencyConfig: {
          currencyType: "gold",
          amount: 5000,
        },
        isActive: true,
        sortOrder: 20,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.mutation(economyShop.purchaseCurrencyBundle, {
      productId: "gold_bundle_medium",
    });

    expect(result.success).toBe(true);
    expect(result.gemsSpent).toBe(100);
    expect(result.goldReceived).toBe(5000);

    const currency = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gems).toBe(100); // 200 - 100
    expect(currency?.gold).toBe(6000); // 1000 + 5000
  });

  it("should throw error for wrong product type on currency purchase", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "wrongcurrency@test.com", "wrongcurrency");

    const asUser = t.withIdentity({ subject: privyId });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 200,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "pack_not_currency",
        name: "Pack",
        description: "Not a currency bundle",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(economyShop.purchaseCurrencyBundle, {
        productId: "pack_not_currency",
      })
    ).rejects.toThrowError(/This endpoint is only for currency purchases/);
  });
});
