/**
 * @module @ltcg/core/config/gameConfig
 *
 * Centralized configuration for the LunchTable TCG engine.
 * This is the single source of truth — all types are derived via TypeScript inference.
 * Changing values here cascades type errors everywhere they're used.
 */

export const GAME_CONFIG = {
  // 1. Archetypes (6 Stereotypes)
  ARCHETYPES: [
    "dropout",
    "prep",
    "geek",
    "freak",
    "nerd",
    "goodie_two_shoes",
  ] as const,

  // 2. Core Card Types (creature→stereotype, equipment→class)
  CARD_TYPES: ["stereotype", "spell", "trap", "class"] as const,

  // 3. Rarity Tiers
  RARITIES: ["common", "uncommon", "rare", "epic", "legendary"] as const,

  // 4. Attributes / Archetype Colors
  ATTRIBUTES: ["red", "blue", "yellow", "purple", "green", "white"] as const,

  // 5. Spell Categories (simplified: no ritual, no equip since equipment→class)
  SPELL_TYPES: ["normal", "quick_play", "continuous"] as const,

  // 6. Trap Categories
  TRAP_TYPES: ["normal", "continuous", "counter"] as const,

  // 7. Visual Variants
  VARIANTS: [
    "standard",
    "foil",
    "alt_art",
    "full_art",
    "numbered",
    "first_edition",
    "detention_foil",
    "rock_bottom",
  ] as const,

  // 8. Vice Types (self-destruction mechanic)
  VICE_TYPES: [
    "gambling",
    "alcohol",
    "social_media",
    "crypto",
    "validation",
    "conspiracy",
    "narcissism",
    "adderall",
    "mlm",
    "rage",
  ] as const,

  // 9. Stereotype Levels (summoning tiers)
  STEREOTYPE_LEVELS: {
    FRESHMAN: { range: [1, 3], tributes: 0 },
    JUNIOR: { range: [4, 6], tributes: 0 },
    SENIOR: { range: [7, 12], tributes: 1 },
  } as const,

  // 10. Board Layout
  BOARD: {
    MAX_STEREOTYPES: 3,
    MAX_SET_ZONES: 3,
    MAX_CLASS_ZONES: 1,
    MAX_HAND_SIZE: 7,
    STARTING_HAND_SIZE: 5,
    STARTING_LP: 8000,
    STARTING_CLOUT: 0,
  } as const,

  // 11. Vice/Breakdown Constants
  VICE: {
    BREAKDOWN_THRESHOLD: 3,
    MAX_BREAKDOWNS_WIN: 3,
  } as const,

  // 12. UI Display Labels (avoids renaming 100+ engine files)
  DISPLAY_LABELS: {
    attack: "Reputation",
    defense: "Stability",
    lifePoints: "Life Points",
    mana: "Clout",
    graveyard: "Hallway",
    banished: "Expelled",
    monster: "Stereotype",
    fieldSpell: "Class",
    board: "Stereotype Zone",
    spellTrapZone: "Set Zone",
  } as const,

  // 13. Archetype → Attribute mapping (for color coding)
  ARCHETYPE_TO_ATTRIBUTE: {
    dropout: "red",
    prep: "blue",
    geek: "yellow",
    freak: "purple",
    nerd: "green",
    goodie_two_shoes: "white",
  } as Record<string, string>,

  // 14. Archetype playstyle metadata
  ARCHETYPE_PLAYSTYLES: {
    dropout: { strategy: "aggro", description: "Fast pressure, high reputation, low stability" },
    prep: { strategy: "midrange", description: "Balanced board presence, buff synergy" },
    geek: { strategy: "combo", description: "Card advantage, tech synergy" },
    freak: { strategy: "chaos", description: "Disruption, unpredictable effects" },
    nerd: { strategy: "control", description: "Trap heavy, calculation, counterplay" },
    goodie_two_shoes: { strategy: "attrition", description: "Stability regen, vice suppression" },
  } as const,

  // 15. Ranked Formats
  RANKED_FORMATS: [
    "standard",
    "detention",
    "class_reunion",
    "rock_bottom",
  ] as const,
} as const;

export type GameConfig = typeof GAME_CONFIG;
