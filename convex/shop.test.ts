/**
 * Tests for shop.ts
 *
 * Tests shop functionality including:
 * - Product listing
 * - Pack purchases
 * - Box purchases
 * - Currency bundle purchases
 * - Pack opening history
 */

import { describe, it, expect } from "vitest";
import { createTestInstance } from "./test.setup";
import type { TestMutationCtx } from "./test.setup";
import { api } from "./_generated/api";


describe("getShopProducts", () => {
  it("should return only active products", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "active-pack",
        name: "Active Pack",
        description: "Available",
        productType: "pack",
        goldPrice: 100,
        packConfig: { cardCount: 5 },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });

      await ctx.db.insert("shopProducts", {
        productId: "inactive-pack",
        name: "Inactive Pack",
        description: "Not available",
        productType: "pack",
        goldPrice: 100,
        packConfig: { cardCount: 5 },
        isActive: false,
        sortOrder: 2,
        createdAt: Date.now(),
      });
    });

    const products = await t.query(api.shop.getShopProducts);

    expect(products.length).toBe(1);
    expect(products![0]!.productId).toBe("active-pack");
  });

  it("should sort products by sortOrder", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "pack-3",
        name: "Third",
        description: "3rd",
        productType: "pack",
        goldPrice: 100,
        packConfig: { cardCount: 5 },
        isActive: true,
        sortOrder: 3,
        createdAt: Date.now(),
      });

      await ctx.db.insert("shopProducts", {
        productId: "pack-1",
        name: "First",
        description: "1st",
        productType: "pack",
        goldPrice: 100,
        packConfig: { cardCount: 5 },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });

      await ctx.db.insert("shopProducts", {
        productId: "pack-2",
        name: "Second",
        description: "2nd",
        productType: "pack",
        goldPrice: 100,
        packConfig: { cardCount: 5 },
        isActive: true,
        sortOrder: 2,
        createdAt: Date.now(),
      });
    });

    const products = await t.query(api.shop.getShopProducts);

    expect(products![0]!.productId).toBe("pack-1");
    expect(products![1]!.productId).toBe("pack-2");
    expect(products![2]!.productId).toBe("pack-3");
  });
});

describe("purchasePack", () => {
  it("should successfully purchase pack with gold", async () => {
    const t = createTestInstance();

    // Setup
    await t.run(async (ctx: TestMutationCtx) => {
      // Seed cards for all rarities so pack opening works
      const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
        "common",
        "uncommon",
        "rare",
        "epic",
        "legendary",
      ];

      for (const rarity of rarities) {
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            archetype: "fire",
            cardType: "creature",
            cost: 2,
            isActive: true,
            createdAt: Date.now(),
          });
        }
      }

      const uid = await ctx.db.insert("users", {
        username: "buyer",
        email: "buyer@example.com",
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
        token: "buyer-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("shopProducts", {
        productId: "standard-pack",
        name: "Standard Pack",
        description: "5 cards",
        productType: "pack",
        goldPrice: 100,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "rare",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    const result = await t.mutation(api.shop.purchasePack, {
      token: "buyer-token",
      productId: "standard-pack",
      useGems: false,
    });

    expect(result.success).toBe(true);
    expect(result.cardsReceived.length).toBe(5);
    expect(result.currencyUsed).toBe("gold");
    expect(result.amountPaid).toBe(100);

    // Verify balance decreased
    const balance = await t.query(api.economy.getPlayerBalance, {
      token: "buyer-token",
    });
    expect(balance.gold).toBe(400); // 500 - 100
  });

  it("should successfully purchase pack with gems", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      // Seed cards for all rarities so pack opening works
      const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
        "common",
        "uncommon",
        "rare",
        "epic",
        "legendary",
      ];

      for (const rarity of rarities) {
        for (let i = 0; i < 3; i++) {
          await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            archetype: "water",
            cardType: "spell",
            cost: 1,
            isActive: true,
            createdAt: Date.now(),
          });
        }
      }

      const uid = await ctx.db.insert("users", {
        username: "gembuyer",
        email: "gembuyer@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 100,
        gems: 200,
        lifetimeGoldEarned: 100,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 200,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "gem-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("shopProducts", {
        productId: "gem-pack",
        name: "Gem Pack",
        description: "5 cards for gems",
        productType: "pack",
        gemPrice: 50,
        packConfig: {
          cardCount: 5,
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    const result = await t.mutation(api.shop.purchasePack, {
      token: "gem-token",
      productId: "gem-pack",
      useGems: true,
    });

    expect(result.success).toBe(true);
    expect(result.currencyUsed).toBe("gems");
    expect(result.amountPaid).toBe(50);

    const balance = await t.query(api.economy.getPlayerBalance, {
      token: "gem-token",
    });
    expect(balance.gems).toBe(150); // 200 - 50
  });

  it("should fail when product not found", async () => {
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
    });

    await expect(
      t.mutation(api.shop.purchasePack, {
        token: "test-token",
        productId: "nonexistent",
        useGems: false,
      })
    ).rejects.toThrowError("Product not found or unavailable");
  });

  it("should fail when insufficient currency", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
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

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "poor-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("shopProducts", {
        productId: "expensive-pack",
        name: "Expensive Pack",
        description: "Too expensive",
        productType: "pack",
        goldPrice: 200,
        packConfig: { cardCount: 5 },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.shop.purchasePack, {
        token: "poor-token",
        productId: "expensive-pack",
        useGems: false,
      })
    ).rejects.toThrowError("Insufficient gold");
  });
});

