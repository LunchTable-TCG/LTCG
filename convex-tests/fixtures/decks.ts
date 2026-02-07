/**
 * Deck Test Fixtures
 * Pre-built test decks for gameplay testing
 */

export interface TestDeckConfig {
  name: string;
  cardIds: string[]; // Card definition IDs
  archetype?: "fire" | "water" | "earth" | "wind" | "neutral";
}

/**
 * Create a valid 30-card deck for testing
 * Returns card IDs that should exist in cardDefinitions
 */
export function createValidTestDeck(overrides?: Partial<TestDeckConfig>): TestDeckConfig {
  return {
    name: `Test Deck ${Date.now()}`,
    cardIds: [
      // 15 monsters (assuming these are seeded in test environment)
      ...Array(15).fill("starter_monster_1"),
      // 10 spells
      ...Array(10).fill("starter_spell_1"),
      // 5 traps
      ...Array(5).fill("starter_trap_1"),
    ],
    archetype: "fire",
    ...overrides,
  };
}

/**
 * Create an invalid deck (too few cards) for validation testing
 */
export function createInvalidTestDeck(): TestDeckConfig {
  return {
    name: `Invalid Deck ${Date.now()}`,
    cardIds: Array(20).fill("starter_monster_1"), // Only 20 cards (need 30)
    archetype: "fire",
  };
}

/**
 * Create a deck with specific archetype
 */
export function createTestDeckWithArchetype(
  archetype: "fire" | "water" | "earth" | "wind"
): TestDeckConfig {
  return createValidTestDeck({ archetype });
}

/**
 * Create multiple test decks
 */
export function createTestDecks(count: number): TestDeckConfig[] {
  return Array.from({ length: count }, () => createValidTestDeck());
}

/**
 * Standard deck compositions for different strategies
 */
export const STANDARD_DECKS = {
  AGGRO: {
    name: "Aggro Deck",
    cardIds: [
      ...Array(20).fill("starter_monster_1"), // High attack monsters
      ...Array(5).fill("starter_spell_1"), // Direct damage spells
      ...Array(5).fill("starter_trap_1"), // Minimal traps
    ],
  },
  CONTROL: {
    name: "Control Deck",
    cardIds: [
      ...Array(10).fill("starter_monster_1"),
      ...Array(10).fill("starter_spell_1"), // Removal spells
      ...Array(10).fill("starter_trap_1"), // Heavy traps
    ],
  },
  BALANCED: {
    name: "Balanced Deck",
    cardIds: [
      ...Array(15).fill("starter_monster_1"),
      ...Array(10).fill("starter_spell_1"),
      ...Array(5).fill("starter_trap_1"),
    ],
  },
} as const;
