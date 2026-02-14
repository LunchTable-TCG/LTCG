/**
 * Phase 1 Test: Per-Card Ownership Validation
 *
 * Tests that deck save validates ownership of each unique card,
 * not just total card count.
 */

import { describe, expect, it } from "vitest";
import { createTestWithComponents } from "../../test.setup";
import { createMinimalValidDeck } from "./testHelpers";

describe("Phase 1: Per-Card Ownership Validation", () => {
  it("should reject deck with more copies than owned", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "deckbuilder",
        email: "deckbuilder@test.com",
        privyId: "privy_deckbuilder",
        createdAt: Date.now(),
      });
    });

    // Create card
    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Dark Magician",
        rarity: "legendary",
        archetype: "neutral",
        cardType: "stereotype",
        cost: 7,
        attack: 250,
        defense: 200,
        flavorText: "Powerful dark mage",
        imageUrl: "dark_magician.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    // Give user only 1 copy
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardId,
        quantity: 1, // User owns only 1
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    // Execute: Try to create deck with 3 copies (should fail ownership check)
    await expect(
      createMinimalValidDeck(t, userId, "privy_deckbuilder", {
        deckName: "Exploit Deck",
        testCards: [{ cardDefinitionId: cardId, quantity: 3 }], // Trying 3 but only own 1
      })
    ).rejects.toThrow(/AUTHZ_RESOURCE_FORBIDDEN|need 3 copies|only own 1/i);
  });

  it("should accept deck when user owns enough copies", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "validplayer",
        email: "validplayer@test.com",
        privyId: "privy_validplayer",
        createdAt: Date.now(),
      });
    });

    // Create cards
    const card1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Fire Dragon",
        rarity: "rare",
        archetype: "neutral",
        cardType: "stereotype",
        cost: 6,
        attack: 200,
        defense: 150,
        flavorText: "Fiery dragon",
        imageUrl: "fire_dragon.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    const card2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Water Spirit",
        rarity: "common",
        archetype: "neutral",
        cardType: "stereotype",
        cost: 3,
        attack: 100,
        defense: 100,
        flavorText: "Water elemental",
        imageUrl: "water_spirit.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    // Give user sufficient copies
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: card1Id,
        quantity: 3, // Owns 3 Fire Dragons
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: card2Id,
        quantity: 10, // Owns 10 Water Spirits
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    // Execute: Create deck with valid quantities
    const { deckId } = await createMinimalValidDeck(t, userId, "privy_validplayer", {
      deckName: "Valid Deck",
      testCards: [
        { cardDefinitionId: card1Id, quantity: 2 }, // Using 2 of 3 owned
        { cardDefinitionId: card2Id, quantity: 3 }, // Using 3 of 10 owned
      ],
    });

    // Verify: Deck was created with correct cards
    const deck = await t.run(async (ctx) => await ctx.db.get(deckId));
    expect(deck?.name).toBe("Valid Deck");
    expect(deck?.userId).toBe(userId);

    const deckCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("deckCards")
        .filter((q) => q.eq(q.field("deckId"), deckId))
        .collect();
    });

    // Should have 27 unique card entries (25 filler + Fire Dragon + Water Spirit)
    // Total quantity: 25 filler (qty 1 each) + 2 Fire Dragons + 3 Water Spirits = 30 cards
    expect(deckCards.length).toBe(27);
  });

  it("should validate each unique card separately", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "multicard",
        email: "multicard@test.com",
        privyId: "privy_multicard",
        createdAt: Date.now(),
      });
    });

    // Create 3 different cards
    const cardIds = [];
    for (let i = 0; i < 3; i++) {
      const cardId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: `Card ${i}`,
          rarity: "common",
          archetype: "neutral",
          cardType: "stereotype",
          cost: 2,
          attack: 50,
          defense: 50,
          flavorText: `Test card ${i}`,
          imageUrl: `card${i}.png`,
          createdAt: Date.now(),
          isActive: true,
        });
      });
      cardIds.push(cardId);
    }

    // Give user different quantities of each card
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardIds[0],
        quantity: 3, // Owns 3 of Card 0
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardIds[1],
        quantity: 1, // Owns only 1 of Card 1
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardIds[2],
        quantity: 2, // Owns 2 of Card 2
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    // Execute: Try to create deck using more of Card 1 than owned
    await expect(
      createMinimalValidDeck(t, userId, "privy_multicard", {
        deckName: "Over-using Card 1",
        testCards: [
          { cardDefinitionId: cardIds[0], quantity: 2 }, // Valid: owns 3
          { cardDefinitionId: cardIds[1], quantity: 3 }, // INVALID: owns only 1
          { cardDefinitionId: cardIds[2], quantity: 1 }, // Valid: owns 2
        ],
      })
    ).rejects.toThrow(/AUTHZ_RESOURCE_FORBIDDEN|need 3 copies|only own 1/i);
  });

  it("should prevent using cards not owned at all", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "cheater",
        email: "cheater@test.com",
        privyId: "privy_cheater",
        createdAt: Date.now(),
      });
    });

    // Create card that user doesn't own
    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Forbidden Card",
        rarity: "legendary",
        archetype: "neutral",
        cardType: "stereotype",
        cost: 10,
        attack: 999,
        defense: 999,
        flavorText: "Not owned by user",
        imageUrl: "forbidden.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    // User has NO inventory record for this card

    // Execute: Try to create deck with card user doesn't own
    await expect(
      createMinimalValidDeck(t, userId, "privy_cheater", {
        deckName: "Cheater Deck",
        testCards: [{ cardDefinitionId: cardId, quantity: 1 }], // Doesn't own any
      })
    ).rejects.toThrow(/AUTHZ_RESOURCE_FORBIDDEN|need 1|only own 0|do not own this card|VALIDATION_5001/i);
  });

  it("should allow deck with exactly owned quantities", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "exact",
        email: "exact@test.com",
        privyId: "privy_exact",
        createdAt: Date.now(),
      });
    });

    // Create card
    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Exact Card",
        rarity: "uncommon",
        archetype: "neutral",
        cardType: "stereotype",
        cost: 4,
        attack: 120,
        defense: 80,
        flavorText: "Exactly owned",
        imageUrl: "exact.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    // Give user exactly 3 copies
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardId,
        quantity: 3,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    // Execute: Create deck using all 3 copies (should succeed)
    const { deckId } = await createMinimalValidDeck(t, userId, "privy_exact", {
      deckName: "Exact Match Deck",
      testCards: [{ cardDefinitionId: cardId, quantity: 3 }], // Using exactly what's owned
    });

    // Verify: Deck created successfully
    const deck = await t.run(async (ctx) => await ctx.db.get(deckId));
    expect(deck?.name).toBe("Exact Match Deck");
  });
});
