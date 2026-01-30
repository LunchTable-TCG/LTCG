import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, internalQuery } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { archetypeToElement, batchFetchCardDefinitions } from "../lib/helpers";
import {
  deckStatsValidator,
  deckWithCardsValidator,
  deckWithCountValidator,
} from "../lib/returnValidators";
import { validateCardOwnership, validateDeckSize, validateStringLength } from "../lib/validation";
import {
  ABYSSAL_DEPTHS_CARDS,
  INFERNAL_DRAGONS_CARDS,
  IRON_LEGION_CARDS,
  STORM_RIDERS_CARDS,
} from "../seeds/starterCards";
import { STARTER_DECKS } from "../seeds/starterDecks";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DECKS_PER_USER = 50;
const MIN_DECK_SIZE = 30;
const MAX_DECK_SIZE = 60; // Standard TCG limit
const MAX_COPIES_PER_CARD = 3;
const MAX_LEGENDARY_COPIES = 1;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all decks for the current user.
 * Returns all active decks with card counts, sorted by most recently updated.
 *
 * @deprecated Use getUserDecksPaginated for better performance with many decks
 * @returns Array of decks with basic info and card counts
 *
 * NOTE: This performs in-memory sorting since the schema lacks a composite index
 * on (userId, isActive, updatedAt). For optimal performance at scale, consider
 * adding: .index("by_user_active_updatedAt", ["userId", "isActive", "updatedAt"])
 * However, given the 50-deck limit per user, in-memory sorting is acceptable here.
 */
export const getUserDecks = query({
  args: {},
  returns: v.array(deckWithCountValidator), // Deck with card count
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get all active decks for this user
    const decks = await ctx.db
      .query("userDecks")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .take(50); // Most users won't have >50 decks

    // Get card counts for each deck
    const decksWithCounts = await Promise.all(
      decks.map(async (deck) => {
        const deckCards = await ctx.db
          .query("deckCards")
          .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
          .take(50); // Reasonable limit per deck

        const cardCount = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);

        return {
          id: deck._id,
          name: deck.name,
          description: deck.description,
          deckArchetype: deck.deckArchetype,
          cardCount,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
        };
      })
    );

    // Sort by most recently updated (in-memory)
    return decksWithCounts.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Internal query for HTTP handlers that accepts userId directly.
 * Used by HTTP layer with API key auth (doesn't use Convex auth context).
 */
export const getUserDecksInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all active decks for this user
    const decks = await ctx.db
      .query("userDecks")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .take(50);

    // Get card counts for each deck
    const decksWithCounts = await Promise.all(
      decks.map(async (deck) => {
        const deckCards = await ctx.db
          .query("deckCards")
          .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
          .take(50);

        const cardCount = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);

        return {
          _id: deck._id,
          name: deck.name,
          description: deck.description,
          archetype: deck.deckArchetype,
          cards: [], // Empty for list view, use getDeckWithCards for full cards
          isValid: true,
          isActive: deck.isActive,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
          cardCount,
        };
      })
    );

    return decksWithCounts.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get user decks with cursor-based pagination.
 * Uses Convex's built-in pagination for better performance and scalability.
 * Returns paginated results sorted by most recently updated.
 *
 * @param paginationOpts - Cursor-based pagination options
 * @returns Paginated deck list with card counts and cursor for next page
 */
export const getUserDecksPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get paginated decks
    const result = await ctx.db
      .query("userDecks")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .paginate(args.paginationOpts);

    // Get card counts for each deck in the current page
    const decksWithCounts = await Promise.all(
      result.page.map(async (deck) => {
        const deckCards = await ctx.db
          .query("deckCards")
          .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
          .collect();

        const cardCount = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);

        return {
          id: deck._id,
          name: deck.name,
          description: deck.description,
          deckArchetype: deck.deckArchetype,
          cardCount,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
        };
      })
    );

    // Sort by most recently updated
    const sorted = decksWithCounts.sort((a, b) => b.updatedAt - a.updatedAt);

    return {
      ...result,
      page: sorted,
    };
  },
});

/**
 * Get a specific deck with all its cards.
 * Returns complete deck information including all card definitions and quantities.
 *
 * @param deckId - ID of the deck to retrieve
 * @returns Deck with full card list including stats and abilities
 * @throws AUTHZ_RESOURCE_FORBIDDEN if deck not found or not owned by user
 *
 * NOTE: This uses N+1 queries to fetch card definitions. This is acceptable because:
 * (1) Decks are limited to 50 unique card types (typical decks have 15-30 unique cards),
 * (2) Convex optimizes concurrent db.get() calls within Promise.all(),
 * (3) Card definitions are frequently accessed and likely cached.
 * For >100 cards or high-frequency queries, consider using a dataloader pattern.
 */
