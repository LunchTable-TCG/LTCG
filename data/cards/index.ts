/**
 * Type-safe card data loader with Zod validation
 *
 * Usage:
 *   import { ALL_CARDS, getCardsByArchetype } from "@/data/cards";
 */

import { z } from "zod";

// Import raw JSON data
import infernalDragonsRaw from "./infernal-dragons.json";
import abyssalDepthsRaw from "./abyssal-depths.json";
import ironLegionRaw from "./iron-legion.json";
import necroEmpireRaw from "./necro-empire.json";

// Legacy imports for backwards compatibility
import abyssalHorrorsRaw from "./abyssal-horrors.json";
import natureSpiritsRaw from "./nature-spirits.json";
import stormElementalsRaw from "./storm-elementals.json";

// ============================================================================
// Schema Definitions
// ============================================================================

export const RaritySchema = z.enum([
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
]);

export const CardTypeSchema = z.enum([
  "creature",
  "spell",
  "trap",
  "equipment",
]);

export const ArchetypeSchema = z.enum([
  // Primary archetypes (from card CSV)
  "infernal_dragons",
  "abyssal_depths",
  "iron_legion",
  "necro_empire",
  // Legacy archetypes (for backwards compatibility)
  "abyssal_horrors",
  "nature_spirits",
  "storm_elementals",
  // Future/placeholder archetypes
  "shadow_assassins",
  "celestial_guardians",
  "undead_legion",
  "divine_knights",
  "arcane_mages",
  "mechanical_constructs",
  "neutral",
]);

export const EffectTypeSchema = z.enum([
  "continuous",
  "triggered",
  "ignition",
  "quick",
  "activated",
  "counter",
]);

export const EffectSchema = z.object({
  name: z.string(),
  description: z.string(),
  effectType: EffectTypeSchema,
});

export const CardSchema = z.object({
  name: z.string().min(1),
  rarity: RaritySchema,
  cardType: CardTypeSchema,
  archetype: ArchetypeSchema,
  cost: z.number().int().min(0).max(12),
  attack: z.number().int().min(0).optional(),
  defense: z.number().int().min(0).optional(),
  effects: z.array(EffectSchema).optional(),
  flavorText: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const CardArraySchema = z.array(CardSchema);

// ============================================================================
// Type Exports
// ============================================================================

export type Rarity = z.infer<typeof RaritySchema>;
export type CardType = z.infer<typeof CardTypeSchema>;
export type Archetype = z.infer<typeof ArchetypeSchema>;
export type EffectType = z.infer<typeof EffectTypeSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Card = z.infer<typeof CardSchema>;

// ============================================================================
// Validated Card Data
// ============================================================================

// Parse and validate all card data at module load time
// This ensures any schema violations are caught early

// Primary card sets (from master CSV)
export const INFERNAL_DRAGONS_CARDS = CardArraySchema.parse(infernalDragonsRaw);
export const ABYSSAL_DEPTHS_CARDS = CardArraySchema.parse(abyssalDepthsRaw);
export const IRON_LEGION_CARDS = CardArraySchema.parse(ironLegionRaw);
export const NECRO_EMPIRE_CARDS = CardArraySchema.parse(necroEmpireRaw);

// Legacy card sets (for backwards compatibility)
export const ABYSSAL_HORRORS_CARDS = CardArraySchema.parse(abyssalHorrorsRaw);
export const NATURE_SPIRITS_CARDS = CardArraySchema.parse(natureSpiritsRaw);
export const STORM_ELEMENTALS_CARDS = CardArraySchema.parse(stormElementalsRaw);

/**
 * All cards from all archetypes combined
 * Uses primary card sets (not legacy)
 */
export const ALL_CARDS: Card[] = [
  ...INFERNAL_DRAGONS_CARDS,
  ...ABYSSAL_DEPTHS_CARDS,
  ...IRON_LEGION_CARDS,
  ...NECRO_EMPIRE_CARDS,
];

/**
 * Total card count
 */
export const TOTAL_CARDS = ALL_CARDS.length;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all cards belonging to a specific archetype
 */
export function getCardsByArchetype(archetype: Archetype): Card[] {
  return ALL_CARDS.filter((card) => card.archetype === archetype);
}

/**
 * Get all cards of a specific rarity
 */
export function getCardsByRarity(rarity: Rarity): Card[] {
  return ALL_CARDS.filter((card) => card.rarity === rarity);
}

/**
 * Get all cards of a specific type
 */
export function getCardsByType(cardType: CardType): Card[] {
  return ALL_CARDS.filter((card) => card.cardType === cardType);
}

/**
 * Get a card by name (case-insensitive)
 */
export function getCardByName(name: string): Card | undefined {
  const lowerName = name.toLowerCase();
  return ALL_CARDS.find((card) => card.name.toLowerCase() === lowerName);
}

/**
 * Get all creature cards
 */
export function getCreatures(): Card[] {
  return ALL_CARDS.filter((card) => card.cardType === "creature");
}

/**
 * Get all spell cards
 */
export function getSpells(): Card[] {
  return ALL_CARDS.filter((card) => card.cardType === "spell");
}

/**
 * Get all trap cards
 */
export function getTraps(): Card[] {
  return ALL_CARDS.filter((card) => card.cardType === "trap");
}

/**
 * Get cards that have effects
 */
export function getCardsWithEffects(): Card[] {
  return ALL_CARDS.filter((card) => card.effects && card.effects.length > 0);
}

/**
 * Get card statistics
 */
export function getCardStats() {
  return {
    total: ALL_CARDS.length,
    byArchetype: {
      infernal_dragons: INFERNAL_DRAGONS_CARDS.length,
      abyssal_depths: ABYSSAL_DEPTHS_CARDS.length,
      iron_legion: IRON_LEGION_CARDS.length,
      necro_empire: NECRO_EMPIRE_CARDS.length,
    },
    byRarity: {
      common: getCardsByRarity("common").length,
      uncommon: getCardsByRarity("uncommon").length,
      rare: getCardsByRarity("rare").length,
      epic: getCardsByRarity("epic").length,
      legendary: getCardsByRarity("legendary").length,
    },
    byType: {
      creature: getCreatures().length,
      spell: getSpells().length,
      trap: getTraps().length,
    },
    withEffects: getCardsWithEffects().length,
  };
}
