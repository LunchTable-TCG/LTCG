// Starter deck definitions for AI agents
// Each deck has 45 cards focused on a single archetype

import type { DeckArchetype, StarterDeckDefinition } from "./types";

export const STARTER_DECKS: readonly StarterDeckDefinition[] = [
  {
    name: "Infernal Dragons Starter",
    deckCode: "INFERNAL_DRAGONS",
    archetype: "fire" satisfies DeckArchetype,
    description: "Harness the fury of fire dragons. Aggressive beatdown with burn damage.",
    playstyle: "Aggro",
    cardCount: 45,
  },
  {
    name: "Abyssal Depths Starter",
    deckCode: "ABYSSAL_DEPTHS",
    archetype: "water" satisfies DeckArchetype,
    description: "Control the tides of battle. Bounce and freeze your opponent's threats.",
    playstyle: "Control",
    cardCount: 45,
  },
  {
    name: "Iron Legion Starter",
    deckCode: "IRON_LEGION",
    archetype: "earth" satisfies DeckArchetype,
    description: "Build an unbreakable defense. High DEF monsters that protect each other.",
    playstyle: "Midrange",
    cardCount: 45,
  },
  {
    name: "Storm Riders Starter",
    deckCode: "STORM_RIDERS",
    archetype: "wind" satisfies DeckArchetype,
    description: "Strike fast and draw cards. Direct attacks and tempo plays.",
    playstyle: "Tempo",
    cardCount: 45,
  },
] as const;

export type StarterDeckCode = (typeof STARTER_DECKS)[number]["deckCode"];

export const VALID_DECK_CODES: readonly StarterDeckCode[] = STARTER_DECKS.map((d) => d.deckCode);