export const getDeckWithCards = query({
  args: {
    deckId: v.id("userDecks"),
  },
  returns: deckWithCardsValidator, // Deck with full card list
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get the deck
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId || !deck.isActive) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Deck not found or not owned by user",
      });
    }

    // Get all cards in the deck
    const deckCards = await ctx.db
      .query("deckCards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .take(50); // Reasonable limit per deck

    // Join with card definitions (N+1 acceptable for small N=50 max)
    const cardsWithDefinitions = (
      await Promise.all(
        deckCards.map(async (dc) => {
          const cardDef = await ctx.db.get(dc.cardDefinitionId);
          if (!cardDef || !cardDef.isActive) return null;

          return {
            cardDefinitionId: dc.cardDefinitionId,
            name: cardDef.name,
            rarity: cardDef.rarity,
            archetype: cardDef.archetype,
            element: archetypeToElement(cardDef.archetype),
            cardType: cardDef.cardType,
            attack: cardDef.attack,
            defense: cardDef.defense,
            cost: cardDef.cost,
            ability: cardDef.ability,
            flavorText: cardDef.flavorText,
            imageUrl: cardDef.imageUrl,
            quantity: dc.quantity,
            position: dc.position,
          };
        })
      )
    ).filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      id: deck._id,
      name: deck.name,
      description: deck.description,
      deckArchetype: deck.deckArchetype,
      cards: cardsWithDefinitions,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    };
  },
});

/**
 * Get statistical breakdown of a deck.
 * Returns element distribution, rarity counts, average cost, and card type counts.
 *
 * @param deckId - ID of the deck to analyze
 * @returns Deck statistics including element/rarity distribution and card type breakdown
 * @throws AUTHZ_RESOURCE_FORBIDDEN if deck not found or not owned by user
 */
export const getDeckStats = query({
  args: {
    deckId: v.id("userDecks"),
  },
  returns: deckStatsValidator, // Deck statistics
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get the deck
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId || !deck.isActive) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Deck not found or not owned by user",
      });
    }

    // Get all cards in the deck
    const deckCards = await ctx.db
      .query("deckCards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .take(50); // Reasonable limit per deck

    // Initialize counters
    const elementCounts: Record<string, number> = {
      fire: 0,
      water: 0,
      earth: 0,
      wind: 0,
      neutral: 0,
    };
    const rarityCounts: Record<string, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };
    let totalCost = 0;
    let creatureCount = 0;
    let spellCount = 0;
    let trapCount = 0;
    let equipmentCount = 0;
    let totalCards = 0;

    // Batch fetch all card definitions
    const cardDefMap = await batchFetchCardDefinitions(
      ctx,
      deckCards.map((dc) => dc.cardDefinitionId)
    );

    // Calculate statistics
    for (const dc of deckCards) {
      const cardDef = cardDefMap.get(dc.cardDefinitionId);
      if (!cardDef || !cardDef.isActive) continue;

      const quantity = dc.quantity;
      totalCards += quantity;

      elementCounts[cardDef.archetype] = (elementCounts[cardDef.archetype] || 0) + quantity;
      rarityCounts[cardDef.rarity] = (rarityCounts[cardDef.rarity] || 0) + quantity;
      totalCost += cardDef.cost * quantity;

      if (cardDef.cardType === "creature") creatureCount += quantity;
      else if (cardDef.cardType === "spell") spellCount += quantity;
      else if (cardDef.cardType === "trap") trapCount += quantity;
      else if (cardDef.cardType === "equipment") equipmentCount += quantity;
    }

    return {
      elementCounts,
      rarityCounts,
      avgCost: totalCards > 0 ? (totalCost / totalCards).toFixed(1) : "0",
      creatureCount,
      spellCount,
      trapCount,
      equipmentCount,
      totalCards,
    };
  },
});

/**
 * Validate a deck against game rules.
 * Checks minimum deck size (30 cards), card copy limits, and legendary restrictions.
 *
 * @param deckId - ID of the deck to validate
 * @returns Validation result with errors, warnings, and total card count
 * @throws AUTHZ_RESOURCE_FORBIDDEN if deck not found or not owned by user
 */
