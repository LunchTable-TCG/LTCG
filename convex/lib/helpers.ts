/**
 * Shared Helper Functions for Convex
 *
 * Reusable business logic functions used across feature modules.
 * Includes card inventory management, pack opening, and rarity logic.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ELO_SYSTEM, RARITY_WEIGHTS } from "./constants";
import { ErrorCode, createError } from "./errorCodes";
import type { Archetype, CardDefinition, CardResult, PackConfig, Rarity } from "./types";

// Re-export types for backwards compatibility
export type { Rarity, Archetype, PackConfig, CardResult };

/**
 * Get display username with fallback to name field
 *
 * Convex Auth uses `name` field while game system uses `username`.
 * This helper provides consistent fallback logic.
 *
 * @param user - User document
 * @returns Display name (username → name → "Unknown")
 */
export function getDisplayUsername(user: Doc<"users">): string {
  return user.username || user.name || "Unknown";
}

/**
 * Map archetype name to element for frontend compatibility
 *
 * Converts both long-form archetype names (infernal_dragons) and
 * short-form element names (fire) to standardized element types.
 *
 * @param archetype - Archetype identifier (e.g., "infernal_dragons", "fire")
 * @returns Element type for frontend display
 * @example
 * archetypeToElement("infernal_dragons") // "fire"
 * archetypeToElement("fire") // "fire"
 * archetypeToElement("unknown") // "neutral"
 */
export function archetypeToElement(
  archetype: string
): "fire" | "water" | "earth" | "wind" | "neutral" {
  const mapping: Record<string, "fire" | "water" | "earth" | "wind" | "neutral"> = {
    infernal_dragons: "fire",
    abyssal_horrors: "water",
    nature_spirits: "earth",
    storm_elementals: "wind",
    fire: "fire",
    water: "water",
    earth: "earth",
    wind: "wind",
  };
  return mapping[archetype] || "neutral";
}

/**
 * Batch fetch card definitions and return as Map
 *
 * Efficiently loads multiple card definitions in parallel and returns them
 * as a Map for O(1) lookup. Filters out null results automatically.
 *
 * @param ctx - Query or mutation context
 * @param cardDefinitionIds - Array of card definition IDs to fetch
 * @returns Map of card definition ID to Doc<"cardDefinitions">
 * @example
 * const deckCards = await ctx.db.query("deckCards").collect();
 * const cardMap = await batchFetchCardDefinitions(ctx, deckCards.map(dc => dc.cardDefinitionId));
 * const cardDef = cardMap.get(someCardId); // O(1) lookup
 */
export async function batchFetchCardDefinitions(
  ctx: QueryCtx | MutationCtx,
  cardDefinitionIds: Id<"cardDefinitions">[]
): Promise<Map<Id<"cardDefinitions">, Doc<"cardDefinitions">>> {
  // Remove duplicates
  const uniqueIds = [...new Set(cardDefinitionIds)];

  // Batch fetch all card definitions in parallel
  const cardDefs = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));

  // Create Map, filtering out null results
  return new Map(
    cardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
  );
}

/**
 * Weighted random rarity selection based on configured weights
 *
 * Uses a weighted probability system from RARITY_WEIGHTS constant.
 * Rolls a random number (0-1000) and selects rarity based on cumulative weights.
 *
 * **Probability Distribution:**
 * - Common: 65% (650/1000)
 * - Uncommon: 20% (200/1000)
 * - Rare: 10% (100/1000)
 * - Epic: 4% (40/1000)
 * - Legendary: 1% (10/1000)
 *
 * @returns Randomly selected rarity (common, uncommon, rare, epic, legendary)
 * @example
 * weightedRandomRarity() // "common" (most likely, 65% chance)
 * weightedRandomRarity() // "legendary" (rare outcome, 1% chance)
 */
export function weightedRandomRarity(): Rarity {
  const totalWeight = 1000;
  const roll = Math.random() * totalWeight;
  let cumulative = 0;

  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (roll < cumulative) {
      return rarity as Rarity;
    }
  }

  return "common"; // Fallback
}

/**
 * Get random card of specific rarity (and optional archetype)
 *
 * Queries active cards from cardDefinitions table and randomly selects one.
 * If archetype is specified, filters by archetype first with fallback to any archetype.
 *
 * @param ctx - Query or mutation context
 * @param rarity - Card rarity to filter by
 * @param archetype - Optional archetype filter (e.g., "warrior", "dragon", "neutral")
 * @returns Random card matching criteria
 * @throws Error if no cards found matching criteria
 * @example
 * await getRandomCard(ctx, "ultra_rare", "dragon") // Random ultra rare dragon card
 * await getRandomCard(ctx, "common") // Random common card of any archetype
 */
