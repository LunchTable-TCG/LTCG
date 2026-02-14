import type { CardDefinition } from "./types/index.js";

export type CardLookup = Record<string, CardDefinition>;

export function defineCards(cards: CardDefinition[]): CardLookup {
  const lookup: CardLookup = {};
  for (const card of cards) {
    if (lookup[card.id]) {
      throw new Error(`Duplicate card ID: ${card.id}`);
    }
    if (card.type === "stereotype") {
      if (card.attack === undefined || card.defense === undefined) {
        throw new Error(`Stereotype "${card.id}" must have attack and defense`);
      }
      if (card.level === undefined) {
        throw new Error(`Stereotype "${card.id}" must have a level`);
      }
    }
    lookup[card.id] = card;
  }
  return lookup;
}

export interface DeckValidation {
  valid: boolean;
  errors: string[];
}

export function validateDeck(
  deckCardIds: string[],
  cardLookup: CardLookup,
  sizeConstraint: { min: number; max: number },
): DeckValidation {
  const errors: string[] = [];

  if (deckCardIds.length < sizeConstraint.min) {
    errors.push(`Deck has too few cards (${deckCardIds.length}/${sizeConstraint.min})`);
  }
  if (deckCardIds.length > sizeConstraint.max) {
    errors.push(`Deck has too many cards (${deckCardIds.length}/${sizeConstraint.max})`);
  }
  for (const id of deckCardIds) {
    if (!cardLookup[id]) {
      errors.push(`Unknown card ID: ${id}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