export const validateDeck = query({
  args: {
    deckId: v.id("userDecks"),
  },
  returns: v.object({
    isValid: v.boolean(),
    errors: v.array(v.string()),
    warnings: v.array(v.string()),
    totalCards: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get the deck
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId || !deck.isActive) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Deck not found or not owned by user",
      });
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Get all cards in the deck
    const deckCards = await ctx.db
      .query("deckCards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .take(50); // Reasonable limit per deck

    // Batch fetch all card definitions
    const cardDefMap = await batchFetchCardDefinitions(
      ctx,
      deckCards.map((dc) => dc.cardDefinitionId)
    );

    // Check total card count
    let totalCards = 0;
    const cardCounts = new Map<string, { quantity: number; rarity: string; name: string }>();

    for (const dc of deckCards) {
      const cardDef = cardDefMap.get(dc.cardDefinitionId);
      if (!cardDef || !cardDef.isActive) {
        errors.push(`Invalid card in deck: ${dc.cardDefinitionId}`);
        continue;
      }

      totalCards += dc.quantity;
      cardCounts.set(dc.cardDefinitionId, {
        quantity: dc.quantity,
        rarity: cardDef.rarity,
        name: cardDef.name,
      });

      // Check individual card copy limits
      if (cardDef.rarity === "legendary" && dc.quantity > MAX_LEGENDARY_COPIES) {
        errors.push(`${cardDef.name}: Legendary cards limited to ${MAX_LEGENDARY_COPIES} copy`);
      } else if (dc.quantity > MAX_COPIES_PER_CARD) {
        errors.push(`${cardDef.name}: Limited to ${MAX_COPIES_PER_CARD} copies per deck`);
      }
    }

    // Check deck size (minimum 30, maximum 60)
    if (totalCards < MIN_DECK_SIZE) {
      errors.push(`Deck needs at least ${MIN_DECK_SIZE} cards. Currently has ${totalCards}.`);
    }
    if (totalCards > MAX_DECK_SIZE) {
      errors.push(`Deck cannot exceed ${MAX_DECK_SIZE} cards. Currently has ${totalCards}.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalCards,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new empty deck.
 * Creates a deck with the specified name and optional description.
 *
 * @param name - Deck name (1-50 characters)
 * @param description - Optional deck description
 * @returns Object containing the new deck ID
 * @throws VALIDATION_INVALID_INPUT if name invalid or deck limit exceeded (50 decks max)
 */
export const createDeck = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({
    deckId: v.id("userDecks"),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Validate deck name using validation helper
    validateStringLength(args.name, 1, 50, "Deck name");

    // Check deck limit
    const existingDecks = await ctx.db
      .query("userDecks")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .take(50); // Most users won't have >50 decks

    if (existingDecks.length >= MAX_DECKS_PER_USER) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Cannot exceed ${MAX_DECKS_PER_USER} decks per user`,
      });
    }

    // Create the deck
    const deckId = await ctx.db.insert("userDecks", {
      userId,
      name: args.name.trim(),
      description: args.description,
      deckArchetype: undefined,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { deckId };
  },
});

/**
 * Save or update a deck's card list.
 * Replaces all cards in the deck with the provided list.
 * Validates ownership, card copy limits, and minimum deck size (30 cards).
 *
 * @param deckId - ID of the deck to update
 * @param cards - Array of card IDs and quantities to include in the deck
 * @returns Success indicator
 * @throws AUTHZ_RESOURCE_FORBIDDEN if deck not owned by user
 * @throws VALIDATION_INVALID_INPUT if deck size < 30, card limits exceeded, or cards not owned
 */
