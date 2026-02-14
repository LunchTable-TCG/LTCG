/**
 * Shared Helper Functions for Convex
 *
 * Reusable business logic functions used across feature modules.
 * Includes card inventory management, pack opening, and rarity logic.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { economy } from "./componentClients";
import { getGameConfig } from "./gameConfig";
// Types previously from economy/rngConfig — now inline since economy module moved to component
export type RarityWeights = {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
};
export type VariantRates = {
  standard: number;
  foil: number;
  altArt: number;
  fullArt: number;
};
export type PityThresholds = {
  epic: number;
  legendary: number;
  fullArt: number;
};
type FullRngConfig = {
  rarityWeights: RarityWeights;
  variantRates: VariantRates;
  pityThresholds: PityThresholds;
};
/**
 * Fetch RNG configuration from the economy component.
 * Falls back to hardcoded constants when no DB config exists.
 */
async function getFullRngConfig(ctx: QueryCtx | MutationCtx): Promise<FullRngConfig> {
  const config = await getGameConfig(ctx);
  const DEFAULTS: FullRngConfig = {
    rarityWeights: config.economy.rarityWeights as unknown as RarityWeights,
    variantRates: {
      standard: config.economy.variantBaseRates.standard,
      foil: config.economy.variantBaseRates.foil,
      altArt: config.economy.variantBaseRates.altArt,
      fullArt: config.economy.variantBaseRates.fullArt,
    },
    pityThresholds: config.economy.pityThresholds as unknown as PityThresholds,
  };

  try {
    const dbConfig = await economy.rngConfig.getRngConfig(ctx);
    if (!dbConfig) return DEFAULTS;

    return {
      rarityWeights: dbConfig.rarityWeights,
      variantRates: dbConfig.variantRates,
      pityThresholds: dbConfig.pityThresholds,
    };
  } catch (err) {
    console.warn("getFullRngConfig: economy component query failed, using defaults", err);
    return DEFAULTS;
  }
}
import {
  ELO_SYSTEM,
  PITY_THRESHOLDS,
  RANK_THRESHOLDS,
  RARITY_WEIGHTS,
  VARIANT_CONFIG,
} from "./constants";
import { ErrorCode, createError } from "./errorCodes";
import type {
  Archetype,
  CardDefinition,
  CardResult,
  CardVariant,
  PackConfig,
  Rarity,
} from "./types";

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
export function getDisplayUsername(user: Doc<"users">) {
  return user.username || user.name || "Unknown";
}

import { GAME_CONFIG } from "@ltcg/core";
import { Attribute } from "./types";

/**
 * Map archetype name to attribute color for frontend compatibility
 *
 * Converts archetype names (dropout, prep, geek, etc.) to their
 * corresponding attribute colors (red, blue, yellow, etc.).
 *
 * @param archetype - Archetype identifier (e.g., "dropout", "prep", "geek")
 * @returns Attribute color for frontend display
 */
