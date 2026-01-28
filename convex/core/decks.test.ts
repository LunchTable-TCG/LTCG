/**
 * Deck System Tests
 *
 * Tests deck creation, validation, saving, and management.
 * Covers happy paths, validation errors, and edge cases.
 */

import { describe, expect, it } from "vitest";
import { createTestInstance } from "../../convex_test_utils/setup";

describe("createDeck", () => {
  it("should create empty deck successfully", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "deckbuilder",
        email: "deck@test.com",
        createdAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { createDeck } = await import("./decks");
      return await createDeck(ctx, {
        name: "My First Deck",
        description: "Test deck",
      });
    });

    expect(result.deckId).toBeDefined();

    const deck = await t.run(async (ctx) => {
      return await ctx.db.get(result.deckId);
    });

    expect(deck?.name).toBe("My First Deck");
    expect(deck?.description).toBe("Test deck");
    expect(deck?.isActive).toBe(true);
  });

  it("should reject empty deck name", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "emptyname",
        email: "empty@test.com",
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { createDeck } = await import("./decks");
        return await createDeck(ctx, {
          name: "   ", // Empty after trim
        });
      })
    ).rejects.toThrowError(/Deck name cannot be empty/);
  });

  it("should reject deck name over 50 characters", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "longname",
        email: "long@test.com",
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { createDeck } = await import("./decks");
        return await createDeck(ctx, {
          name: "A".repeat(51), // 51 characters
        });
      })
    ).rejects.toThrowError(/cannot exceed 50 characters/);
  });

  it("should enforce 50 deck limit", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "manydeck",
        email: "many@test.com",
        createdAt: Date.now(),
      });
    });

    // Create 50 decks
    await t.run(async (ctx) => {
      for (let i = 0; i < 50; i++) {
        await ctx.db.insert("userDecks", {
          userId,
          name: `Deck ${i}`,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    });

    // Try to create 51st deck
    await expect(
      t.run(async (ctx) => {
        const { createDeck } = await import("./decks");
        return await createDeck(ctx, {
          name: "Deck 51",
        });
      })
    ).rejects.toThrowError(/Cannot exceed 50 decks/);
  });
});

