export interface StarterDeckOption {
  id: string;
  name: string;
  archetype: "fire" | "water" | "earth" | "wind";
  description: string;
}

export type DeckCode = "INFERNAL_DRAGONS" | "ABYSSAL_DEPTHS";

export const STARTER_DECK_MAP: Record<string, DeckCode> = {
  fire: "INFERNAL_DRAGONS",
  water: "ABYSSAL_DEPTHS",
};
