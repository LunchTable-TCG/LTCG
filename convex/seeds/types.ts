/**
 * Proper type definitions for seed data
 * NO type assertions needed - everything is explicitly typed
 */

import type { JsonAbilityInfer } from "../gameplay/effectSystem/jsonEffectValidators";

// Card property types matching schema exactly
export type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CardType = "creature" | "spell" | "trap" | "equipment";
export type Archetype =
  | "infernal_dragons"
  | "abyssal_depths"
  | "iron_legion"
  | "necro_empire"
  // Legacy archetypes (kept for backwards compatibility)
  | "abyssal_horrors"
  | "nature_spirits"
  | "storm_elementals"
  // Future archetypes
  | "shadow_assassins"
  | "celestial_guardians"
  | "undead_legion"
  | "divine_knights"
  | "arcane_mages"
  | "mechanical_constructs"
  | "neutral"
  // Old element-based archetypes (deprecated but still in schema)
  | "fire"
  | "water"
  | "earth"
  | "wind";
export type DeckArchetype = "fire" | "water" | "earth" | "wind" | "dark" | "neutral";

// JSON ability type alias for seed data
export type JsonAbility = JsonAbilityInfer;

// Monster card definition
export interface MonsterCardSeed {
  readonly name: string;
  readonly rarity: CardRarity;
  readonly cardType: "creature";
  readonly archetype: Archetype;
  readonly cost: number;
  readonly attack: number;
  readonly defense: number;
  readonly ability?: JsonAbility;
}

// Spell card definition
export interface SpellCardSeed {
  readonly name: string;
  readonly rarity: CardRarity;
  readonly cardType: "spell";
  readonly archetype: Archetype;
  readonly cost: number;
  readonly ability?: JsonAbility;
}

// Trap card definition
export interface TrapCardSeed {
  readonly name: string;
  readonly rarity: CardRarity;
  readonly cardType: "trap";
  readonly archetype: Archetype;
  readonly cost: number;
  readonly ability?: JsonAbility;
}

// Equipment card definition
export interface EquipmentCardSeed {
  readonly name: string;
  readonly rarity: CardRarity;
  readonly cardType: "equipment";
  readonly archetype: Archetype;
  readonly cost: number;
  readonly attack?: number;
  readonly defense?: number;
  readonly ability?: JsonAbility;
}

// Union of all card types
export type CardSeed = MonsterCardSeed | SpellCardSeed | TrapCardSeed | EquipmentCardSeed;

// Starter deck definition
export interface StarterDeckDefinition {
  readonly deckCode: string;
  readonly name: string;
  readonly archetype: DeckArchetype;
  readonly description: string;
  readonly playstyle: string;
  readonly cardCount: number;
}