describe("saveDeck", () => {
  it("should save deck with valid cards", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "saver",
        email: "save@test.com",
        createdAt: Date.now(),
      });
    });

    // Create 30 cards for minimum deck size
    const cardIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 10; i++) {
        const cardDefId = await ctx.db.insert("cardDefinitions", {
          name: `Card ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 3,
          attack: 1500,
          defense: 1000,
          isActive: true,
          createdAt: Date.now(),
        });

        // Add to player's collection (3 copies each)
        await ctx.db.insert("playerCards", {
          userId,
          cardDefinitionId: cardDefId,
          quantity: 3,
          isFavorite: false,
          acquiredAt: Date.now(),
          lastUpdatedAt: Date.now(),
        });

        ids.push(cardDefId);
      }
      return ids;
    });

    const deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Test Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { saveDeck } = await import("./decks");
      return await saveDeck(ctx, {
        deckId,
        cards: cardIds.map((id) => ({
          cardDefinitionId: id,
          quantity: 3, // 10 cards * 3 = 30 total
        })),
      });
    });

    expect(result.success).toBe(true);

    // Verify deck cards were saved
    const deckCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", deckId))
        .collect();
    });

    expect(deckCards).toHaveLength(10);
    expect(deckCards.reduce((sum, dc) => sum + dc.quantity, 0)).toBe(30);
  });

  it("should reject deck under minimum size", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "smalldeck",
        email: "small@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      const cardDefId = await ctx.db.insert("cardDefinitions", {
        name: "Single Card",
        rarity: "common",
        cardType: "creature",
        archetype: "neutral",
        cost: 3,
        attack: 1500,
        defense: 1000,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardDefId,
        quantity: 10,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      return cardDefId;
    });

    const deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Small Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { saveDeck } = await import("./decks");
        return await saveDeck(ctx, {
          deckId,
          cards: [
            {
              cardDefinitionId: cardId,
              quantity: 20, // Only 20 cards, need 30 minimum
            },
          ],
        });
      })
    ).rejects.toThrowError(/must have at least 30 cards/);
  });

  it("should reject card over max copies limit", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "copylimit",
        email: "copy@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      const cardDefId = await ctx.db.insert("cardDefinitions", {
        name: "Limited Card",
        rarity: "rare",
        cardType: "creature",
        archetype: "neutral",
        cost: 5,
        attack: 2000,
        defense: 1500,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardDefId,
        quantity: 10,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      return cardDefId;
    });

    const deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Copy Limit Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { saveDeck } = await import("./decks");
        return await saveDeck(ctx, {
          deckId,
          cards: [
            {
              cardDefinitionId: cardId,
              quantity: 4, // Max is 3 copies
            },
          ],
        });
      })
    ).rejects.toThrowError(/Limited to 3 copies per deck/);
  });

  it("should enforce legendary card limit of 1", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "legendary",
        email: "legendary@test.com",
        createdAt: Date.now(),
      });
    });

    const legendaryCardId = await t.run(async (ctx) => {
      const cardDefId = await ctx.db.insert("cardDefinitions", {
        name: "Legendary Dragon",
        rarity: "legendary",
        cardType: "creature",
        archetype: "neutral",
        cost: 8,
        attack: 3000,
        defense: 2500,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardDefId,
        quantity: 3,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      return cardDefId;
    });

    const deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Legendary Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { saveDeck } = await import("./decks");
        return await saveDeck(ctx, {
          deckId,
          cards: [
            {
              cardDefinitionId: legendaryCardId,
              quantity: 2, // Legendary max is 1
            },
          ],
        });
      })
    ).rejects.toThrowError(/Legendary cards limited to 1 copy/);
  });

  it("should reject cards not owned by player", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "notowned",
        email: "notowned@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Not Owned Card",
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

    const deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Invalid Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { saveDeck } = await import("./decks");
        return await saveDeck(ctx, {
          deckId,
          cards: [
            {
              cardDefinitionId: cardId,
              quantity: 3,
            },
          ],
        });
      })
    ).rejects.toThrowError(/only own 0 copies/);
  });

  it("should auto-set as active deck if user has none", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "firstdeck",
        email: "first@test.com",
        createdAt: Date.now(),
      });
    });

    const cardIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 10; i++) {
        const cardDefId = await ctx.db.insert("cardDefinitions", {
          name: `Card ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 3,
          attack: 1500,
          defense: 1000,
          isActive: true,
          createdAt: Date.now(),
        });

        await ctx.db.insert("playerCards", {
          userId,
          cardDefinitionId: cardDefId,
          quantity: 3,
          isFavorite: false,
          acquiredAt: Date.now(),
          lastUpdatedAt: Date.now(),
        });

        ids.push(cardDefId);
      }
      return ids;
    });

    const deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "First Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      const { saveDeck } = await import("./decks");
      return await saveDeck(ctx, {
        deckId,
        cards: cardIds.map((id) => ({
          cardDefinitionId: id,
          quantity: 3,
        })),
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.activeDeckId).toBe(deckId);
  });
});

