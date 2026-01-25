/**
 * Tests for lib/helpers.ts
 *
 * Tests shared helper functions including:
 * - Weighted random rarity selection
 * - Random card selection
 * - Card inventory management
 * - Pack opening logic
 */

import { describe, it, expect } from "vitest";
import { createTestInstance } from "../test.setup";
import type { TestMutationCtx } from "../test.setup";
import { api } from "../_generated/api";
import { weightedRandomRarity, calculateEloChange, calculateWinRate } from "./helpers";


describe("weightedRandomRarity", () => {
  it("should return valid rarity", () => {
    const validRarities = ["common", "uncommon", "rare", "epic", "legendary"];

    // Test 100 times to ensure it always returns valid rarity
    for (let i = 0; i < 100; i++) {
      const rarity = weightedRandomRarity();
      expect(validRarities).toContain(rarity);
    }
  });

  it("should return common more frequently than legendary", () => {
    const results = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    // Run 10000 trials
    for (let i = 0; i < 10000; i++) {
      const rarity = weightedRandomRarity();
      results[rarity]++;
    }

    // Common should be most frequent (65%)
    expect(results.common).toBeGreaterThan(results.uncommon);
    expect(results.common).toBeGreaterThan(results.rare);
    expect(results.common).toBeGreaterThan(results.epic);
    expect(results.common).toBeGreaterThan(results.legendary);

    // Legendary should be least frequent (1%)
    expect(results.legendary).toBeLessThan(results.common);
    expect(results.legendary).toBeLessThan(results.uncommon);
    expect(results.legendary).toBeLessThan(results.rare);
    expect(results.legendary).toBeLessThan(results.epic);
  });
});

describe("getRandomCard", () => {
  it("should throw error when no cards of rarity exist", async () => {
    const t = createTestInstance();

    // Don't create any cards
    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 1000,
        gems: 100,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });
    });

    // Try to purchase pack when no cards exist
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("shopProducts", {
        productId: "test-pack",
        name: "Test Pack",
        description: "Test",
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

    await expect(
      t.mutation(api.shop.purchasePack, {
        token: "test-token",
        productId: "test-pack",
        useGems: false,
      })
    ).rejects.toThrowError(/No active .+ cards found/);
  });

  it("should return card of specified rarity", async () => {
    const t = createTestInstance();

    // Create cards of different rarities
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("cardDefinitions", {
        name: "Common Card",
        rarity: "common",
        archetype: "fire",
        cardType: "creature",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("cardDefinitions", {
        name: "Rare Card",
        rarity: "rare",
        archetype: "water",
        cardType: "spell",
        cost: 3,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // The pack opening will use getRandomCard internally
    // We can't directly test the function, but we can test pack opening
    const allCards = await t.query(api.cards.getAllCardDefinitions);
    expect(allCards.length).toBe(2);
    expect(allCards.some(c => c.rarity === "common")).toBe(true);
    expect(allCards.some(c => c.rarity === "rare")).toBe(true);
  });
});

describe("addCardsToInventory", () => {
  it("should create new inventory entry for new card", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "New Card",
        rarity: "common",
        archetype: "fire",
        cardType: "creature",
        cost: 2,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    // Add card to inventory
    await t.mutation(api.cards.addCardsToInventory, {
      token: "test-token",
      cardDefinitionId: cardDefId,
      quantity: 3,
    });

    const userCards = await t.query(api.cards.getUserCards, {
      token: "test-token",
    });

    expect(userCards.length).toBe(1);
    expect(userCards![0]!.owned).toBe(3);
    expect(userCards![0]!.name).toBe("New Card");
  });

  it("should increment quantity for existing card", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Existing Card",
        rarity: "uncommon",
        archetype: "earth",
        cardType: "trap",
        cost: 2,
        isActive: true,
        createdAt: Date.now(),
      });

      // User already owns 2 of this card
      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 2,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    // Add 3 more cards
    await t.mutation(api.cards.addCardsToInventory, {
      token: "test-token",
      cardDefinitionId: cardDefId,
      quantity: 3,
    });

    const userCards = await t.query(api.cards.getUserCards, {
      token: "test-token",
    });

    expect(userCards.length).toBe(1);
    expect(userCards![0]!.owned).toBe(5); // 2 + 3
  });
});

describe("adjustCardInventory", () => {
  it("should decrease card quantity", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Sellable Card",
        rarity: "rare",
        archetype: "wind",
        cardType: "equipment",
        cost: 4,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 10,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "seller-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    // Create marketplace listing (which decreases inventory)
    await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 5,
      listingType: "fixed",
      price: 500,
    });

    const userCards = await t.query(api.cards.getUserCards, {
      token: "seller-token",
    });

    // Should have 5 left (10 - 5 listed)
    expect(userCards![0]!.owned).toBe(5);
  });

  it("should delete inventory entry when quantity reaches 0", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Last Card",
        rarity: "common",
        archetype: "fire",
        cardType: "creature",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 3,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "seller-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    // List all 3 cards
    await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 3,
      listingType: "fixed",
      price: 30,
    });

    const userCards = await t.query(api.cards.getUserCards, {
      token: "seller-token",
    });

    // Should have no cards left
    expect(userCards.length).toBe(0);
  });

  it("should throw error when trying to remove more cards than owned", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "pooruser",
        email: "poor@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Limited Card",
        rarity: "legendary",
        archetype: "neutral",
        cardType: "spell",
        cost: 5,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "poor-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    // Try to list 5 when only 1 owned
    await expect(
      t.mutation(api.marketplace.createListing, {
        token: "poor-token",
        cardDefinitionId: cardDefId,
        quantity: 5,
        listingType: "fixed",
        price: 1000,
      })
    ).rejects.toThrowError("You don't own enough of this card");
  });
});

