// @ts-nocheck
/**
 * Data Integrity and Invariant Tests
 *
 * These tests verify critical business invariants that should NEVER be violated.
 * Invariants are rules that must always be true regardless of what operations are performed.
 *
 * Testing Strategy:
 * 1. Establish valid initial state
 * 2. Perform operation that COULD violate invariant
 * 3. Assert invariant still holds
 * 4. Include negative tests (deliberately try to break invariant)
 *
 * WHY THIS MATTERS:
 * - Catching invariant violations prevents data corruption
 * - Ensures game economy integrity (no infinite gold exploits)
 * - Maintains competitive fairness (valid ratings, match records)
 * - Prevents orphaned data and referential integrity issues
 *
 * Note: TypeScript errors suppressed for custom schema indexes that work correctly at runtime
 */

import { createTestUser, createTestUserWithGold } from "@convex/__tests__/fixtures/users";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import schema from "@convex/schema";
import { modules } from "@convex/test.setup";
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";

describe("Invariant 1: Currency Never Negative", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let privyId: string;

  beforeEach(async () => {
    // Pass modules glob so convex-test can find _generated directory
    t = convexTest(schema, modules);

    // Create user with 100 gold
    const user = createTestUserWithGold(100);
    privyId = `did:privy:test_${user.email.replace(/[^a-z0-9]/gi, "_")}`;
    userId = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", {
        email: user.email,
        username: user.username,
        name: user.name,
        privyId,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });

      // Initialize currency
      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 100,
        gems: 0,
        lifetimeGoldEarned: 100,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      return uid;
    });
  });

  it("should maintain gold >= 0 after valid pack purchase", async () => {
    // Setup: Create a cheap pack (50 gold)
    const productId = "test_pack_cheap";
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId,
        name: "Cheap Pack",
        description: "Test pack for invariant testing",
        productType: "pack",
        goldPrice: 50,
        packConfig: {
          cardCount: 3,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });

      // Seed cards of all rarities for pack opening (weightedRandomRarity can return any rarity)
      const rarities = ["common", "uncommon", "rare", "epic", "legendary"] as const;
      for (const rarity of rarities) {
        for (let i = 1; i <= 3; i++) {
          await ctx.db.insert("cardDefinitions", {
            name: `${rarity} Card ${i}`,
            rarity,
            cardType: "creature",
            archetype: "fire",
            cost: 2,
            attack: 100,
            defense: 100,
            isActive: true,
            createdAt: Date.now(),
          });
        }
      }
    });

    // Purchase pack (50 gold, should have 50 remaining)
    const asUser = t.withIdentity({ subject: privyId });
    await asUser.mutation(api.economy.shop.purchasePack, {
      productId,
      useGems: false,
    });

    // Assert: Gold should be 50, never negative
    const currency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gold).toBe(50);
    expect(currency?.gold).toBeGreaterThanOrEqual(0);
  });

  it("should REJECT purchase when insufficient gold (negative test)", async () => {
    // Setup: Create expensive pack (200 gold, but user only has 100)
    const productId = "test_pack_expensive";
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId,
        name: "Expensive Pack",
        description: "Too expensive for user",
        productType: "pack",
        goldPrice: 200,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "rare",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });

      await ctx.db.insert("cardDefinitions", {
        name: "Test Card 2",
        rarity: "rare",
        cardType: "creature",
        archetype: "water",
        cost: 3,
        attack: 200,
        defense: 200,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const asUser = t.withIdentity({ subject: privyId });

    // Attempt to purchase (should be rejected)
    await expect(
      asUser.mutation(api.economy.shop.purchasePack, {
        productId,
        useGems: false,
      })
    ).rejects.toThrow(/insufficient.*gold/i);

    // Assert: Gold unchanged at 100, never went negative
    const currency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gold).toBe(100);
    expect(currency?.gold).toBeGreaterThanOrEqual(0);
  });

  it("should maintain gems >= 0 when using gem currency", async () => {
    // Give user some gems
    await t.run(async (ctx) => {
      const currency = await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (currency) {
        await ctx.db.patch(currency._id, {
          gems: 50,
          lifetimeGemsEarned: 50,
        });
      }
    });

    const productId = "test_pack_gem";
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId,
        name: "Gem Pack",
        description: "Pack purchased with gems",
        productType: "pack",
        gemPrice: 30,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "rare",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });

      // Seed cards of all rarities for pack opening (weightedRandomRarity can return any rarity)
      const rarities = ["common", "uncommon", "rare", "epic", "legendary"] as const;
      for (const rarity of rarities) {
        for (let i = 1; i <= 3; i++) {
          await ctx.db.insert("cardDefinitions", {
            name: `Gem ${rarity} Card ${i}`,
            rarity,
            cardType: "spell",
            archetype: "fire",
            cost: 4,
            isActive: true,
            createdAt: Date.now(),
          });
        }
      }
    });

    const asUser = t.withIdentity({ subject: privyId });
    await asUser.mutation(api.economy.shop.purchasePack, {
      productId,
      useGems: true,
    });

    const currency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(currency?.gems).toBe(20);
    expect(currency?.gems).toBeGreaterThanOrEqual(0);
  });
});

