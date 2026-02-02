/**
 * Deck System Tests
 *
 * Tests deck creation, validation, saving, and management.
 * Covers happy paths, validation errors, and edge cases.
 */

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "@convex/_generated/api";
import schema from "@convex/schema";
import { modules } from "@convex/test.setup";
import type { MutationCtx } from "@convex/_generated/server";

// Type helper to avoid TS2589 deep instantiation errors with Convex API
// @ts-ignore - Suppress TS2589 for api cast
// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const apiAny = api as any;
const coreDecks = apiAny["core/decks"];

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

describe("createDeck", () => {
  it("should create empty deck successfully", async () => {
    const t = createTestInstance();

    // Create test user first
    const { userId, privyId } = await createTestUser(t, "deck@test.com", "deckbuilder");

    // Set up authenticated context with the privyId
    const asUser = t.withIdentity({ subject: privyId });

    // Use proper API call pattern
    const result = await asUser.mutation(coreDecks.createDeck, {
      name: "My First Deck",
      description: "Test deck",
    });

    expect(result.deckId).toBeDefined();

    const deck = (await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.get(result.deckId);
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion to avoid union type issues
    })) as any;

    expect(deck?.name).toBe("My First Deck");
    expect(deck?.description).toBe("Test deck");
    expect(deck?.isActive).toBe(true);
  });

  it("should reject empty deck name", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "empty@test.com", "emptyname");

    const asUser = t.withIdentity({ subject: privyId });

    await expect(
      asUser.mutation(coreDecks.createDeck, {
        name: "   ", // Empty after trim
      })
    ).rejects.toThrowError(/Invalid input/);
  });

  it("should reject deck name over 50 characters", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "long@test.com", "longname");

    const asUser = t.withIdentity({ subject: privyId });

    await expect(
      asUser.mutation(coreDecks.createDeck, {
        name: "A".repeat(51), // 51 characters
      })
    ).rejects.toThrowError(/Invalid input/);
  });

  it("should enforce 50 deck limit", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "many@test.com", "manydeck");

    const asUser = t.withIdentity({ subject: privyId });

    // Create 50 decks
    await t.run(async (ctx: MutationCtx) => {
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
      asUser.mutation(coreDecks.createDeck, {
        name: "Deck 51",
      })
    ).rejects.toThrowError(/Invalid input/);
  });
});

describe("saveDeck", () => {
  it("should save deck with valid cards", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "save@test.com", "saver");

    const asUser = t.withIdentity({ subject: privyId });

    // Create 30 cards for minimum deck size
    const cardIds = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Test Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await asUser.mutation(coreDecks.saveDeck, {
      deckId,
      cards: cardIds.map((id: string) => ({
        cardDefinitionId: id,
        quantity: 3, // 10 cards * 3 = 30 total
      })),
    });

    expect(result.success).toBe(true);

    // Verify deck cards were saved
    const deckCards = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", deckId))
        .collect();
    });

    expect(deckCards).toHaveLength(10);
    // biome-ignore lint/suspicious/noExplicitAny: Test type workaround for query results
    expect(deckCards.reduce((sum: number, dc: any) => sum + dc.quantity, 0)).toBe(30);
  });

  it("should reject deck under minimum size", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "small@test.com", "smalldeck");

    const asUser = t.withIdentity({ subject: privyId });

    const cardId = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Small Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(coreDecks.saveDeck, {
        deckId,
        cards: [
          {
            cardDefinitionId: cardId,
            quantity: 20, // Only 20 cards, need 30 minimum
          },
        ],
      })
    ).rejects.toThrowError(/Invalid deck configuration/);
  });

  it("should reject deck over maximum size", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "big@test.com", "bigdeck");

    const asUser = t.withIdentity({ subject: privyId });

    // Create 21 different cards (21 * 3 = 63 cards, exceeds 60 max)
    const cardIds = await t.run(async (ctx: MutationCtx) => {
      const ids = [];
      for (let i = 0; i < 21; i++) {
        const cardDefId = await ctx.db.insert("cardDefinitions", {
          name: `Big Card ${i}`,
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Big Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(coreDecks.saveDeck, {
        deckId,
        cards: cardIds.map((id: string) => ({
          cardDefinitionId: id,
          quantity: 3, // 21 cards * 3 = 63 total, exceeds 60 max
        })),
      })
    ).rejects.toThrowError(/Invalid deck configuration/);
  });

  it("should reject card over max copies limit", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "copy@test.com", "copylimit");

    const asUser = t.withIdentity({ subject: privyId });

    const cardId = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Copy Limit Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(coreDecks.saveDeck, {
        deckId,
        cards: [
          {
            cardDefinitionId: cardId,
            quantity: 4, // Max is 3 copies
          },
        ],
      })
    ).rejects.toThrowError(/Invalid deck configuration/);
  });

  it("should enforce legendary card limit of 1", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "legendary@test.com", "legendary");

    const asUser = t.withIdentity({ subject: privyId });

    const legendaryCardId = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Legendary Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(coreDecks.saveDeck, {
        deckId,
        cards: [
          {
            cardDefinitionId: legendaryCardId,
            quantity: 2, // Legendary max is 1
          },
        ],
      })
    ).rejects.toThrowError(/Invalid deck configuration/);
  });

  it("should reject cards not owned by player", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "notowned@test.com", "notowned");

    const asUser = t.withIdentity({ subject: privyId });

    const cardId = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Invalid Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(coreDecks.saveDeck, {
        deckId,
        cards: [
          {
            cardDefinitionId: cardId,
            quantity: 3,
          },
        ],
      })
    ).rejects.toThrowError(/Invalid deck configuration/);
  });

  it("should auto-set as active deck if user has none", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "first@test.com", "firstdeck");

    const asUser = t.withIdentity({ subject: privyId });

    const cardIds = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "First Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await asUser.mutation(coreDecks.saveDeck, {
      deckId,
      cards: cardIds.map((id: string) => ({
        cardDefinitionId: id,
        quantity: 3,
      })),
    });

    const user = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.activeDeckId).toBe(deckId);
  });
});

