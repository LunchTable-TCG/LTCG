import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../functions";

/**
 * Internal mutation for seeding test decks in E2E tests.
 * Creates a deck and populates it with cards from the deckCards table.
 *
 * @param userId - The user ID who owns the deck
 * @param name - The deck name
 * @param cardIds - Array of card definition IDs to add to the deck
 * @returns The created deck ID
 */
export const seedTestDeck = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    cardIds: v.array(v.id("cardDefinitions")),
  },
  handler: async (ctx, args) => {
    // Create the deck
    const deckId = await ctx.db.insert("userDecks", {
      userId: args.userId,
      name: args.name,
      description: "Test deck for E2E testing",
      deckArchetype: undefined,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Count card quantities for deckCards table
    const cardQuantities = new Map<string, number>();
    for (const cardId of args.cardIds) {
      const count = cardQuantities.get(cardId) || 0;
      cardQuantities.set(cardId, count + 1);
    }

    // Insert cards into deckCards table
    for (const [cardId, quantity] of cardQuantities.entries()) {
      await ctx.db.insert("deckCards", {
        deckId,
        cardDefinitionId: cardId as Id<"cardDefinitions">, // Map key is string, needs conversion to Id
        quantity,
        position: undefined,
      });
    }

    return deckId;
  },
});