describe("purchaseBox", () => {
  it("should open multiple packs", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      // Seed cards for all rarities so pack opening works
      const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
        "common",
        "uncommon",
        "rare",
        "epic",
        "legendary",
      ];

      for (const rarity of rarities) {
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            archetype: "earth",
            cardType: "trap",
            cost: 1,
            isActive: true,
            createdAt: Date.now(),
          });
        }
      }

      const uid = await ctx.db.insert("users", {
        username: "boxbuyer",
        email: "box@example.com",
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

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "box-token",
        expiresAt: Date.now() + 3600000,
      });

      // Create pack product
      await ctx.db.insert("shopProducts", {
        productId: "basic-pack",
        name: "Basic Pack",
        description: "5 cards",
        productType: "pack",
        goldPrice: 100,
        packConfig: { cardCount: 5 },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });

      // Create box product
      await ctx.db.insert("shopProducts", {
        productId: "basic-box",
        name: "Basic Box",
        description: "6 packs",
        productType: "box",
        goldPrice: 500,
        boxConfig: {
          packProductId: "basic-pack",
          packCount: 6,
        },
        isActive: true,
        sortOrder: 2,
        createdAt: Date.now(),
      });
    });

    const result = await t.mutation(api.shop.purchaseBox, {
      token: "box-token",
      productId: "basic-box",
      useGems: false,
    });

    expect(result.success).toBe(true);
    expect(result.packsOpened).toBe(6);
    expect(result.cardsReceived.length).toBe(30); // 6 packs * 5 cards
  });

  it("should include bonus cards", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      // Seed cards for all rarities so pack opening works
      const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
        "common",
        "uncommon",
        "rare",
        "epic",
        "legendary",
      ];

      for (const rarity of rarities) {
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            archetype: "wind",
            cardType: "equipment",
            cost: 2,
            isActive: true,
            createdAt: Date.now(),
          });
        }
      }

      const uid = await ctx.db.insert("users", {
        username: "bonusbuyer",
        email: "bonus@example.com",
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

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "bonus-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("shopProducts", {
        productId: "pack",
        name: "Pack",
        description: "5 cards",
        productType: "pack",
        goldPrice: 100,
        packConfig: { cardCount: 5 },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });

      await ctx.db.insert("shopProducts", {
        productId: "bonus-box",
        name: "Bonus Box",
        description: "6 packs + 2 bonus",
        productType: "box",
        goldPrice: 600,
        boxConfig: {
          packProductId: "pack",
          packCount: 6,
          bonusCards: 2,
        },
        isActive: true,
        sortOrder: 2,
        createdAt: Date.now(),
      });
    });

    const result = await t.mutation(api.shop.purchaseBox, {
      token: "bonus-token",
      productId: "bonus-box",
      useGems: false,
    });

    expect(result.bonusCards).toBe(2);
    expect(result.cardsReceived.length).toBe(32); // (6 * 5) + 2
  });
});

describe("purchaseCurrencyBundle", () => {
  it("should convert gems to gold", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "converter",
        email: "convert@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 100,
        gems: 500,
        lifetimeGoldEarned: 100,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 500,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "convert-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("shopProducts", {
        productId: "gold-bundle",
        name: "1000 Gold",
        description: "Convert 100 gems to 1000 gold",
        productType: "currency",
        gemPrice: 100,
        currencyConfig: {
          currencyType: "gold",
          amount: 1000,
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    const result = await t.mutation(api.shop.purchaseCurrencyBundle, {
      token: "convert-token",
      productId: "gold-bundle",
    });

    expect(result.success).toBe(true);
    expect(result.gemsSpent).toBe(100);
    expect(result.goldReceived).toBe(1000);

    const balance = await t.query(api.economy.getPlayerBalance, {
      token: "convert-token",
    });

    expect(balance.gold).toBe(1100); // 100 + 1000
    expect(balance.gems).toBe(400); // 500 - 100
  });
});

describe("getPackOpeningHistory", () => {
  it("should return pack opening history", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "historyuser",
        email: "history@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "history-token",
        expiresAt: Date.now() + 3600000,
      });

      // Create some history records
      for (let i = 0; i < 15; i++) {
        await ctx.db.insert("packOpeningHistory", {
          userId: uid,
          productId: `pack-${i}`,
          packType: "Standard Pack",
          cardsReceived: [],
          currencyUsed: "gold",
          amountPaid: 100,
          openedAt: Date.now() + i,
        });
      }
    });

    const page1 = await t.query(api.shop.getPackOpeningHistory, {
      token: "history-token",
      page: 1,
    });

    expect(page1.history.length).toBeGreaterThan(0);
    expect(page1.history.length).toBeLessThanOrEqual(20); // Page size
    expect(page1.total).toBe(15);
  });
});
