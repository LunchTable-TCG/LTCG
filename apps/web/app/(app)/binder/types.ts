import type { CardData } from "./components";

export interface DeckCard {
  card: CardData;
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  cards: DeckCard[];
  createdAt: number;
  updatedAt: number;
}

export type ViewMode = "grid" | "list";
export type BinderTab = "collection" | "deckbuilder";

// Constants
export const DECK_MIN_SIZE = 30;
export const MAX_COPIES_PER_CARD = 3;
export const MAX_LEGENDARY_COPIES = 1;
export const MAX_AGENT_CARDS_PER_DECK = 3;
