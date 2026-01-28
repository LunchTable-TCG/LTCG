/**
 * Shop System Tests
 *
 * Tests pack purchasing, currency validation, and pack opening mechanics.
 * Covers happy paths, insufficient funds, invalid products, and edge cases.
 */

import { describe, expect, it } from "vitest";
import { createTestInstance } from "../../convex_test_utils/setup";

describe("purchasePack", () => {
  it("should purchase pack with gold successfully", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "shoptest",
        email: "shop@test.com",
        createdAt: Date.now(),
      });
    });

    // Create player currency
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create starter cards for pack opening
    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Card",
        rarity: "common",
        cardType: "creature",
        archetype: "neutral",
        cost: 3,
        attack: 1500,
        defense: 1000,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Create shop product
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "basic_pack_1",
        name: "Basic Pack",
        description: "5 random cards",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarities: ["common"],
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { purchasePack } = await import("./shop");
      return await purchasePack(ctx, {
        productId: "basic_pack_1",
        useGems: false,
      });
    });

    expect(result.success).toBe(true);
    expect(result.cardsReceived).toHaveLength(5);
    expect(result.currencyUsed).toBe("gold");
    expect(result.amountPaid).toBe(1000);

    // Verify currency was deducted
    const currency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gold).toBe(4000); // 5000 - 1000
  });

  it("should purchase pack with gems successfully", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "gemtest",
        email: "gem@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 200,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("cardDefinitions", {
        name: "Gem Card",
        rarity: "rare",
        cardType: "creature",
        archetype: "neutral",
        cost: 4,
        attack: 2000,
        defense: 1500,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "premium_pack_1",
        name: "Premium Pack",
        description: "5 cards with higher rarity",
        productType: "pack",
        goldPrice: 2000,
        gemPrice: 100,
        packConfig: {
          cardCount: 5,
          guaranteedRarities: ["rare"],
        },
        isActive: true,
        sortOrder: 2,
        createdAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { purchasePack } = await import("./shop");
      return await purchasePack(ctx, {
        productId: "premium_pack_1",
        useGems: true,
      });
    });

    expect(result.success).toBe(true);
    expect(result.currencyUsed).toBe("gems");
    expect(result.amountPaid).toBe(100);

    const currency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gems).toBe(100); // 200 - 100
  });

  it("should throw error for insufficient gold", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "poortest",
        email: "poor@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 500, // Not enough
        gems: 10,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "expensive_pack",
        name: "Expensive Pack",
        description: "Costs 1000 gold",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarities: ["common"],
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { purchasePack } = await import("./shop");
        return await purchasePack(ctx, {
          productId: "expensive_pack",
          useGems: false,
        });
      })
    ).rejects.toThrowError(/Insufficient gold/);
  });

  it("should throw error for insufficient gems", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "nogems",
        email: "nogems@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 25, // Not enough
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "gem_pack",
        name: "Gem Pack",
        description: "Costs 50 gems",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarities: ["common"],
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { purchasePack } = await import("./shop");
        return await purchasePack(ctx, {
          productId: "gem_pack",
          useGems: true,
        });
      })
    ).rejects.toThrowError(/Insufficient gems/);
  });

  it("should throw error for inactive product", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "inactivetest",
        email: "inactive@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "disabled_pack",
        name: "Disabled Pack",
        description: "No longer available",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarities: ["common"],
        },
        isActive: false, // Inactive
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { purchasePack } = await import("./shop");
        return await purchasePack(ctx, {
          productId: "disabled_pack",
          useGems: false,
        });
      })
    ).rejects.toThrowError(/Product not found/);
  });

  it("should throw error for non-existent product", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "notfoundtest",
        email: "notfound@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lastUpdatedAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { purchasePack } = await import("./shop");
        return await purchasePack(ctx, {
          productId: "nonexistent_pack",
          useGems: false,
        });
      })
    ).rejects.toThrowError(/Product not found/);
  });

  it("should throw error for wrong product type", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "wrongtype",
        email: "wrongtype@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
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
      t.run(async (ctx) => {
        const { purchasePack } = await import("./shop");
        return await purchasePack(ctx, {
          productId: "currency_bundle",
          useGems: true,
        });
      })
    ).rejects.toThrowError(/only for pack purchases/);
  });

  it("should record pack opening history", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "historytest",
        email: "history@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 100,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("cardDefinitions", {
        name: "History Card",
        rarity: "common",
        cardType: "creature",
        archetype: "neutral",
        cost: 2,
        attack: 1200,
        defense: 800,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "history_pack",
        name: "History Pack",
        description: "Test pack for history",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 3,
          guaranteedRarities: ["common"],
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      const { purchasePack } = await import("./shop");
      return await purchasePack(ctx, {
        productId: "history_pack",
        useGems: false,
      });
    });

    const history = await t.run(async (ctx) => {
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

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "boxtest",
        email: "box@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 10000,
        gems: 500,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("cardDefinitions", {
        name: "Box Card",
        rarity: "common",
        cardType: "creature",
        archetype: "neutral",
        cost: 3,
        attack: 1500,
        defense: 1000,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Create pack product
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "box_pack_base",
        name: "Base Pack",
        description: "5 cards",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarities: ["common"],
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    // Create box product
    await t.run(async (ctx) => {
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

    const result = await t.run(async (ctx) => {
      const { purchaseBox } = await import("./shop");
      return await purchaseBox(ctx, {
        productId: "starter_box",
        useGems: false,
      });
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

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "wrongbox",
        email: "wrongbox@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 10000,
        gems: 500,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "single_pack",
        name: "Single Pack",
        description: "Just one pack",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarities: ["common"],
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { purchaseBox } = await import("./shop");
        return await purchaseBox(ctx, {
          productId: "single_pack",
          useGems: false,
        });
      })
    ).rejects.toThrowError(/only for box purchases/);
  });
});

describe("purchaseCurrencyBundle", () => {
  it("should convert gems to gold", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "currencytest",
        email: "currency@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 200,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
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

    const result = await t.run(async (ctx) => {
      const { purchaseCurrencyBundle } = await import("./shop");
      return await purchaseCurrencyBundle(ctx, {
        productId: "gold_bundle_medium",
      });
    });

    expect(result.success).toBe(true);
    expect(result.gemsSpent).toBe(100);
    expect(result.goldReceived).toBe(5000);

    const currency = await t.run(async (ctx) => {
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

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "wrongcurrency",
        email: "wrongcurrency@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 200,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "pack_not_currency",
        name: "Pack",
        description: "Not a currency bundle",
        productType: "pack",
        goldPrice: 1000,
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
          guaranteedRarities: ["common"],
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { purchaseCurrencyBundle } = await import("./shop");
        return await purchaseCurrencyBundle(ctx, {
          productId: "pack_not_currency",
        });
      })
    ).rejects.toThrowError(/only for currency purchases/);
  });
});
