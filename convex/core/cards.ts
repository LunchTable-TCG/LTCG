import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { jsonAbilityValidator } from "../gameplay/effectSystem/jsonEffectValidators";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { archetypeToElement } from "../lib/helpers";
import { cardWithOwnershipValidator } from "../lib/returnValidators";
import { GAME_CONFIG } from "@ltcg/core";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all active card definitions in the game
 *
 * @returns Array of all active card definitions with stats and abilities
 */
export const getAllCardDefinitions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("cardDefinitions"),
      _creationTime: v.number(),
      name: v.string(),
      rarity: literals(...GAME_CONFIG.RARITIES),


      cost: v.number(),
      level: v.optional(v.number()),
      attribute: v.optional(literals(...GAME_CONFIG.ATTRIBUTES)),
      monsterType: v.optional(literals(...GAME_CONFIG.MONSTER_TYPES)),
      spellType: v.optional(literals(...GAME_CONFIG.SPELL_TYPES)),
      trapType: v.optional(literals(...GAME_CONFIG.TRAP_TYPES)),
      ability: v.optional(jsonAbilityValidator),
      flavorText: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      imageStorageId: v.optional(v.id("_storage")),
      thumbnailStorageId: v.optional(v.id("_storage")),
      isActive: v.boolean(),
      createdAt: v.number(),
      templateId: v.optional(v.id("cardTemplates")),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("cardDefinitions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get a single card definition by ID
 *
 * @param cardId - The card definition ID to retrieve
 * @returns The card definition or null if not found
 */
export const getCardDefinition = query({
  args: { cardId: v.id("cardDefinitions") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.cardId);
  },
});

/**
 * Get all cards owned by the current user (for binder)
 * Returns card definitions joined with ownership data
 *
 * @returns Array of cards with ownership info (quantity, favorite status, acquisition date)
 */
