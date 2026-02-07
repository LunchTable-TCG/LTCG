/**
 * Phase 1 Test: Pack Opening Pity Counter Race
 *
 * Tests that pity counter for pack opening is atomic and cannot
 * trigger multiple legendary drops through concurrent pack opens.
 */

import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 1: Pack Opening Pity Counter Race", () => {
  it("should prevent multiple pity legendary drops on concurrent opens", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "packopener",
        email: "packopener@test.com",
        privyId: "privy_packopener",
        createdAt: Date.now(),
      });
    });

    // Give user gold and packs
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 10000,
        gems: 0,
        lifetimeGoldEarned: 10000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Set pity counter to 49 (one away from threshold of 50)
    await t.run(async (ctx) => {
      await ctx.db.insert("packOpeningPityState", {
        userId,
        packsSinceLastLegendary: 49,
        lastLegendaryAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      });
    });

    // Create shop product for starter_pack
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "starter_pack",
        name: "Starter Pack",
        description: "Basic starter pack",
        productType: "pack",
        goldPrice: 100,
        packConfig: {
          cardCount: 5,
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    // Create card definitions for all rarities (pack opening needs all rarities)
    const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
      "common",
      "uncommon",
      "rare",
      "epic",
      "legendary",
    ];
    const cardIds = [];
    for (const rarity of rarities) {
      for (let i = 0; i < 2; i++) {
        const cardId = await t.run(async (ctx) => {
          return await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            archetype: "neutral",
            cardType: "creature",
            cost: 3,
            attack: 50,
            defense: 50,
            flavorText: "Test card",
            imageUrl: "test.png",
            createdAt: Date.now(),
            isActive: true,
          });
        });
        cardIds.push(cardId);
      }
    }

    // Execute: Open 3 packs simultaneously
    // Only ONE should trigger pity legendary (at pack #50)
    const results = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_packopener" })
        .mutation(api.economy.shop.purchasePack, {
          productId: "starter_pack",
          useGems: false,
        }),
      t
        .withIdentity({ subject: "privy_packopener" })
        .mutation(api.economy.shop.purchasePack, {
          productId: "starter_pack",
          useGems: false,
        }),
      t
        .withIdentity({ subject: "privy_packopener" })
        .mutation(api.economy.shop.purchasePack, {
          productId: "starter_pack",
          useGems: false,
        }),
    ]);

    // Verify: Count successful pack opens
    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded.length).toBeGreaterThanOrEqual(1);

    // Verify: Pity counter was incremented for each pack
    const pityState = await t.run(async (ctx) => {
      return await ctx.db
        .query("packOpeningPityState")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
    });

    // Counter should have been incremented atomically
    // If exactly 50 was reached, it should have reset to 0
    // Otherwise it should be 49 + number of successful opens
    if (succeeded.length === 3) {
      // All 3 packs opened: 49 -> 50 (reset) -> 1 -> 2
      expect(pityState?.packsSinceLastLegendary).toBeLessThanOrEqual(2);
    } else if (succeeded.length === 2) {
      // 2 packs opened: 49 -> 50 (reset) -> 1
      expect(pityState?.packsSinceLastLegendary).toBeLessThanOrEqual(1);
    } else {
      // 1 pack opened: 49 -> 50 (reset) -> 0
      expect(pityState?.packsSinceLastLegendary).toBe(0);
    }

    // Verify: User has legendary cards (from pity trigger)
    const playerCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCards")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    });

    // Check if any legendary cards were received
    const legendaryCards = await Promise.all(
      playerCards.map(async (pc) => {
        const card = await t.run(async (ctx) => await ctx.db.get(pc.cardDefinitionId));
        return { ...pc, rarity: card?.rarity };
      })
    );

    const legendaries = legendaryCards.filter((c) => c.rarity === "legendary");

    // Should have at least one legendary (from pity)
    // but not more than number of packs opened (no duplicates)
    expect(legendaries.length).toBeGreaterThanOrEqual(1);
    expect(legendaries.length).toBeLessThanOrEqual(succeeded.length);
  });

  it("should increment pity counter atomically", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user at pity threshold - 2
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "testuser",
        email: "testuser@test.com",
        privyId: "privy_testuser",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 5000,
        gems: 0,
        lifetimeGoldEarned: 5000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Set pity counter to 48 (2 away from threshold)
    await t.run(async (ctx) => {
      await ctx.db.insert("packOpeningPityState", {
        userId,
        packsSinceLastLegendary: 48,
      });
    });

    // Create shop product for starter_pack
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "starter_pack",
        name: "Starter Pack",
        description: "Basic starter pack",
        productType: "pack",
        goldPrice: 100,
        packConfig: {
          cardCount: 5,
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    // Create card definitions for all rarities (pack opening needs all rarities)
    const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
      "common",
      "uncommon",
      "rare",
      "epic",
      "legendary",
    ];
    for (const rarity of rarities) {
      for (let i = 0; i < 2; i++) {
        await t.run(async (ctx) => {
          await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            archetype: "neutral",
            cardType: "creature",
            cost: 3,
            attack: 50,
            defense: 50,
            flavorText: "Test card",
            imageUrl: "test.png",
            createdAt: Date.now(),
            isActive: true,
          });
        });
      }
    }

    // Execute: Open 2 packs sequentially
    await t
      .withIdentity({ subject: "privy_testuser" })
      .mutation(api.economy.shop.purchasePack, {
        productId: "starter_pack",
        useGems: false,
      });

    // Check pity counter after first pack
    let pityState = await t.run(async (ctx) => {
      return await ctx.db
        .query("packOpeningPityState")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
    });

    expect(pityState?.packsSinceLastLegendary).toBe(49);

    // Open second pack - should trigger pity and reset
    await t
      .withIdentity({ subject: "privy_testuser" })
      .mutation(api.economy.shop.purchasePack, {
        productId: "starter_pack",
        useGems: false,
      });

    // Check pity counter after second pack
    pityState = await t.run(async (ctx) => {
      return await ctx.db
        .query("packOpeningPityState")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
    });

    // Should be 0 (reset after hitting 50)
    expect(pityState?.packsSinceLastLegendary).toBe(0);
    expect(pityState?.lastLegendaryAt).toBeDefined();
  });

  it("should handle missing pity state gracefully", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user WITHOUT pity state
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "newuser",
        email: "newuser@test.com",
        privyId: "privy_newuser",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 2000,
        gems: 0,
        lifetimeGoldEarned: 2000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create shop product for starter_pack
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "starter_pack",
        name: "Starter Pack",
        description: "Basic starter pack",
        productType: "pack",
        goldPrice: 100,
        packConfig: {
          cardCount: 5,
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    // Create card definitions for all rarities (pack opening needs all rarities)
    const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
      "common",
      "uncommon",
      "rare",
      "epic",
      "legendary",
    ];
    for (const rarity of rarities) {
      for (let i = 0; i < 2; i++) {
        await t.run(async (ctx) => {
          await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            archetype: "neutral",
            cardType: "creature",
            cost: 3,
            attack: 50,
            defense: 50,
            flavorText: "Test card",
            imageUrl: "test.png",
            createdAt: Date.now(),
            isActive: true,
          });
        });
      }
    }

    // Execute: Open pack without existing pity state
    await t
      .withIdentity({ subject: "privy_newuser" })
      .mutation(api.economy.shop.purchasePack, {
        productId: "starter_pack",
        useGems: false,
      });

    // Verify: Pity state was created
    const pityState = await t.run(async (ctx) => {
      return await ctx.db
        .query("packOpeningPityState")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
    });

    expect(pityState).toBeDefined();
    expect(pityState?.packsSinceLastLegendary).toBe(1);
  });

  it("should reset counter after legendary drop", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user exactly at pity threshold
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "pitytester",
        email: "pitytester@test.com",
        privyId: "privy_pitytester",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 10000,
        gems: 0,
        lifetimeGoldEarned: 10000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Set pity counter to 49 (next pack triggers pity)
    await t.run(async (ctx) => {
      await ctx.db.insert("packOpeningPityState", {
        userId,
        packsSinceLastLegendary: 49,
      });
    });

    // Create shop product for starter_pack
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId: "starter_pack",
        name: "Starter Pack",
        description: "Basic starter pack",
        productType: "pack",
        goldPrice: 100,
        packConfig: {
          cardCount: 5,
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });

    // Create card definitions for all rarities (pack opening needs all rarities)
    const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
      "common",
      "uncommon",
      "rare",
      "epic",
      "legendary",
    ];
    for (const rarity of rarities) {
      for (let i = 0; i < 2; i++) {
        await t.run(async (ctx) => {
          await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            archetype: "neutral",
            cardType: "creature",
            cost: 3,
            attack: 50,
            defense: 50,
            flavorText: "Test card",
            imageUrl: "test.png",
            createdAt: Date.now(),
            isActive: true,
          });
        });
      }
    }

    // Execute: Open pack that should trigger pity
    await t
      .withIdentity({ subject: "privy_pitytester" })
      .mutation(api.economy.shop.purchasePack, {
        productId: "starter_pack",
        useGems: false,
      });

    // Verify: Counter reset to 0 after pity trigger
    const pityState = await t.run(async (ctx) => {
      return await ctx.db
        .query("packOpeningPityState")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
    });

    expect(pityState?.packsSinceLastLegendary).toBe(0);
    expect(pityState?.lastLegendaryAt).toBeDefined();
    expect(pityState?.lastLegendaryAt).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds
  });
});