export const saveDeck = mutation({
  args: {
    deckId: v.id("userDecks"),
    cards: v.array(
      v.object({
        cardDefinitionId: v.id("cardDefinitions"),
        quantity: v.number(),
      })
    ),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the deck
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId || !deck.isActive) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Deck not found or not owned by user",
      });
    }

    // Expand cards array to include duplicates for deck size validation
    const expandedCardIds: Id<"cardDefinitions">[] = [];
    for (const card of args.cards) {
      for (let i = 0; i < card.quantity; i++) {
        expandedCardIds.push(card.cardDefinitionId);
      }
    }

    // Validate deck size (minimum 30, maximum 60)
    validateDeckSize(expandedCardIds, MIN_DECK_SIZE, MAX_DECK_SIZE);

    // Validate card ownership
    await validateCardOwnership(ctx, userId, args.cards);

    // Batch fetch all card definitions for copy limit validation
    const cardDefIds = [...new Set(args.cards.map((c) => c.cardDefinitionId))];
    const cardDefs = await Promise.all(cardDefIds.map((id) => ctx.db.get(id)));
    const cardDefMap = new Map(
      cardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // Check card copy limits
    for (const card of args.cards) {
      const cardDef = cardDefMap.get(card.cardDefinitionId);
      if (!cardDef || !cardDef.isActive) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `Invalid card: ${card.cardDefinitionId}`,
        });
      }

      // Check card copy limits
      if (cardDef.rarity === "legendary" && card.quantity > MAX_LEGENDARY_COPIES) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `${cardDef.name}: Legendary cards limited to ${MAX_LEGENDARY_COPIES} copy`,
        });
      }
      if (card.quantity > MAX_COPIES_PER_CARD) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `${cardDef.name}: Limited to ${MAX_COPIES_PER_CARD} copies per deck`,
        });
      }
    }

    // Delete existing deck cards
    const existingDeckCards = await ctx.db
      .query("deckCards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .take(50); // Reasonable limit per deck

    // Delete all existing deck cards in parallel
    await Promise.all(existingDeckCards.map((dc) => ctx.db.delete(dc._id)));

    // Insert new deck cards in parallel
    await Promise.all(
      args.cards.map((card) =>
        ctx.db.insert("deckCards", {
          deckId: args.deckId,
          cardDefinitionId: card.cardDefinitionId,
          quantity: card.quantity,
          position: undefined,
        })
      )
    );

    // Update deck timestamp
    await ctx.db.patch(args.deckId, {
      updatedAt: Date.now(),
    });

    // Auto-set as active deck if user doesn't have one
    const user = await ctx.db.get(userId);
    if (user && !user.activeDeckId) {
      await ctx.db.patch(userId, {
        activeDeckId: args.deckId,
      });
    }

    return { success: true };
  },
});

/**
 * Rename a deck.
 * Updates the deck name and timestamp.
 *
 * @param deckId - ID of the deck to rename
 * @param newName - New deck name (1-50 characters)
 * @returns Success indicator
 * @throws AUTHZ_RESOURCE_FORBIDDEN if deck not owned by user
 * @throws VALIDATION_INVALID_INPUT if name invalid
 */