export const getUserCards = query({
  args: {},
  returns: v.array(cardWithOwnershipValidator), // Card with ownership info
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get all player cards for this user
    const playerCards = await ctx.db
      .query("playerCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Batch fetch card definitions to avoid N+1 queries
    const cardDefIds = playerCards.map((pc) => pc.cardDefinitionId);
    const cardDefs = await Promise.all(cardDefIds.map((id) => ctx.db.get(id)));
    const cardDefMap = new Map(
      cardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // Join with card definitions using the map
    const cardsWithDefinitions = playerCards
      .map((pc) => {
        const cardDef = cardDefMap.get(pc.cardDefinitionId);
        if (!cardDef || !cardDef.isActive) return null;

        return {
          id: pc._id.toString(),
          cardDefinitionId: pc.cardDefinitionId,
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
          owned: pc.quantity,
          isFavorite: pc.isFavorite,
          acquiredAt: pc.acquiredAt,
        };
      })
      .filter((c) => c !== null);

    return cardsWithDefinitions;
  },
});

/**
 * Get user's favorite cards
 *
 * @returns Array of cards marked as favorites by the current user
 */
export const getUserFavoriteCards = query({
  args: {},
  returns: v.array(cardWithOwnershipValidator), // Card with ownership info
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const favoriteCards = await ctx.db
      .query("playerCards")
      .withIndex("by_user_favorite", (q) => q.eq("userId", userId).eq("isFavorite", true))
      .collect();

    // Batch fetch card definitions to avoid N+1 queries
    const cardDefIds = favoriteCards.map((pc) => pc.cardDefinitionId);
    const cardDefs = await Promise.all(cardDefIds.map((id) => ctx.db.get(id)));
    const cardDefMap = new Map(
      cardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // Join with card definitions using the map
    const cardsWithDefinitions = favoriteCards
      .map((pc) => {
        const cardDef = cardDefMap.get(pc.cardDefinitionId);
        if (!cardDef || !cardDef.isActive) return null;

        return {
          id: pc._id.toString(),
          cardDefinitionId: pc.cardDefinitionId,
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
          owned: pc.quantity,
          isFavorite: pc.isFavorite,
          acquiredAt: pc.acquiredAt,
        };
      })
      .filter((c) => c !== null);

    return cardsWithDefinitions;
  },
});

/**
 * Get collection stats for a user
 *
 * @returns Statistics about the user's collection (unique cards, total cards, favorite count)
 */
export const getUserCollectionStats = query({
  args: {},
  returns: v.object({
    uniqueCards: v.number(),
    totalCards: v.number(),
    favoriteCount: v.number(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const playerCards = await ctx.db
      .query("playerCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const uniqueCards = playerCards.length;
    const totalCards = playerCards.reduce((sum, pc) => sum + pc.quantity, 0);
    const favoriteCount = playerCards.filter((pc) => pc.isFavorite).length;

    return { uniqueCards, totalCards, favoriteCount };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Toggle favorite status on a card
 *
 * @param playerCardId - The player card ID to toggle favorite status
 * @returns Success status and new favorite state
 */
export const toggleFavorite = mutation({
  args: {
    playerCardId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    isFavorite: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const playerCard = await ctx.db.get(args.playerCardId as Id<"playerCards">);

    if (!playerCard || playerCard.userId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Card not found or not owned by user",
      });
    }

    await ctx.db.patch(args.playerCardId as Id<"playerCards">, {
      isFavorite: !playerCard.isFavorite,
      lastUpdatedAt: Date.now(),
    });

    return { success: true, isFavorite: !playerCard.isFavorite };
  },
});

/**
 * Add cards to a player's inventory
 * Used when opening packs, winning rewards, etc.
 *
 * @param cardDefinitionId - The card definition ID to add
 * @param quantity - Number of copies to add
 * @returns Success status and new total quantity
 */
export const addCardsToInventory = mutation({
  args: {
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    newQuantity: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Check if card definition exists
    const cardDef = await ctx.db.get(args.cardDefinitionId);
    if (!cardDef || !cardDef.isActive) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Card definition not found or inactive",
      });
    }

    // Check if player already owns this card
    const existingCard = await ctx.db
      .query("playerCards")
      .withIndex("by_user_card", (q) =>
        q.eq("userId", userId).eq("cardDefinitionId", args.cardDefinitionId)
      )
      .first();

    if (existingCard) {
      // Update quantity
      await ctx.db.patch(existingCard._id, {
        quantity: existingCard.quantity + args.quantity,
        lastUpdatedAt: Date.now(),
      });
      return { success: true, newQuantity: existingCard.quantity + args.quantity };
    }
    // Create new ownership record
    await ctx.db.insert("playerCards", {
      userId,
      cardDefinitionId: args.cardDefinitionId,
      quantity: args.quantity,
      isFavorite: false,
      acquiredAt: Date.now(),
      lastUpdatedAt: Date.now(),
    });
    return { success: true, newQuantity: args.quantity };
  },
});

/**
 * Give a player all cards (for testing/new player setup)
 * Grants multiple copies of each card based on rarity
 *
 * @returns Success status and number of unique cards added
 */
export const giveStarterCollection = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    cardsAdded: v.number(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Check if user already has cards
    const existingCards = await ctx.db
      .query("playerCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingCards) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User already has cards in their collection",
      });
    }

    // Get all active card definitions
    const allCards = await ctx.db
      .query("cardDefinitions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Give the player copies of each card based on rarity
    // Give the player copies of each card based on rarity
    const defaultRarityQuantities: Record<string, number> = {
      common: 4,
      uncommon: 3,
      rare: 2,
      epic: 1,
      legendary: 1,
    };

    const rarityQuantities: Record<string, number> = (() => {
      const envConfig = process.env["STARTER_COLLECTION_CONFIG"];
      if (envConfig) {
        try {
          const config = JSON.parse(envConfig);
          if (config.rarityQuantities) {
            return { ...defaultRarityQuantities, ...config.rarityQuantities };
          }
        } catch (e) {
          console.error("Failed to parse STARTER_COLLECTION_CONFIG", e);
        }
      }
      return defaultRarityQuantities;
    })();

    for (const cardDef of allCards) {
      const quantity = rarityQuantities[cardDef.rarity] || 1;
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardDef._id,
        quantity,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    }

    return { success: true, cardsAdded: allCards.length };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for seeding)
// ============================================================================

/**
 * Internal mutation to create card definitions (for seeding)
 */
export const createCardDefinition = internalMutation({
  args: {
    name: v.string(),
    rarity: literals(...GAME_CONFIG.RARITIES),
    archetype: literals(...GAME_CONFIG.ARCHETYPES),
    cardType: literals(...GAME_CONFIG.CARD_TYPES),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.number(),
    ability: v.optional(jsonAbilityValidator),
    flavorText: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if card with same name already exists
    const existing = await ctx.db
      .query("cardDefinitions")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      return existing._id;
    }

    const cardId = await ctx.db.insert("cardDefinitions", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });

    return cardId;
  },
});