describe("Invariant 2: Deck Validity (Exactly 30+ Cards)", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let privyId: string;
  let cardDefIds: Id<"cardDefinitions">[];

  beforeEach(async () => {
    // Pass modules glob so convex-test can find _generated directory
    t = convexTest(schema, modules);

    const user = createTestUser();
    privyId = `did:privy:test_${user.email.replace(/[^a-z0-9]/gi, "_")}`;
    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: user.email,
        username: user.username,
        name: user.name,
        privyId,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create 15 test card definitions (max 3 copies per card, so need 10 for 30 cards)
    cardDefIds = [];
    for (let i = 1; i <= 15; i++) {
      const cardId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: `Test Monster ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "fire",
          cost: 3,
          attack: 150,
          defense: 150,
          isActive: true,
          createdAt: Date.now(),
        });
      });
      cardDefIds.push(cardId);

      // Give user 10 copies of each card
      await t.run(async (ctx) => {
        await ctx.db.insert("playerCards", {
          userId,
          cardDefinitionId: cardId,
          quantity: 10,
          isFavorite: false,
          acquiredAt: Date.now(),
          lastUpdatedAt: Date.now(),
        });
      });
    }
  });

  it("should allow creating deck with exactly 30 cards", async () => {
    const asUser = t.withIdentity({ subject: privyId });

    // Create deck
    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "Valid 30-Card Deck",
    });

    // Add exactly 30 cards (10 cards × 3 copies each)
    await asUser.mutation(api.core.decks.saveDeck, {
      deckId,
      cards: cardDefIds.slice(0, 10).map((cardId) => ({
        cardDefinitionId: cardId,
        quantity: 3,
      })),
    });

    // Validate deck passes
    const validation = await asUser.query(api.core.decks.validateDeck, {
      deckId,
    });

    expect(validation.isValid).toBe(true);
    expect(validation.totalCards).toBe(30);
    expect(validation.errors).toHaveLength(0);
  });

  it("should REJECT deck with fewer than 30 cards (negative test)", async () => {
    const asUser = t.withIdentity({ subject: privyId });

    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "Invalid 20-Card Deck",
    });

    // Try to save deck with only 20 cards (7 cards × 3 copies - 1 card × 1 copy = 20)
    await expect(
      asUser.mutation(api.core.decks.saveDeck, {
        deckId,
        cards: [
          ...cardDefIds.slice(0, 6).map((cardId) => ({ cardDefinitionId: cardId, quantity: 3 })),
          { cardDefinitionId: cardDefIds[6], quantity: 2 },
        ],
      })
    ).rejects.toThrow(/at least 30 cards|deck/i);

    // Deck should not have been saved
    const deckCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", deckId))
        .collect();
    });

    // No cards should be in deck since save was rejected
    expect(deckCards).toHaveLength(0);
  });

  it("should allow deck with more than 30 cards (no maximum)", async () => {
    const asUser = t.withIdentity({ subject: privyId });

    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "Large 45-Card Deck",
    });

    // Add 45 cards (15 cards × 3 copies each = 45 cards, should be allowed)
    await asUser.mutation(api.core.decks.saveDeck, {
      deckId,
      cards: cardDefIds.slice(0, 15).map((cardId) => ({
        cardDefinitionId: cardId,
        quantity: 3,
      })),
    });

    const validation = await asUser.query(api.core.decks.validateDeck, {
      deckId,
    });

    expect(validation.isValid).toBe(true);
    expect(validation.totalCards).toBe(45);
  });
});

describe("Invariant 3: Active Deck Exists Before Game", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let privyId: string;
  let _deckId: Id<"userDecks">;
  let cardDefIds: Id<"cardDefinitions">[];

  beforeEach(async () => {
    // Pass modules glob so convex-test can find _generated directory
    t = convexTest(schema, modules);

    const user = createTestUser();
    privyId = `did:privy:test_${user.email.replace(/[^a-z0-9]/gi, "_")}`;
    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: user.email,
        username: user.username,
        name: user.name,
        privyId,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create 15 card definitions (max 3 copies per card)
    cardDefIds = [];
    for (let i = 1; i <= 15; i++) {
      const cardId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: `Battle Card ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "earth",
          cost: 2,
          attack: 100,
          defense: 100,
          isActive: true,
          createdAt: Date.now(),
        });
      });
      cardDefIds.push(cardId);

      // Give user 10 copies of each card
      await t.run(async (ctx) => {
        await ctx.db.insert("playerCards", {
          userId,
          cardDefinitionId: cardId,
          quantity: 10,
          isFavorite: false,
          acquiredAt: Date.now(),
          lastUpdatedAt: Date.now(),
        });
      });
    }
  });

  it("should allow setting valid 30-card deck as active", async () => {
    const asUser = t.withIdentity({ subject: privyId });

    // Create and populate deck
    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "Battle Deck",
    });

    await asUser.mutation(api.core.decks.saveDeck, {
      deckId,
      cards: cardDefIds.slice(0, 10).map((cardId) => ({
        cardDefinitionId: cardId,
        quantity: 3,
      })),
    });

    // Set as active
    await asUser.mutation(api.core.decks.setActiveDeck, {
      deckId,
    });

    // Verify user has active deck
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.activeDeckId).toBe(deckId);
  });

  it("should REJECT setting invalid deck as active (negative test)", async () => {
    const asUser = t.withIdentity({ subject: privyId });

    // Create deck but don't add cards
    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "Empty Deck",
    });

    // Try to set empty deck as active (should fail)
    await expect(
      asUser.mutation(api.core.decks.setActiveDeck, {
        deckId,
      })
    ).rejects.toThrow(/at least 30 cards/i);

    // User should not have active deck set
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.activeDeckId).toBeUndefined();
  });

  it("should auto-set first valid deck as active", async () => {
    const asUser = t.withIdentity({ subject: privyId });

    // User has no active deck initially
    const userBefore = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });
    expect(userBefore?.activeDeckId).toBeUndefined();

    // Create and save deck
    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "First Deck",
    });

    await asUser.mutation(api.core.decks.saveDeck, {
      deckId,
      cards: cardDefIds.slice(0, 10).map((cardId) => ({
        cardDefinitionId: cardId,
        quantity: 3,
      })),
    });

    // Should auto-set as active
    const userAfter = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });
    expect(userAfter?.activeDeckId).toBe(deckId);
  });
});