describe("validateDeck", () => {
  it("should validate legal deck", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "valid@test.com", "validator");

    const asUser = t.withIdentity({ subject: privyId });

    const cardIds = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
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

    const result = await asUser.query(coreDecks.validateDeck, { deckId });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.totalCards).toBe(30);
  });

  it("should detect deck under minimum size", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "smallvalid@test.com", "smallvalidator");

    const asUser = t.withIdentity({ subject: privyId });

    const cardId = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
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

    const result = await asUser.query(coreDecks.validateDeck, { deckId });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should detect deck over maximum size", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "maxvalid@test.com", "maxvalidator");

    const asUser = t.withIdentity({ subject: privyId });

    // Create 21 different cards (21 * 3 = 63 cards, exceeds 60 max)
    const cardIds = await t.run(async (ctx: MutationCtx) => {
      const ids = [];
      for (let i = 0; i < 21; i++) {
        const cardDefId = await ctx.db.insert("cardDefinitions", {
          name: `Max Card ${i}`,
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      const id = await ctx.db.insert("userDecks", {
        userId,
        name: "Max Size Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (const cardId of cardIds) {
        await ctx.db.insert("deckCards", {
          deckId: id,
          cardDefinitionId: cardId,
          quantity: 3, // 21 * 3 = 63 cards, exceeds 60 max
        });
      }

      return id;
    });

    const result = await asUser.query(coreDecks.validateDeck, { deckId });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("cannot exceed 60 cards");
    expect(result.totalCards).toBe(63);
  });

  it("should detect too many copies", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "copycheck@test.com", "copychecker");

    const asUser = t.withIdentity({ subject: privyId });

    const cardId = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
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

    const result = await asUser.query(coreDecks.validateDeck, { deckId });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Limited to 3 copies");
  });
});

describe("deleteDeck", () => {
  it("should soft delete deck", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "delete@test.com", "deleter");

    const asUser = t.withIdentity({ subject: privyId });

    const deckId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "To Delete",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await asUser.mutation(coreDecks.deleteDeck, { deckId });

    expect(result.success).toBe(true);

    const deck = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.get(deckId);
    });

    expect(deck?.isActive).toBe(false);
  });
});

describe("duplicateDeck", () => {
  it("should duplicate deck with all cards", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "duplicate@test.com", "duplicator");

    const asUser = t.withIdentity({ subject: privyId });

    const cardIds = await t.run(async (ctx: MutationCtx) => {
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

    const originalDeckId = await t.run(async (ctx: MutationCtx) => {
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

    const result = await asUser.mutation(coreDecks.duplicateDeck, {
      sourceDeckId: originalDeckId,
      newName: "Duplicated Deck",
    });

    expect(result.deckId).toBeDefined();
    expect(result.deckId).not.toBe(originalDeckId);

    const newDeck = (await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.get(result.deckId);
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion to avoid union type issues
    })) as any;

    expect(newDeck?.name).toBe("Duplicated Deck");
    expect(newDeck?.description).toBe("Original description");

    const newDeckCards = await t.run(async (ctx: MutationCtx) => {
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

    const { userId, privyId } = await createTestUser(t, "active@test.com", "activesetter");

    const asUser = t.withIdentity({ subject: privyId });

    const cardIds = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
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

    const result = await asUser.mutation(coreDecks.setActiveDeck, { deckId });

    expect(result.success).toBe(true);

    const user = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.activeDeckId).toBe(deckId);
  });

  it("should reject deck under minimum size", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "smallactive@test.com", "smallactive");

    const asUser = t.withIdentity({ subject: privyId });

    const cardId = await t.run(async (ctx: MutationCtx) => {
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
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

    await expect(asUser.mutation(coreDecks.setActiveDeck, { deckId })).rejects.toThrowError(
      /Invalid input/
    );
  });

  it("should reject deck over maximum size", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "bigactive@test.com", "bigactive");

    const asUser = t.withIdentity({ subject: privyId });

    // Create 21 different cards (21 * 3 = 63 cards, exceeds 60 max)
    const cardIds = await t.run(async (ctx: MutationCtx) => {
      const ids = [];
      for (let i = 0; i < 21; i++) {
        const cardDefId = await ctx.db.insert("cardDefinitions", {
          name: `Big Active Card ${i}`,
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

    const deckId = await t.run(async (ctx: MutationCtx) => {
      const id = await ctx.db.insert("userDecks", {
        userId,
        name: "Big Active Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (const cardId of cardIds) {
        await ctx.db.insert("deckCards", {
          deckId: id,
          cardDefinitionId: cardId,
          quantity: 3, // 21 * 3 = 63 cards, exceeds 60 max
        });
      }

      return id;
    });

    await expect(asUser.mutation(coreDecks.setActiveDeck, { deckId })).rejects.toThrowError(
      /Invalid input/
    );
  });
});