describe("validateDeck", () => {
  it("should validate legal deck", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "validator",
        email: "valid@test.com",
        createdAt: Date.now(),
      });
    });

    const cardIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 10; i++) {
        const cardDefId = await ctx.db.insert("cardDefinitions", {
          name: `Valid Card ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 3,
          attack: 1500,
          defense: 1000,
          isActive: true,
          createdAt: Date.now(),
        });
        ids.push(cardDefId);
      }
      return ids;
    });

    const deckId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("userDecks", {
        userId,
        name: "Valid Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (const cardId of cardIds) {
        await ctx.db.insert("deckCards", {
          deckId: id,
          cardDefinitionId: cardId,
          quantity: 3,
        });
      }

      return id;
    });

    const result = await t.run(async (ctx) => {
      const { validateDeck } = await import("./decks");
      return await validateDeck(ctx, { deckId });
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.totalCards).toBe(30);
  });

  it("should detect deck under minimum size", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "smallvalidator",
        email: "smallvalid@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Card",
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

    const deckId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("userDecks", {
        userId,
        name: "Small Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("deckCards", {
        deckId: id,
        cardDefinitionId: cardId,
        quantity: 20, // Under 30
      });

      return id;
    });

    const result = await t.run(async (ctx) => {
      const { validateDeck } = await import("./decks");
      return await validateDeck(ctx, { deckId });
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("at least 30 cards");
  });

  it("should detect too many copies", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "copychecker",
        email: "copycheck@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Over Limit Card",
        rarity: "rare",
        cardType: "creature",
        archetype: "neutral",
        cost: 5,
        attack: 2000,
        defense: 1500,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const deckId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("userDecks", {
        userId,
        name: "Invalid Copy Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("deckCards", {
        deckId: id,
        cardDefinitionId: cardId,
        quantity: 4, // Over limit of 3
      });

      return id;
    });

    const result = await t.run(async (ctx) => {
      const { validateDeck } = await import("./decks");
      return await validateDeck(ctx, { deckId });
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Limited to 3 copies");
  });
});

describe("deleteDeck", () => {
  it("should soft delete deck", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "deleter",
        email: "delete@test.com",
        createdAt: Date.now(),
      });
    });

    const deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "To Delete",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { deleteDeck } = await import("./decks");
      return await deleteDeck(ctx, { deckId });
    });

    expect(result.success).toBe(true);

    const deck = await t.run(async (ctx) => {
      return await ctx.db.get(deckId);
    });

    expect(deck?.isActive).toBe(false);
  });
});

describe("duplicateDeck", () => {
  it("should duplicate deck with all cards", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "duplicator",
        email: "duplicate@test.com",
        createdAt: Date.now(),
      });
    });

    const cardIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 10; i++) {
        const cardDefId = await ctx.db.insert("cardDefinitions", {
          name: `Dup Card ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 3,
          attack: 1500,
          defense: 1000,
          isActive: true,
          createdAt: Date.now(),
        });
        ids.push(cardDefId);
      }
      return ids;
    });

    const originalDeckId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("userDecks", {
        userId,
        name: "Original Deck",
        description: "Original description",
        deckArchetype: "neutral",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (const cardId of cardIds) {
        await ctx.db.insert("deckCards", {
          deckId: id,
          cardDefinitionId: cardId,
          quantity: 3,
        });
      }

      return id;
    });

    const result = await t.run(async (ctx) => {
      const { duplicateDeck } = await import("./decks");
      return await duplicateDeck(ctx, {
        sourceDeckId: originalDeckId,
        newName: "Duplicated Deck",
      });
    });

    expect(result.deckId).toBeDefined();
    expect(result.deckId).not.toBe(originalDeckId);

    const newDeck = await t.run(async (ctx) => {
      return await ctx.db.get(result.deckId);
    });

    expect(newDeck?.name).toBe("Duplicated Deck");
    expect(newDeck?.description).toBe("Original description");

    const newDeckCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", result.deckId))
        .collect();
    });

    expect(newDeckCards).toHaveLength(10);
  });
});

describe("setActiveDeck", () => {
  it("should set deck as active", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "activesetter",
        email: "active@test.com",
        createdAt: Date.now(),
      });
    });

    const cardIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 10; i++) {
        const cardDefId = await ctx.db.insert("cardDefinitions", {
          name: `Active Card ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 3,
          attack: 1500,
          defense: 1000,
          isActive: true,
          createdAt: Date.now(),
        });
        ids.push(cardDefId);
      }
      return ids;
    });

    const deckId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("userDecks", {
        userId,
        name: "Active Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (const cardId of cardIds) {
        await ctx.db.insert("deckCards", {
          deckId: id,
          cardDefinitionId: cardId,
          quantity: 3,
        });
      }

      return id;
    });

    const result = await t.run(async (ctx) => {
      const { setActiveDeck } = await import("./decks");
      return await setActiveDeck(ctx, { deckId });
    });

    expect(result.success).toBe(true);

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.activeDeckId).toBe(deckId);
  });

  it("should reject deck under minimum size", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "smallactive",
        email: "smallactive@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Card",
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

    const deckId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("userDecks", {
        userId,
        name: "Small Active",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("deckCards", {
        deckId: id,
        cardDefinitionId: cardId,
        quantity: 20, // Under 30
      });

      return id;
    });

    await expect(
      t.run(async (ctx) => {
        const { setActiveDeck } = await import("./decks");
        return await setActiveDeck(ctx, { deckId });
      })
    ).rejects.toThrowError(/must have at least 30 cards/);
  });
});
