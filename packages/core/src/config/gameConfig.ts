/**
 * @module @ltcg/core/config/gameConfig
 *
 * Centralized configuration for the TCG engine.
 * Modify these lists to adapt the engine to different games.
 */

export const GAME_CONFIG = {
  // 1. Archetypes (The major card groups/families)
  ARCHETYPES: [
    "infernal_dragons",
    "abyssal_depths",
    "iron_legion",
    "necro_empire",
    "abyssal_horrors",
    "nature_spirits",
    "storm_elementals",
    "shadow_assassins",
    "celestial_guardians",
    "undead_legion",
    "divine_knights",
    "arcane_mages",
    "mechanical_constructs",
    "neutral",
    "fire",
    "water",
    "earth",
    "wind"
  ] as const,

  // 2. Core Card Types
  CARD_TYPES: ["creature", "spell", "trap", "equipment"] as const,

  // 3. Rarity Tiers
  RARITIES: ["common", "uncommon", "rare", "epic", "legendary"] as const,

  // 4. Attributes / Elements
  ATTRIBUTES: ["fire", "water", "earth", "wind", "light", "dark", "divine", "neutral"] as const,

  // 5. Monster Types (Sub-groups of creatures)
  MONSTER_TYPES: [
    "dragon",
    "spellcaster",
    "warrior",
    "beast",
    "fiend",
    "zombie",
    "machine",
    "aqua",
    "pyro",
    "divine_beast"
  ] as const,

  // 6. Spell Categories
  SPELL_TYPES: ["normal", "quick_play", "continuous", "field", "equip", "ritual"] as const,

  // 7. Trap Categories
  TRAP_TYPES: ["normal", "continuous", "counter"] as const,

  // 8. Visual Variants
  VARIANTS: [
    "standard",
    "foil",
    "alt_art",
    "full_art",
    "numbered",
    "first_edition"
  ] as const,

  // 9. Mappings
  // Maps an Archetype to its primary Attribute/Element for UI coloring/filtering
  ARCHETYPE_TO_ATTRIBUTE: {
    infernal_dragons: "fire",
    abyssal_depths: "water",
    iron_legion: "earth",
    necro_empire: "dark",
    abyssal_horrors: "water",
    nature_spirits: "earth",
    storm_elementals: "wind",
    fire: "fire",
    water: "water",
    earth: "earth",
    wind: "wind",
  } as Record<string, string>,
} as const;

export type GameConfig = typeof GAME_CONFIG;
