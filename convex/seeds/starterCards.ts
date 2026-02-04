/**
 * Starter Deck Card Definitions
 *
 * Re-exports card data from the centralized JSON source.
 * Maps deck codes to archetype card data.
 */

// Import from centralized JSON card data
import {
  ABYSSAL_DEPTHS_CARDS as ABYSSAL_DEPTHS_JSON,
  ALL_CARDS,
  type Card,
  // Primary archetypes (from master CSV)
  INFERNAL_DRAGONS_CARDS as INFERNAL_DRAGONS_JSON,
  IRON_LEGION_CARDS as IRON_LEGION_JSON,
  NECRO_EMPIRE_CARDS as NECRO_EMPIRE_JSON,
  // Legacy archetype (still used for Storm Riders deck until we have proper data)
  STORM_ELEMENTALS_CARDS as STORM_ELEMENTALS_JSON,
  getCardsByArchetype,
} from "@data/cards";

import type { CardSeed } from "./types";

/**
 * Convert a Card from JSON to CardSeed format for seeding
 */
function toCardSeed(card: Card): CardSeed {
  if (card.cardType === "creature") {
    if (typeof card.attack !== "number" || typeof card.defense !== "number") {
      throw new Error(`Creature card ${card.name} must have attack and defense values`);
    }
    return {
      name: card.name,
      rarity: card.rarity,
      cardType: card.cardType,
      archetype: card.archetype,
      cost: card.cost,
      attack: card.attack,
      defense: card.defense,
    };
  }

  return {
    name: card.name,
    rarity: card.rarity,
    cardType: card.cardType,
    archetype: card.archetype,
    cost: card.cost,
  };
}

// =============================================================================
// Starter Deck Card Exports
// =============================================================================

/** Fire archetype - Infernal Dragons */
export const INFERNAL_DRAGONS_CARDS: readonly CardSeed[] = INFERNAL_DRAGONS_JSON.map(toCardSeed);

/** Water archetype - Abyssal Depths */
export const ABYSSAL_DEPTHS_CARDS: readonly CardSeed[] = ABYSSAL_DEPTHS_JSON.map(toCardSeed);

/** Earth archetype - Iron Legion */
export const IRON_LEGION_CARDS: readonly CardSeed[] = IRON_LEGION_JSON.map(toCardSeed);

/** Wind archetype - Storm Riders (uses legacy storm_elementals data) */
export const STORM_RIDERS_CARDS: readonly CardSeed[] = STORM_ELEMENTALS_JSON.map(toCardSeed);

/** Dark archetype - Necro Empire */
export const NECRO_EMPIRE_CARDS: readonly CardSeed[] = NECRO_EMPIRE_JSON.map(toCardSeed);

// =============================================================================
// Card Counts
// =============================================================================

export const CARD_COUNTS = {
  INFERNAL_DRAGONS: INFERNAL_DRAGONS_CARDS.length,
  ABYSSAL_DEPTHS: ABYSSAL_DEPTHS_CARDS.length,
  IRON_LEGION: IRON_LEGION_CARDS.length,
  STORM_RIDERS: STORM_RIDERS_CARDS.length,
  NECRO_EMPIRE: NECRO_EMPIRE_CARDS.length,
  TOTAL: ALL_CARDS.length,
};

// Re-export utilities for convenience
export { ALL_CARDS, getCardsByArchetype };
export type { Card };
