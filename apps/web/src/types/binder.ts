import type { JsonAbility } from "@/lib/cardHelpers";
import type { CardType, Element, Rarity } from "@/types/cards";

export interface CardData {
  id: string;
  cardDefinitionId?: string;
  name: string;
  rarity: Rarity;
  element: Element;
  cardType: CardType;
  imageUrl?: string;
  attack?: number;
  defense?: number;
  cost: number;
  ability?: JsonAbility;
  flavorText?: string;
  owned: number;
  isFavorite?: boolean;
}

export interface DeckCard {
  card: CardData;
  count: number;
}

export type ViewMode = "grid" | "list";
export type BinderTab = "collection" | "deckbuilder";

// Constants
export const DECK_MIN_SIZE = 30;
export const MAX_COPIES_PER_CARD = 3;
export const MAX_LEGENDARY_COPIES = 1;

export const RARITY_ORDER: Record<Rarity, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};