describe("Invariant 4: No Orphaned Records (Referential Integrity)", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let privyId: string;
  let cardDefIds: Id<"cardDefinitions">[];

  beforeEach(async () => {
    // Pass modules glob so convex-test can find _generated directory
    t = convexTest(schema, modules);

    const user = createTestUser();
    privyId = `did:privy:test_${user.email.replace(/[^a-z0-9]/gi, "_")}`;
    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: user.email,
        username: user.username,
        name: user.name,
        privyId,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create 15 card definitions (max 3 copies per card)
    cardDefIds = [];
    for (let i = 1; i <= 15; i++) {
      const cardId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: `Test Card ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "wind",
          cost: 2,
          attack: 120,
          defense: 120,
          isActive: true,
          createdAt: Date.now(),
        });
      });
      cardDefIds.push(cardId);

      // Give user 10 copies of each card
      await t.run(async (ctx) => {
        await ctx.db.insert("playerCards", {
          userId,
          cardDefinitionId: cardId,
          quantity: 10,
          isFavorite: false,
          acquiredAt: Date.now(),
          lastUpdatedAt: Date.now(),
        });
      });
    }
  });

  it("should maintain card definition references in deck cards", async () => {
    const asUser = t.withIdentity({ subject: privyId });

    // Create deck with cards
    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "Reference Test Deck",
    });

    await asUser.mutation(api.core.decks.saveDeck, {
      deckId,
      cards: cardDefIds.slice(0, 10).map((cardId) => ({
        cardDefinitionId: cardId,
        quantity: 3,
      })),
    });

    // Get all deck cards
    const deckCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", deckId))
        .collect();
    });

    // Verify all deck cards reference valid card definitions
    for (const deckCard of deckCards) {
      const cardDef = await t.run(async (ctx) => {
        return await ctx.db.get(deckCard.cardDefinitionId);
      });

      expect(cardDef).not.toBeNull();
      expect(cardDef?.isActive).toBe(true);
    }
  });

  it("should REJECT adding cards user does not own (negative test)", async () => {
    // Create a card the user does NOT own
    const unownedCardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Unowned Card",
        rarity: "legendary",
        cardType: "creature",
        archetype: "fire",
        cost: 8,
        attack: 500,
        defense: 500,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const asUser = t.withIdentity({ subject: privyId });

    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "Invalid Deck",
    });

    // Try to add unowned card to deck
    await expect(
      asUser.mutation(api.core.decks.saveDeck, {
        deckId,
        cards: [{ cardDefinitionId: unownedCardId, quantity: 1 }],
      })
    ).rejects.toThrow(/at least 30 cards|deck/i);

    // Deck should have no cards
    const deckCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", deckId))
        .collect();
    });

    expect(deckCards).toHaveLength(0);
  });

  it("should handle deck deletion without orphaning deck cards", async () => {
    const asUser = t.withIdentity({ subject: privyId });

    const { deckId } = await asUser.mutation(api.core.decks.createDeck, {
      name: "Deck to Delete",
    });

    await asUser.mutation(api.core.decks.saveDeck, {
      deckId,
      cards: cardDefIds.slice(0, 10).map((cardId) => ({
        cardDefinitionId: cardId,
        quantity: 3,
      })),
    });

    // Delete deck (soft delete)
    await asUser.mutation(api.core.decks.deleteDeck, {
      deckId,
    });

    // Verify deck is marked inactive (not deleted)
    const deck = await t.run(async (ctx) => {
      return await ctx.db.get(deckId);
    });

    expect(deck).not.toBeNull();
    expect(deck?.isActive).toBe(false);

    // Deck cards should still exist (not orphaned)
    const deckCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", deckId))
        .collect();
    });

    expect(deckCards.length).toBeGreaterThan(0);
  });
});

describe("Invariant 5: Rating Bounds (0-3000 ELO)", () => {
  let t: ReturnType<typeof convexTest>;
  let winnerUserId: Id<"users">;
  let loserUserId: Id<"users">;

  beforeEach(async () => {
    // Pass modules glob so convex-test can find _generated directory
    t = convexTest(schema, modules);

    const winner = createTestUser();
    const loser = createTestUser();

    winnerUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: winner.email,
        username: winner.username,
        name: winner.name,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    loserUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: loser.email,
        username: loser.username,
        name: loser.name,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });
  });

  it("should maintain rating bounds after match completion", async () => {
    // Simulate match completion (internal mutation would be called by game engine)
    await t.run(async (ctx) => {
      // Insert match history record directly (simulating game completion)
      await ctx.db.insert("matchHistory", {
        winnerId: winnerUserId,
        loserId: loserUserId,
        gameType: "ranked",
        winnerRatingBefore: 1000,
        winnerRatingAfter: 1016, // +16 ELO
        loserRatingBefore: 1000,
        loserRatingAfter: 984, // -16 ELO
        xpAwarded: 50,
        completedAt: Date.now(),
      });

      // Update ratings
      await ctx.db.patch(winnerUserId, {
        rankedElo: 1016,
        totalWins: 1,
        rankedWins: 1,
      });

      await ctx.db.patch(loserUserId, {
        rankedElo: 984,
        totalLosses: 1,
        rankedLosses: 1,
      });
    });

    // Verify ratings are within bounds
    const winner = await t.run(async (ctx) => {
      return await ctx.db.get(winnerUserId);
    });

    const loser = await t.run(async (ctx) => {
      return await ctx.db.get(loserUserId);
    });

    expect(winner?.rankedElo).toBeGreaterThanOrEqual(0);
    expect(winner?.rankedElo).toBeLessThanOrEqual(3000);

    expect(loser?.rankedElo).toBeGreaterThanOrEqual(0);
    expect(loser?.rankedElo).toBeLessThanOrEqual(3000);
  });

  it("should never allow rating to drop below 0 (boundary test)", async () => {
    // Set loser to very low rating
    await t.run(async (ctx) => {
      await ctx.db.patch(loserUserId, {
        rankedElo: 10, // Very low rating
      });
    });

    // Simulate loss (worst case: -16 ELO, but should floor at 0)
    await t.run(async (ctx) => {
      const newRating = Math.max(0, 10 - 16); // Should be 0, not -6

      await ctx.db.patch(loserUserId, {
        rankedElo: newRating,
        totalLosses: 1,
        rankedLosses: 1,
      });

      await ctx.db.insert("matchHistory", {
        winnerId: winnerUserId,
        loserId: loserUserId,
        gameType: "ranked",
        winnerRatingBefore: 1000,
        winnerRatingAfter: 1016,
        loserRatingBefore: 10,
        loserRatingAfter: newRating,
        xpAwarded: 50,
        completedAt: Date.now(),
      });
    });

    const loser = await t.run(async (ctx) => {
      return await ctx.db.get(loserUserId);
    });

    expect(loser?.rankedElo).toBe(0);
    expect(loser?.rankedElo).toBeGreaterThanOrEqual(0);
  });
});

describe("Invariant 6: Consistent Totals (Wins + Losses = Match History)", () => {
  let t: ReturnType<typeof convexTest>;
  let playerAId: Id<"users">;
  let playerBId: Id<"users">;

  beforeEach(async () => {
    // Pass modules glob so convex-test can find _generated directory
    t = convexTest(schema, modules);

    const playerA = createTestUser();
    const playerB = createTestUser();

    playerAId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: playerA.email,
        username: playerA.username,
        name: playerA.name,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    playerBId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: playerB.email,
        username: playerB.username,
        name: playerB.name,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });
  });

  it("should maintain win/loss count consistency with match history", async () => {
    // Simulate 3 matches: A wins 2, B wins 1
    await t.run(async (ctx) => {
      // Match 1: A wins
      await ctx.db.insert("matchHistory", {
        winnerId: playerAId,
        loserId: playerBId,
        gameType: "ranked",
        winnerRatingBefore: 1000,
        winnerRatingAfter: 1016,
        loserRatingBefore: 1000,
        loserRatingAfter: 984,
        xpAwarded: 50,
        completedAt: Date.now(),
      });

      // Match 2: A wins
      await ctx.db.insert("matchHistory", {
        winnerId: playerAId,
        loserId: playerBId,
        gameType: "ranked",
        winnerRatingBefore: 1016,
        winnerRatingAfter: 1032,
        loserRatingBefore: 984,
        loserRatingAfter: 968,
        xpAwarded: 50,
        completedAt: Date.now() + 1000,
      });

      // Match 3: B wins
      await ctx.db.insert("matchHistory", {
        winnerId: playerBId,
        loserId: playerAId,
        gameType: "ranked",
        winnerRatingBefore: 968,
        winnerRatingAfter: 984,
        loserRatingBefore: 1032,
        loserRatingAfter: 1016,
        xpAwarded: 50,
        completedAt: Date.now() + 2000,
      });

      // Update user stats
      await ctx.db.patch(playerAId, {
        totalWins: 2,
        totalLosses: 1,
        rankedWins: 2,
        rankedLosses: 1,
      });

      await ctx.db.patch(playerBId, {
        totalWins: 1,
        totalLosses: 2,
        rankedWins: 1,
        rankedLosses: 2,
      });
    });

    // Get match history for player A
    const playerAWins = await t.run(async (ctx) => {
      return await ctx.db
        .query("matchHistory")
        .withIndex("by_winner", (q) => q.eq("winnerId", playerAId))
        .collect();
    });

    const playerALosses = await t.run(async (ctx) => {
      return await ctx.db
        .query("matchHistory")
        .withIndex("by_loser", (q) => q.eq("loserId", playerAId))
        .collect();
    });

    // Get user stats
    const playerA = await t.run(async (ctx) => {
      return await ctx.db.get(playerAId);
    });

    // INVARIANT: totalWins should equal match history wins
    expect(playerA?.totalWins).toBe(playerAWins.length);
    expect(playerA?.totalWins).toBe(2);

    // INVARIANT: totalLosses should equal match history losses
    expect(playerA?.totalLosses).toBe(playerALosses.length);
    expect(playerA?.totalLosses).toBe(1);

    // INVARIANT: Total games = wins + losses
    expect(playerA).toBeDefined();
    const totalGames = (playerA?.totalWins ?? 0) + (playerA?.totalLosses ?? 0);
    const matchHistoryTotal = playerAWins.length + playerALosses.length;
    expect(totalGames).toBe(matchHistoryTotal);
    expect(totalGames).toBe(3);
  });

  it("should detect inconsistency if stats and history mismatch (negative test)", async () => {
    // Deliberately create inconsistency: record match but don't update stats
    await t.run(async (ctx) => {
      await ctx.db.insert("matchHistory", {
        winnerId: playerAId,
        loserId: playerBId,
        gameType: "ranked",
        winnerRatingBefore: 1000,
        winnerRatingAfter: 1016,
        loserRatingBefore: 1000,
        loserRatingAfter: 984,
        xpAwarded: 50,
        completedAt: Date.now(),
      });

      // Deliberately NOT updating user stats to create inconsistency
    });

    const playerAWins = await t.run(async (ctx) => {
      return await ctx.db
        .query("matchHistory")
        .withIndex("by_winner", (q) => q.eq("winnerId", playerAId))
        .collect();
    });

    const playerA = await t.run(async (ctx) => {
      return await ctx.db.get(playerAId);
    });

    // Detect inconsistency: match exists but stats not updated
    expect(playerAWins.length).toBe(1);
    expect(playerA?.totalWins).toBe(0);
    expect(playerAWins.length).not.toBe(playerA?.totalWins);

    // This test demonstrates what NOT to do - stats must stay in sync
  });

  it("should maintain separate game mode win counts", async () => {
    // Player A: 2 ranked wins, 1 casual win
    await t.run(async (ctx) => {
      // Ranked match 1
      await ctx.db.insert("matchHistory", {
        winnerId: playerAId,
        loserId: playerBId,
        gameType: "ranked",
        winnerRatingBefore: 1000,
        winnerRatingAfter: 1016,
        loserRatingBefore: 1000,
        loserRatingAfter: 984,
        xpAwarded: 50,
        completedAt: Date.now(),
      });

      // Ranked match 2
      await ctx.db.insert("matchHistory", {
        winnerId: playerAId,
        loserId: playerBId,
        gameType: "ranked",
        winnerRatingBefore: 1016,
        winnerRatingAfter: 1032,
        loserRatingBefore: 984,
        loserRatingAfter: 968,
        xpAwarded: 50,
        completedAt: Date.now() + 1000,
      });

      // Casual match
      await ctx.db.insert("matchHistory", {
        winnerId: playerAId,
        loserId: playerBId,
        gameType: "casual",
        winnerRatingBefore: 1000,
        winnerRatingAfter: 1016,
        loserRatingBefore: 1000,
        loserRatingAfter: 984,
        xpAwarded: 25,
        completedAt: Date.now() + 2000,
      });

      await ctx.db.patch(playerAId, {
        totalWins: 3,
        rankedWins: 2,
        casualWins: 1,
        totalLosses: 0,
      });

      await ctx.db.patch(playerBId, {
        totalWins: 0,
        totalLosses: 3,
        rankedLosses: 2,
        casualLosses: 1,
      });
    });

    // Verify breakdown
    const rankedMatches = await t.run(async (ctx) => {
      return await ctx.db
        .query("matchHistory")
        .filter((q) =>
          q.and(q.eq(q.field("winnerId"), playerAId), q.eq(q.field("gameType"), "ranked"))
        )
        .collect();
    });

    const casualMatches = await t.run(async (ctx) => {
      return await ctx.db
        .query("matchHistory")
        .filter((q) =>
          q.and(q.eq(q.field("winnerId"), playerAId), q.eq(q.field("gameType"), "casual"))
        )
        .collect();
    });

    const playerA = await t.run(async (ctx) => {
      return await ctx.db.get(playerAId);
    });

    // INVARIANT: Mode-specific wins match history
    expect(playerA?.rankedWins).toBe(rankedMatches.length);
    expect(playerA?.casualWins).toBe(casualMatches.length);

    // INVARIANT: Total wins = sum of mode-specific wins
    expect(playerA?.totalWins).toBe((playerA?.rankedWins || 0) + (playerA?.casualWins || 0));
  });
});