export function archetypeToElement(archetype: string): Attribute {
  return (GAME_CONFIG.ARCHETYPE_TO_ATTRIBUTE[archetype] as Attribute) || "white";
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
 * Uses a weighted probability system. Can use dynamic config from DB
 * or fallback to RARITY_WEIGHTS constant.
 *
 * **Default Probability Distribution:**
 * - Common: 55% (550/1000)
 * - Uncommon: 28% (280/1000)
 * - Rare: 12% (120/1000)
 * - Epic: 4% (40/1000)
 * - Legendary: 1% (10/1000)
 *
 * @param weights - Optional custom weights (use getRarityWeightsInternal for dynamic)
 * @returns Randomly selected rarity (common, uncommon, rare, epic, legendary)
 * @example
 * weightedRandomRarity() // "common" (most likely, 55% chance)
 * weightedRandomRarity(customWeights) // Using dynamic config
 */
export function weightedRandomRarity(weights?: RarityWeights): Rarity {
  const useWeights = weights ?? RARITY_WEIGHTS;
  const totalWeight = 1000;
  const roll = Math.random() * totalWeight;
  let cumulative = 0;

  for (const [rarity, weight] of Object.entries(useWeights)) {
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
 * @param archetype - Optional archetype filter (e.g., "dropout", "prep", "geek")
 * @returns Random card matching criteria
 * @throws Error if no cards found matching criteria
 * @example
 * await getRandomCard(ctx, "rare", "dropout") // Random rare dropout card
 * await getRandomCard(ctx, "common") // Random common card of any archetype
 */
export async function getRandomCard(
  ctx: QueryCtx | MutationCtx,
  rarity: Rarity,
  archetype?: Archetype
): Promise<CardDefinition> {
  // Use compound index instead of full table scan + filter
  const cards = await ctx.db
    .query("cardDefinitions")
    .withIndex("by_active_rarity", (q) => q.eq("isActive", true).eq("rarity", rarity))
    .collect();

  if (archetype) {
    const archetypeCards = cards.filter((card) => card.archetype === archetype);

    if (archetypeCards.length > 0) {
      const archetypeCard = archetypeCards[Math.floor(Math.random() * archetypeCards.length)];
      if (archetypeCard) return archetypeCard;
    }
    // Fallback to any archetype if no cards found for the requested one
  }

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
 * If player already owns the card with the same variant, increments quantity.
 * If player doesn't own the card, creates new playerCards entry.
 * Updates lastUpdatedAt timestamp.
 *
 * @param ctx - Mutation context
 * @param userId - Player's user ID
 * @param cardDefinitionId - Card definition ID to add
 * @param quantity - Number of cards to add
 * @param variant - Card variant (defaults to "standard")
 * @param source - Where the card came from
 * @param serialNumber - Optional serial number for numbered variants
 * @example
 * await addCardsToInventory(ctx, userId, blueEyesId, 3) // Add 3 standard Blue-Eyes to inventory
 * await addCardsToInventory(ctx, userId, blueEyesId, 1, "foil", "pack") // Add 1 foil from pack
 */
export async function addCardsToInventory(
  ctx: MutationCtx,
  userId: Id<"users">,
  cardDefinitionId: Id<"cardDefinitions">,
  quantity: number,
  variant: CardVariant = "standard",
  source?: "pack" | "marketplace" | "reward" | "trade" | "event" | "daily" | "jackpot",
  serialNumber?: number
) {
  // For numbered variants, always create separate entries (each is unique)
  if (variant === "numbered" && serialNumber !== undefined) {
    await ctx.db.insert("playerCards", {
      userId,
      cardDefinitionId,
      quantity: 1,
      variant,
      serialNumber,
      source,
      isFavorite: false,
      acquiredAt: Date.now(),
      lastUpdatedAt: Date.now(),
    });
    return;
  }

  // For other variants, look for existing entry with same variant
  const existing = await ctx.db
    .query("playerCards")
    .withIndex("by_user_card_variant", (q) =>
      q.eq("userId", userId).eq("cardDefinitionId", cardDefinitionId).eq("variant", variant)
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
      variant,
      source,
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
  // CRITICAL: Verify card definition exists before any inventory operations
  const cardDef = await ctx.db.get(cardDefinitionId);
  if (!cardDef) {
    throw createError(ErrorCode.NOT_FOUND_CARD, {
      cardDefinitionId,
      reason: "Card definition not found - cannot adjust inventory for non-existent card",
    });
  }

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
 * Select a random variant based on pack multipliers
 *
 * Uses base rates (from config or constants) multiplied by pack-specific multipliers.
 * Standard variant is the default if no special variant is rolled.
 *
 * @param multipliers - Optional pack-specific multipliers for foil, altArt, fullArt
 * @param useGold - Whether this is a gold pack (uses different multipliers)
 * @param variantRates - Optional dynamic variant rates from DB config
 * @returns Selected card variant
 */
export function selectVariant(
  multipliers?: { foil?: number; altArt?: number; fullArt?: number },
  useGold = false,
  variantRates?: VariantRates
): CardVariant {
  // Use dynamic config if provided, otherwise fall back to constants
  const baseRates = variantRates ?? {
    standard: VARIANT_CONFIG.BASE_RATES.standard,
    foil: VARIANT_CONFIG.BASE_RATES.foil,
    altArt: VARIANT_CONFIG.BASE_RATES.alt_art,
    fullArt: VARIANT_CONFIG.BASE_RATES.full_art,
  };

  const defaultMultipliers = useGold
    ? VARIANT_CONFIG.GOLD_PACK_MULTIPLIERS.basic
    : { foil: 1, altArt: 1, fullArt: 1 };

  const foilMult = multipliers?.foil ?? defaultMultipliers.foil;
  const altArtMult = multipliers?.altArt ?? defaultMultipliers.altArt;
  const fullArtMult = multipliers?.fullArt ?? defaultMultipliers.fullArt;

  // Calculate effective rates (out of 10,000)
  const foilRate = baseRates.foil * foilMult;
  const altArtRate = baseRates.altArt * altArtMult;
  const fullArtRate = baseRates.fullArt * fullArtMult;

  const roll = Math.random() * 10000;

  // Check from rarest to most common
  if (roll < fullArtRate) return "full_art";
  if (roll < fullArtRate + altArtRate) return "alt_art";
  if (roll < fullArtRate + altArtRate + foilRate) return "foil";

  return "standard";
}

/**
 * Update user's pity counters after pack opening
 *
 * @param ctx - Mutation context
 * @param userId - Player's user ID
 * @param gotEpic - Whether player pulled an epic+ card
 * @param gotLegendary - Whether player pulled a legendary card
 * @param gotFullArt - Whether player pulled a full art variant
 * @param pityThresholds - Optional dynamic pity thresholds from DB config
 * @returns Updated pity counter state and whether any pity was triggered
 */
async function updatePityCounters(
  ctx: MutationCtx,
  userId: Id<"users">,
  gotEpic: boolean,
  gotLegendary: boolean,
  gotFullArt: boolean,
  pityThresholds?: PityThresholds
): Promise<{
  pityTriggered: "epic" | "legendary" | "fullArt" | null;
  counters: { packsSinceEpic: number; packsSinceLegendary: number; packsSinceFullArt: number };
}> {
  const user = await ctx.db.get(userId);
  if (!user) throw createError(ErrorCode.NOT_FOUND_USER);

  // Use dynamic config if provided, otherwise fall back to constants
  const thresholds = pityThresholds ?? PITY_THRESHOLDS;

  const currentCounters = user.pityCounter ?? {
    packsSinceEpic: 0,
    packsSinceLegendary: 0,
    packsSinceFullArt: 0,
  };

  // Check if pity should trigger (before incrementing)
  let pityTriggered: "epic" | "legendary" | "fullArt" | null = null;

  // Legendary pity takes priority
  if (!gotLegendary && currentCounters.packsSinceLegendary + 1 >= thresholds.legendary) {
    pityTriggered = "legendary";
  } else if (!gotEpic && !gotLegendary && currentCounters.packsSinceEpic + 1 >= thresholds.epic) {
    pityTriggered = "epic";
  } else if (!gotFullArt && currentCounters.packsSinceFullArt + 1 >= thresholds.fullArt) {
    pityTriggered = "fullArt";
  }

  // Update counters - reset if got the rarity, otherwise increment
  const newCounters = {
    packsSinceEpic:
      gotEpic || gotLegendary || pityTriggered === "epic" || pityTriggered === "legendary"
        ? 0
        : currentCounters.packsSinceEpic + 1,
    packsSinceLegendary:
      gotLegendary || pityTriggered === "legendary" ? 0 : currentCounters.packsSinceLegendary + 1,
    packsSinceFullArt:
      gotFullArt || pityTriggered === "fullArt" ? 0 : currentCounters.packsSinceFullArt + 1,
  };

  await ctx.db.patch(userId, { pityCounter: newCounters });

  return { pityTriggered, counters: newCounters };
}

/**
 * Open a pack and generate cards based on pack configuration
 *
 * Generates random cards using weighted rarity system with variant selection.
 * Last card in pack gets guaranteed rarity if specified.
 * Implements pity system for epic, legendary, and full art cards.
 * Automatically adds all cards to player's inventory.
 * Uses dynamic RNG configuration from database with fallback to constants.
 *
 * @param ctx - Mutation context
 * @param packConfig - Pack configuration (cardCount, guaranteedRarity, archetype, variantMultipliers)
 * @param userId - Player opening the pack
 * @param useGold - Whether this was a gold purchase (affects variant rates)
 * @returns Array of card results with full details for display
 * @example
 * await openPack(ctx, { cardCount: 5, guaranteedRarity: "rare" }, userId)
 * // Returns 5 cards with variant selection, last one guaranteed rare or better
 */
export async function openPack(
  ctx: MutationCtx,
  packConfig: PackConfig,
  userId: Id<"users">,
  useGold = false
): Promise<CardResult[]> {
  const { cardCount, guaranteedRarity, archetype, variantMultipliers } = packConfig;
  const cards: CardResult[] = [];

  // Fetch dynamic RNG config from database (with fallback to constants)
  const rngConfig = await getFullRngConfig(ctx);

  // ============================================================================
  // ATOMIC PITY COUNTER LOGIC (prevents race condition)
  // ============================================================================
  // 1. Get or create pity state
  const pityState = await ctx.db
    .query("packOpeningPityState")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const currentPity = pityState?.packsSinceLastLegendary ?? 0;

  // 2. Atomic increment FIRST (before checking threshold)
  // This reserves the pity counter value for this pack opening
  // Convex OCC will handle concurrent pack openings - each will get a unique counter value
  let pityStateId: Id<"packOpeningPityState">;
  if (pityState) {
    await ctx.db.patch(pityState._id, {
      packsSinceLastLegendary: currentPity + 1,
    });
    pityStateId = pityState._id;
  } else {
    pityStateId = await ctx.db.insert("packOpeningPityState", {
      userId,
      packsSinceLastLegendary: 1,
      lastLegendaryAt: undefined,
    });
  }

  // 3. Check if pity triggered (after increment) — uses dynamic config from rngConfig
  const pityThreshold = rngConfig.pityThresholds.legendary;
  const triggeredPity = currentPity + 1 >= pityThreshold;
  // ============================================================================

  let gotEpic = false;
  let gotLegendary = false;
  let gotFullArt = false;

  for (let i = 0; i < cardCount; i++) {
    const isLastCard = i === cardCount - 1;
    let rarity: Rarity;

    // 4. If pity triggered, force legendary drop on last card
    if (isLastCard && triggeredPity) {
      rarity = "legendary";
      gotLegendary = true;
    } else if (isLastCard && guaranteedRarity) {
      // Last card gets guaranteed rarity
      rarity = guaranteedRarity;
    } else {
      rarity = weightedRandomRarity(rngConfig.rarityWeights);
    }

    // Track epic/legendary pulls for pity system
    if (rarity === "epic" || rarity === "legendary") gotEpic = true;
    if (rarity === "legendary") gotLegendary = true;

    // Select variant with pack multipliers and dynamic config
    const variant = selectVariant(variantMultipliers, useGold, rngConfig.variantRates);
    if (variant === "full_art") gotFullArt = true;

    // Get random card of this rarity
    const card = await getRandomCard(ctx, rarity, archetype);

    // Add to inventory with variant
    await addCardsToInventory(ctx, userId, card._id, 1, variant, "pack");

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
      variant,
    });
  }

  // 5. Reset pity counter if legendary was pulled (including pity-triggered legendary)
  if (gotLegendary) {
    await ctx.db.patch(pityStateId, {
      packsSinceLastLegendary: 0,
      lastLegendaryAt: Date.now(),
    });
  }

  // Update pity counters and check for pity trigger (with dynamic thresholds)
  const { pityTriggered } = await updatePityCounters(
    ctx,
    userId,
    gotEpic,
    gotLegendary,
    gotFullArt,
    rngConfig.pityThresholds
  );

  // If pity triggered, add a bonus card
  if (pityTriggered) {
    let bonusRarity: Rarity = "epic";
    let bonusVariant: CardVariant = "standard";

    if (pityTriggered === "legendary") {
      bonusRarity = "legendary";
    } else if (pityTriggered === "fullArt") {
      bonusRarity = weightedRandomRarity(rngConfig.rarityWeights); // Random rarity but guaranteed full art
      bonusVariant = "full_art";
    }

    const bonusCard = await getRandomCard(ctx, bonusRarity, archetype);
    await addCardsToInventory(ctx, userId, bonusCard._id, 1, bonusVariant, "pack");

    cards.push({
      cardDefinitionId: bonusCard._id,
      name: bonusCard.name,
      rarity: bonusCard.rarity,
      archetype: bonusCard.archetype,
      cardType: bonusCard.cardType,
      attack: bonusCard.attack,
      defense: bonusCard.defense,
      cost: bonusCard.cost,
      imageUrl: bonusCard.imageUrl,
      variant: bonusVariant,
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
  kFactor: number = ELO_SYSTEM.K_FACTOR,
  ratingFloor: number = ELO_SYSTEM.RATING_FLOOR
): { winnerNewRating: number; loserNewRating: number } {
  // Calculate expected win probability for both players
  const expectedWinner = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  // Calculate rating changes
  // Winner gets 1 point (win), Loser gets 0 points (loss)
  const winnerChange = Math.round(kFactor * (1 - expectedWinner));
  const loserChange = Math.round(kFactor * (0 - expectedLoser));

  return {
    winnerNewRating: Math.max(ratingFloor, winnerRating + winnerChange),
    loserNewRating: Math.max(ratingFloor, loserRating + loserChange),
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
) {
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

/**
 * Get rank tier name from ELO rating
 *
 * Uses RANK_THRESHOLDS constant to determine competitive tier.
 * Bronze (0-1199), Silver (1200-1399), Gold (1400-1599),
 * Platinum (1600-1799), Diamond (1800-1999), Master (2000-2199), Legend (2200+)
 *
 * @param rating - ELO rating value
 * @param thresholds - Optional rank thresholds (defaults to RANK_THRESHOLDS constant)
 * @returns Rank tier name (e.g., "Gold", "Diamond", "Legend")
 * @example
 * getRankFromRating(1500) // "Gold"
 * getRankFromRating(2200) // "Legend"
 * getRankFromRating(800) // "Bronze"
 */
export function getRankFromRating(
  rating: number,
  thresholds: Record<string, number> = RANK_THRESHOLDS
): string {
  // Sort thresholds descending by value
  const sorted = Object.entries(thresholds).sort(([, a], [, b]) => b - a);
  for (const [rank, threshold] of sorted) {
    if (rating >= threshold) return rank;
  }
  return "Bronze";
}