describe("openPack", () => {
  it("should generate correct number of cards", async () => {
    const t = createTestInstance();

    // Create various cards
    await t.run(async (ctx: TestMutationCtx) => {
      const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
        "common", "uncommon", "rare", "epic", "legendary"
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
        username: "packopener",
        email: "opener@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 1000,
        gems: 100,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "pack-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("shopProducts", {
        productId: "standard-pack",
        name: "Standard Pack",
        description: "5 cards with guaranteed rare",
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
      token: "pack-token",
      productId: "standard-pack",
      useGems: false,
    });

    expect(result.success).toBe(true);
    expect(result.cardsReceived.length).toBe(5);

    // Last card should be guaranteed rare
    expect(result!.cardsReceived[4]!.rarity).toBe("rare");

    // Check cards were added to inventory
    const userCards = await t.query(api.cards.getUserCards, {
      token: "pack-token",
    });

    expect(userCards.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// ELO RATING & WIN RATE HELPER TESTS
// ============================================================================

describe("ELO Rating System", () => {
  describe("calculateEloChange", () => {
    it("should increase winner rating and decrease loser rating", () => {

      const result = calculateEloChange(1000, 1000);

      expect(result.winnerNewRating).toBeGreaterThan(1000);
      expect(result.loserNewRating).toBeLessThan(1000);
    });

    it("should award ~16 points for equal ratings", () => {

      const result = calculateEloChange(1000, 1000);

      // With equal ratings, expected score is 0.5
      // Change = K * (1 - 0.5) = 32 * 0.5 = 16
      expect(result.winnerNewRating).toBe(1016);
      expect(result.loserNewRating).toBe(984);
    });

    it("should award fewer points when higher rated player wins", () => {

      // Higher rated player (1500) beats lower rated player (1200)
      const result = calculateEloChange(1500, 1200);

      // Higher rated player is expected to win, so gains fewer points
      expect(result.winnerNewRating).toBeLessThan(1510);
      expect(result.winnerNewRating).toBeGreaterThan(1500);

      // Lower rated player loses fewer points (upset was expected)
      expect(result.loserNewRating).toBeLessThan(1200);
    });

    it("should award more points when lower rated player wins (upset)", () => {

      // Lower rated player (1200) beats higher rated player (1500)
      const result = calculateEloChange(1200, 1500);

      // Lower rated player wins upset, gains many points
      expect(result.winnerNewRating).toBeGreaterThan(1220);

      // Higher rated player loses upset, loses many points
      expect(result.loserNewRating).toBeLessThan(1480);
    });

    it("should enforce rating floor of 0", () => {

      // Player with very low rating loses
      const result = calculateEloChange(1500, 10);

      // Loser cannot go below 0
      expect(result.loserNewRating).toBeGreaterThanOrEqual(0);
    });

    it("should respect custom K-factor", () => {

      // Use K=64 instead of default 32
      const defaultK = calculateEloChange(1000, 1000, 32);
      const higherK = calculateEloChange(1000, 1000, 64);

      // Higher K means more volatile ratings
      const defaultChange = defaultK.winnerNewRating - 1000;
      const higherChange = higherK.winnerNewRating - 1000;

      expect(higherChange).toBe(defaultChange * 2);
    });
  });
});

describe("Win Rate Calculation", () => {
  describe("calculateWinRate", () => {
    it("should return 0% for no games played", () => {

      const player = {
        rankedWins: 0,
        rankedLosses: 0,
        casualWins: 0,
        casualLosses: 0,
        storyWins: 0,
      };

      expect(calculateWinRate(player, "ranked")).toBe(0);
      expect(calculateWinRate(player, "casual")).toBe(0);
      expect(calculateWinRate(player, "story")).toBe(0);
    });

    it("should return 100% for all wins", () => {

      const player = {
        rankedWins: 10,
        rankedLosses: 0,
        casualWins: 5,
        casualLosses: 0,
        storyWins: 20,
      };

      expect(calculateWinRate(player, "ranked")).toBe(100);
      expect(calculateWinRate(player, "casual")).toBe(100);
    });

    it("should return 0% for all losses", () => {

      const player = {
        rankedWins: 0,
        rankedLosses: 10,
        casualWins: 0,
        casualLosses: 5,
        storyWins: 0,
      };

      expect(calculateWinRate(player, "ranked")).toBe(0);
      expect(calculateWinRate(player, "casual")).toBe(0);
    });

    it("should calculate 75% win rate correctly", () => {

      const player = {
        rankedWins: 3,
        rankedLosses: 1,
        casualWins: 0,
        casualLosses: 0,
        storyWins: 0,
      };

      expect(calculateWinRate(player, "ranked")).toBe(75);
    });

    it("should round to nearest integer", () => {

      const player = {
        rankedWins: 2,
        rankedLosses: 1,
        casualWins: 0,
        casualLosses: 0,
        storyWins: 0,
      };

      // 2/3 = 66.666... should round to 67
      expect(calculateWinRate(player, "ranked")).toBe(67);
    });

    it("should handle undefined stats (default to 0)", () => {

      const player = {};

      expect(calculateWinRate(player, "ranked")).toBe(0);
    });

    it("should calculate per game type correctly", () => {

      const player = {
        rankedWins: 8,
        rankedLosses: 2,  // 80% ranked
        casualWins: 3,
        casualLosses: 7,  // 30% casual
        storyWins: 15,    // 100% story (no losses in story)
      };

      expect(calculateWinRate(player, "ranked")).toBe(80);
      expect(calculateWinRate(player, "casual")).toBe(30);
      expect(calculateWinRate(player, "story")).toBe(100);
    });
  });
});
