/**
 * Starter Deck Card Definitions
 *
 * Re-exports card data from the centralized JSON source.
 * 45 cards per deck (30 monsters, 10 spells, 5 traps)
 */

// Import from centralized JSON card data
import {
  ABYSSAL_HORRORS_CARDS as ABYSSAL_HORRORS_JSON,
  ALL_CARDS,
  type Card,
  INFERNAL_DRAGONS_CARDS as INFERNAL_DRAGONS_JSON,
  NATURE_SPIRITS_CARDS as NATURE_SPIRITS_JSON,
  STORM_ELEMENTALS_CARDS as STORM_ELEMENTALS_JSON,
  getCardsByArchetype,
} from "@data/cards";

import type { CardSeed } from "./types";

/**
 * Convert a Card from JSON to CardSeed format for seeding
 */
function toCardSeed(card: Card): CardSeed {
  if (card.cardType === "creature" || card.cardType === "agent") {
    return {
      name: card.name,
      rarity: card.rarity,
      cardType: card.cardType,
      archetype: card.archetype,
      cost: card.cost,
      attack: card.attack!,
      defense: card.defense!,
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

// Export cards in CardSeed format for backward compatibility
export const INFERNAL_DRAGONS_CARDS: readonly CardSeed[] = INFERNAL_DRAGONS_JSON.map(toCardSeed);

export const ABYSSAL_DEPTHS_CARDS: readonly CardSeed[] = ABYSSAL_HORRORS_JSON.map(toCardSeed);

export const IRON_LEGION_CARDS: readonly CardSeed[] = NATURE_SPIRITS_JSON.map(toCardSeed);

export const STORM_RIDERS_CARDS: readonly CardSeed[] = STORM_ELEMENTALS_JSON.map(toCardSeed);

// Re-export utilities for convenience
export { ALL_CARDS, getCardsByArchetype };
export type { Card };
