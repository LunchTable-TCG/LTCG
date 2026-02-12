import type { DeckCard } from "@/types/binder";

export interface DeckStats {
  avgCost: string;
  creatureCount: number;
  spellCount: number;
  totalCards: number;
}

/**
 * Calculate statistics for a deck
 */
export function calculateDeckStats(deckCards: DeckCard[]): DeckStats {
  let totalCost = 0;
  let creatureCount = 0;
  let spellCount = 0;
  let totalCards = 0;

  for (const { card, count } of deckCards) {
    const cardTotalCost = card.cost * count;
    totalCost += cardTotalCost;
    totalCards += count;

    if (card.cardType === "creature") creatureCount += count;
    if (card.cardType === "spell") spellCount += count;
  }

  return {
    avgCost: totalCards > 0 ? (totalCost / totalCards).toFixed(1) : "0",
    creatureCount,
    spellCount,
    totalCards,
  };
}