export async function getRandomCard(
  ctx: QueryCtx | MutationCtx,
  rarity: Rarity,
  archetype?: Archetype
): Promise<CardDefinition> {
  const query = ctx.db
    .query("cardDefinitions")
    .filter((q) => q.eq(q.field("isActive"), true))
    .filter((q) => q.eq(q.field("rarity"), rarity));

  if (archetype && archetype !== "neutral") {
    const allCards = await query.collect();
    const archetypeCards = allCards.filter((card) => card.archetype === archetype);

    if (archetypeCards.length === 0) {
      // Fallback to any archetype if no cards found
      const cards = await query.collect();
      if (cards.length === 0) {
        throw createError(ErrorCode.LIBRARY_NO_CARDS_FOUND, { rarity });
      }
      const fallbackCard = cards[Math.floor(Math.random() * cards.length)];
      if (!fallbackCard) {
        throw createError(ErrorCode.LIBRARY_CARD_SELECTION_FAILED, { rarity, context: "fallback" });
      }
      return fallbackCard;
    }

    const archetypeCard = archetypeCards[Math.floor(Math.random() * archetypeCards.length)];
    if (!archetypeCard) {
      throw createError(ErrorCode.LIBRARY_CARD_SELECTION_FAILED, { rarity, archetype });
    }
    return archetypeCard;
  }

  const cards = await query.collect();
  if (cards.length === 0) {
    throw createError(ErrorCode.LIBRARY_NO_CARDS_FOUND, { rarity });
  }

  const selectedCard = cards[Math.floor(Math.random() * cards.length)];
  if (!selectedCard) {
    throw createError(ErrorCode.LIBRARY_CARD_SELECTION_FAILED, { rarity });
  }

  return selectedCard;
}

/**
 * Add cards to player's inventory (creates or increments quantity)
 *
 * If player already owns the card, increments quantity.
 * If player doesn't own the card, creates new playerCards entry.
 * Updates lastUpdatedAt timestamp.
 *
 * @param ctx - Mutation context
 * @param userId - Player's user ID
 * @param cardDefinitionId - Card definition ID to add
 * @param quantity - Number of cards to add
 * @example
 * await addCardsToInventory(ctx, userId, blueEyesId, 3) // Add 3 Blue-Eyes to inventory
 */
export async function addCardsToInventory(
  ctx: MutationCtx,
  userId: Id<"users">,
  cardDefinitionId: Id<"cardDefinitions">,
  quantity: number
) {
  const existing = await ctx.db
    .query("playerCards")
    .withIndex("by_user_card", (q) =>
      q.eq("userId", userId).eq("cardDefinitionId", cardDefinitionId)
    )
    .first();

  if (existing) {
    // Increment quantity
    await ctx.db.patch(existing._id, {
      quantity: existing.quantity + quantity,
      lastUpdatedAt: Date.now(),
    });
  } else {
    // Create new entry
    await ctx.db.insert("playerCards", {
      userId,
      cardDefinitionId,
      quantity,
      isFavorite: false,
      acquiredAt: Date.now(),
      lastUpdatedAt: Date.now(),
    });
  }
}

/**
 * Adjust player card inventory (add or remove cards)
 *
 * More flexible than addCardsToInventory - supports adding or removing cards.
 * Automatically deletes playerCards entry if quantity reaches 0.
 *
 * @param ctx - Mutation context
 * @param userId - Player's user ID
 * @param cardDefinitionId - Card definition ID to adjust
 * @param quantityDelta - Positive to add, negative to remove
 * @throws Error if trying to remove more cards than player owns
 * @throws Error if trying to decrease quantity of unowned card
 * @example
 * await adjustCardInventory(ctx, userId, darkMagicianId, 2) // Add 2
 * await adjustCardInventory(ctx, userId, darkMagicianId, -1) // Remove 1
 */
export async function adjustCardInventory(
  ctx: MutationCtx,
  userId: Id<"users">,
  cardDefinitionId: Id<"cardDefinitions">,
  quantityDelta: number
) {
  const playerCard = await ctx.db
    .query("playerCards")
    .withIndex("by_user_card", (q) =>
      q.eq("userId", userId).eq("cardDefinitionId", cardDefinitionId)
    )
    .first();

  if (!playerCard) {
    if (quantityDelta > 0) {
      // Create new entry
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId,
        quantity: quantityDelta,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    } else {
      throw createError(ErrorCode.LIBRARY_INSUFFICIENT_CARDS, { cardId: cardDefinitionId });
    }
  } else {
    const newQuantity = playerCard.quantity + quantityDelta;
    if (newQuantity < 0) {
      throw createError(ErrorCode.LIBRARY_INSUFFICIENT_CARDS, {
        cardId: cardDefinitionId,
        have: playerCard.quantity,
        need: -quantityDelta,
      });
    }

    if (newQuantity === 0) {
      // Delete entry if quantity reaches 0
      await ctx.db.delete(playerCard._id);
    } else {
      await ctx.db.patch(playerCard._id, {
        quantity: newQuantity,
        lastUpdatedAt: Date.now(),
      });
    }
  }
}