export const renameDeck = mutation({
  args: {
    deckId: v.id("userDecks"),
    newName: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the deck
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId || !deck.isActive) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Deck not found or not owned by user",
      });
    }

    // Validate new name using validation helper
    validateStringLength(args.newName, 1, 50, "Deck name");

    // Update the deck
    await ctx.db.patch(args.deckId, {
      name: args.newName.trim(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a deck (soft delete).
 * Marks the deck as inactive rather than permanently removing it.
 *
 * @param deckId - ID of the deck to delete
 * @returns Success indicator
 * @throws AUTHZ_RESOURCE_FORBIDDEN if deck not owned by user
 */
export const deleteDeck = mutation({
  args: {
    deckId: v.id("userDecks"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the deck
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Deck not found or not owned by user",
      });
    }

    // Soft delete the deck
    await ctx.db.patch(args.deckId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Duplicate an existing deck.
 * Creates a copy of the source deck with a new name, including all cards.
 *
 * @param sourceDeckId - ID of the deck to duplicate
 * @param newName - Name for the duplicated deck (1-50 characters)
 * @returns Object containing the new deck ID
 * @throws AUTHZ_RESOURCE_FORBIDDEN if source deck not owned by user
 * @throws VALIDATION_INVALID_INPUT if name invalid or deck limit exceeded (50 decks max)
 */
export const duplicateDeck = mutation({
  args: {
    sourceDeckId: v.id("userDecks"),
    newName: v.string(),
  },
  returns: v.object({
    deckId: v.id("userDecks"),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the source deck
    const sourceDeck = await ctx.db.get(args.sourceDeckId);
    if (!sourceDeck || sourceDeck.userId !== userId || !sourceDeck.isActive) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Source deck not found or not owned by user",
      });
    }

    // Validate new name using validation helper
    validateStringLength(args.newName, 1, 50, "Deck name");

    // Check deck limit
    const existingDecks = await ctx.db
      .query("userDecks")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .take(50); // Most users won't have >50 decks

    if (existingDecks.length >= MAX_DECKS_PER_USER) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Cannot exceed ${MAX_DECKS_PER_USER} decks per user`,
      });
    }

    // Create new deck
    const newDeckId = await ctx.db.insert("userDecks", {
      userId,
      name: args.newName.trim(),
      description: sourceDeck.description,
      deckArchetype: sourceDeck.deckArchetype,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Copy all cards from source deck
    const sourceDeckCards = await ctx.db
      .query("deckCards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.sourceDeckId))
      .take(50); // Reasonable limit per deck

    for (const sourceCard of sourceDeckCards) {
      await ctx.db.insert("deckCards", {
        deckId: newDeckId,
        cardDefinitionId: sourceCard.cardDefinitionId,
        quantity: sourceCard.quantity,
        position: sourceCard.position,
      });
    }

    return { deckId: newDeckId };
  },
});

/**
 * Set a deck as the active deck for matchmaking.
 * Validates that the deck is legal (30-60 cards, valid card limits).
 *
 * @param deckId - ID of the deck to set as active
 * @returns Success indicator
 * @throws AUTHZ_RESOURCE_FORBIDDEN if deck not owned by user
 * @throws VALIDATION_INVALID_INPUT if deck invalid, too small (< 30 cards), or too large (> 60 cards)
 */
export const setActiveDeck = mutation({
  args: {
    deckId: v.id("userDecks"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the deck
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId || !deck.isActive) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Deck not found or not owned by user",
      });
    }

    // Validate deck has minimum cards
    const deckCards = await ctx.db
      .query("deckCards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .take(50); // Reasonable limit per deck

    const totalCards = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);
    if (totalCards < MIN_DECK_SIZE) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Deck must have at least ${MIN_DECK_SIZE} cards to be set as active. Currently has ${totalCards}.`,
      });
    }
    if (totalCards > MAX_DECK_SIZE) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Deck cannot exceed ${MAX_DECK_SIZE} cards to be set as active. Currently has ${totalCards}.`,
      });
    }

    // Batch fetch all card definitions
    const cardDefMap = await batchFetchCardDefinitions(
      ctx,
      deckCards.map((dc) => dc.cardDefinitionId)
    );

    // Validate all cards in deck
    for (const dc of deckCards) {
      const cardDef = cardDefMap.get(dc.cardDefinitionId);
      if (!cardDef || !cardDef.isActive) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Deck contains invalid cards",
        });
      }

      // Check card copy limits
      if (cardDef.rarity === "legendary" && dc.quantity > MAX_LEGENDARY_COPIES) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `${cardDef.name}: Legendary cards limited to ${MAX_LEGENDARY_COPIES} copy`,
        });
      }
      if (dc.quantity > MAX_COPIES_PER_CARD) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `${cardDef.name}: Limited to ${MAX_COPIES_PER_CARD} copies per deck`,
        });
      }
    }

    // Get user record
    const user = await ctx.db.get(userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    // Update user's active deck
    await ctx.db.patch(userId, {
      activeDeckId: args.deckId,
    });

    return { success: true };
  },
});

/**
 * Select and claim a starter deck (one-time only).
 * Gives user all 45 cards from the chosen starter deck and creates a complete deck.
 * Can only be claimed once per user. Auto-seeds card definitions if needed.
 *
 * @param deckCode - Code for the starter deck ("INFERNAL_DRAGONS" or "ABYSSAL_DEPTHS")
 * @returns Success status with deck ID, name, cards received, and deck size
 * @throws VALIDATION_INVALID_INPUT if user already has decks or invalid deck code
 */
export const selectStarterDeck = mutation({
  args: {
    deckCode: v.union(
      v.literal("INFERNAL_DRAGONS"),
      v.literal("ABYSSAL_DEPTHS")
      // IRON_LEGION and STORM_RIDERS not yet available (need card definitions)
    ),
  },
  returns: v.object({
    success: v.boolean(),
    deckId: v.id("userDecks"),
    deckName: v.string(),
    cardsReceived: v.number(),
    deckSize: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Check if user has already claimed a starter deck
    const existingDecks = await ctx.db
      .query("userDecks")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .take(50); // Most users won't have >50 decks

    if (existingDecks.length > 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You have already claimed your starter deck",
      });
    }

    // Get starter deck metadata
    const starterDeck = STARTER_DECKS.find((d) => d.deckCode === args.deckCode);
    if (!starterDeck) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Invalid starter deck code",
      });
    }

    // Load card list based on deck code
    const cardListMap: Record<string, readonly (typeof INFERNAL_DRAGONS_CARDS)[number][]> = {
      INFERNAL_DRAGONS: INFERNAL_DRAGONS_CARDS,
      ABYSSAL_DEPTHS: ABYSSAL_DEPTHS_CARDS,
      IRON_LEGION: IRON_LEGION_CARDS,
      STORM_RIDERS: STORM_RIDERS_CARDS,
    };

    const cardList = cardListMap[args.deckCode];
    if (!cardList) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Starter deck cards not found for: ${args.deckCode}`,
      });
    }

    const now = Date.now();

    // Auto-seed cards if they don't exist (first-time setup)
    const firstCard = cardList[0];
    if (!firstCard) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Starter deck card list is empty",
      });
    }

    const existingCardDefs = await ctx.db
      .query("cardDefinitions")
      .withIndex("by_name", (q) => q.eq("name", firstCard.name))
      .first();

    if (!existingCardDefs) {
      // Seed all starter cards on first use
      const allCards = [
        ...INFERNAL_DRAGONS_CARDS,
        ...ABYSSAL_DEPTHS_CARDS,
        ...IRON_LEGION_CARDS,
        ...STORM_RIDERS_CARDS,
      ];
      for (const card of allCards) {
        await ctx.db.insert("cardDefinitions", {
          name: card.name,
          rarity: card.rarity,
          cardType: card.cardType,
          archetype: card.archetype,
          cost: card.cost,
          attack: "attack" in card ? card.attack : undefined,
          defense: "defense" in card ? card.defense : undefined,
          ability: "ability" in card ? card.ability : undefined,
          isActive: true,
          createdAt: now,
        });
      }
    }

    // Group cards by name to get quantities (cards appear multiple times in the list)
    const cardQuantities = new Map<string, { card: (typeof cardList)[number]; count: number }>();
    for (const card of cardList) {
      const existing = cardQuantities.get(card.name);
      if (existing) {
        existing.count++;
      } else {
        cardQuantities.set(card.name, { card, count: 1 });
      }
    }

    // Find or verify card definitions exist, and add to player's inventory
    const cardDefinitionIds: Array<{ id: Id<"cardDefinitions">; quantity: number }> = [];

    for (const [cardName, { card, count }] of Array.from(cardQuantities.entries())) {
      // Find the card definition by name (should exist from seeding)
      const cardDef = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", cardName))
        .filter((q) => q.eq(q.field("archetype"), card.archetype))
        .filter((q) => q.eq(q.field("cardType"), card.cardType))
        .first();

      if (!cardDef) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `Card definition not found: ${cardName}. Please run seedStarterCards first.`,
        });
      }

      // Check if user already owns this card
      const existingPlayerCard = await ctx.db
        .query("playerCards")
        .withIndex("by_user_card", (q) =>
          q.eq("userId", userId).eq("cardDefinitionId", cardDef._id)
        )
        .first();

      if (existingPlayerCard) {
        // Update quantity
        await ctx.db.patch(existingPlayerCard._id, {
          quantity: existingPlayerCard.quantity + count,
          lastUpdatedAt: now,
        });
      } else {
        // Create new player card
        await ctx.db.insert("playerCards", {
          userId,
          cardDefinitionId: cardDef._id,
          quantity: count,
          isFavorite: false,
          acquiredAt: now,
          lastUpdatedAt: now,
        });
      }

      cardDefinitionIds.push({ id: cardDef._id, quantity: count });
    }

    // Create the deck
    const deckId = await ctx.db.insert("userDecks", {
      userId,
      name: starterDeck.name,
      description: starterDeck.description,
      deckArchetype: starterDeck.archetype,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add all 45 cards to the deck (30 is minimum, not maximum)
    const deckCardCounts = new Map<Id<"cardDefinitions">, number>();

    // Count how many of each card should go in the deck
    for (const card of cardList) {
      const cardDef = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", card.name))
        .filter((q) => q.eq(q.field("archetype"), card.archetype))
        .filter((q) => q.eq(q.field("cardType"), card.cardType))
        .first();

      if (cardDef) {
        const existing = deckCardCounts.get(cardDef._id);
        deckCardCounts.set(cardDef._id, (existing || 0) + 1);
      }
    }

    // Insert deck cards
    for (const [cardDefId, quantity] of Array.from(deckCardCounts.entries())) {
      await ctx.db.insert("deckCards", {
        deckId,
        cardDefinitionId: cardDefId,
        quantity,
        position: undefined,
      });
    }

    // Set as active deck
    await ctx.db.patch(userId, {
      activeDeckId: deckId,
    });

    return {
      success: true,
      deckId,
      deckName: starterDeck.name,
      cardsReceived: cardList.length, // 45 total cards
      deckSize: cardList.length, // All 45 cards in the deck
    };
  },
});