/**
 * Open a pack and generate cards based on pack configuration
 *
 * Generates random cards using weighted rarity system.
 * Last card in pack gets guaranteed rarity if specified.
 * Automatically adds all cards to player's inventory.
 *
 * @param ctx - Mutation context
 * @param packConfig - Pack configuration (cardCount, guaranteedRarity, archetype)
 * @param userId - Player opening the pack
 * @returns Array of card results with full details for display
 * @example
 * await openPack(ctx, { cardCount: 5, guaranteedRarity: "super_rare" }, userId)
 * // Returns 5 cards, last one guaranteed to be super rare or better
 */
export async function openPack(
  ctx: MutationCtx,
  packConfig: PackConfig,
  userId: Id<"users">
): Promise<CardResult[]> {
  const { cardCount, guaranteedRarity, archetype } = packConfig;
  const cards: CardResult[] = [];

  for (let i = 0; i < cardCount; i++) {
    const isLastCard = i === cardCount - 1;
    let rarity: Rarity;

    // Last card gets guaranteed rarity
    if (isLastCard && guaranteedRarity) {
      rarity = guaranteedRarity;
    } else {
      rarity = weightedRandomRarity();
    }

    // Get random card of this rarity
    const card = await getRandomCard(ctx, rarity, archetype);

    // Add to inventory
    await addCardsToInventory(ctx, userId, card._id, 1);

    cards.push({
      cardDefinitionId: card._id,
      name: card.name,
      rarity: card.rarity,
      archetype: card.archetype,
      cardType: card.cardType,
      attack: card.attack,
      defense: card.defense,
      cost: card.cost,
      imageUrl: card.imageUrl,
    });
  }

  return cards;
}

// ============================================================================
// LEADERBOARD & PROGRESSION HELPERS
// ============================================================================

/**
 * Calculate ELO rating change for winner and loser
 *
 * Uses standard ELO formula:
 * - Expected score = 1 / (1 + 10^((opponent_rating - player_rating) / 400))
 * - New rating = old rating + K * (actual_score - expected_score)
 *
 * @param winnerRating - Winner's current rating
 * @param loserRating - Loser's current rating
 * @param kFactor - K-factor (rating volatility), defaults to 32
 * @returns New ratings for both players
 */
export function calculateEloChange(
  winnerRating: number,
  loserRating: number,
  kFactor: number = ELO_SYSTEM.K_FACTOR
): { winnerNewRating: number; loserNewRating: number } {
  // Calculate expected win probability for both players
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  // Calculate rating changes
  // Winner gets 1 point (win), Loser gets 0 points (loss)
  const winnerChange = Math.round(kFactor * (1 - expectedWinner));
  const loserChange = Math.round(kFactor * (0 - expectedLoser));

  return {
    winnerNewRating: Math.max(ELO_SYSTEM.RATING_FLOOR, winnerRating + winnerChange),
    loserNewRating: Math.max(ELO_SYSTEM.RATING_FLOOR, loserRating + loserChange),
  };
}

/**
 * Calculate win rate percentage
 *
 * Calculates wins / (wins + losses) as percentage.
 * Returns 0 if no games played.
 * Story mode has no losses tracking.
 *
 * @param player - Player object with win/loss stats
 * @param gameType - Type of game ("ranked" | "casual" | "story")
 * @returns Win rate as percentage (0-100), rounded to nearest integer
 * @example
 * calculateWinRate({ rankedWins: 15, rankedLosses: 5 }, "ranked") // 75
 * calculateWinRate({ casualWins: 0, casualLosses: 0 }, "casual") // 0
 */
export function calculateWinRate(
  player: Pick<
    Doc<"users">,
    "rankedWins" | "casualWins" | "storyWins" | "rankedLosses" | "casualLosses"
  >,
  gameType: "ranked" | "casual" | "story"
): number {
  const wins =
    gameType === "ranked"
      ? player.rankedWins || 0
      : gameType === "casual"
        ? player.casualWins || 0
        : player.storyWins || 0;

  const losses =
    gameType === "ranked"
      ? player.rankedLosses || 0
      : gameType === "casual"
        ? player.casualLosses || 0
        : 0; // Story mode has no losses

  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}
