/**
 * @module @ltcg/core/types/game
 *
 * Game system types (cards, decks, game state).
 * Includes representations for cards in Hand, Board, Backrow, and Graveyard.
 */

import type { JsonAbility } from "./card-logic";
import type { Id } from "./common";

/**
 * Basic simplified CardType
 */
export type CardType = "creature" | "spell" | "trap" | "equipment";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type Attribute =
  | "fire"
  | "water"
  | "earth"
  | "wind"
  | "light"
  | "dark"
  | "divine"
  | "neutral";

/** @deprecated Use Attribute instead */
export type Element = Attribute;

export type Archetype =
  | "infernal_dragons"
  | "abyssal_depths"
  | "iron_legion"
  | "necro_empire"
  | "abyssal_horrors"
  | "nature_spirits"
  | "storm_elementals"
  | "shadow_assassins"
  | "celestial_guardians"
  | "undead_legion"
  | "divine_knights"
  | "arcane_mages"
  | "mechanical_constructs"
  | "neutral"
  | "fire"
  | "water"
  | "earth"
  | "wind";

export type MonsterType =
  | "dragon"
  | "spellcaster"
  | "warrior"
  | "beast"
  | "fiend"
  | "zombie"
  | "machine"
  | "aqua"
  | "pyro"
  | "divine_beast";

export type SpellType = "normal" | "quick_play" | "continuous" | "field" | "equip" | "ritual";

export type TrapType = "normal" | "continuous" | "counter";

export type CardVariant =
  | "standard"
  | "foil"
  | "alt_art"
  | "full_art"
  | "numbered"
  | "first_edition";

/**
 * Card representation in the player's hand.
 */
export interface HandCard {
  /** Unique card definition ID */
  _id: Id<"cardDefinitions">;
  /** Card name */
  name: string;
  /** URL to card artwork (optional) */
  imageUrl?: string;
  /** Type of card */
  cardType: CardType;
  /** Attack points (creature cards only) */
  attack?: number;
  /** Defense points (creature cards only) */
  defense?: number;
  /** Level/rank of the card (creature cards only) */
  level?: number;
  /** Rarity tier (common, rare, legendary, etc.) */
  rarity: string;
  /** Deck archetype (optional) */
  archetype?: string;
  /** Card ability as JSON structure (optional) */
  ability?: JsonAbility;
  /** Human-readable ability text for display (optional) */
  abilityText?: string;
  /** Effect category (trigger, continuous, etc.) */
  effectType?: string;
}

/**
 * Card representation on the game board (monster zone).
 */
export interface BoardCard {
  /** Unique card definition ID */
  _id: Id<"cardDefinitions">;
  /** Card name */
  name: string;
  /** URL to card artwork (optional) */
  imageUrl?: string;
  /** Type of card */
  cardType: CardType;
  /** Attack points (creature cards only) */
  attack?: number;
  /** Defense points (creature cards only) */
  defense?: number;
  /** Level/rank of the card (creature cards only) */
  level?: number;
  /** Rarity tier */
  rarity: string;
  /** Deck archetype (optional) */
  archetype?: string;
  /** Card position on the board (optional) */
  position?: "attack" | "defense";
  /** Whether the card is face-down */
  isFaceDown: boolean;
  /** Card ability as JSON structure (optional) */
  ability?: JsonAbility;
  /** Human-readable ability text for display (optional) */
  abilityText?: string;
  /** Effect category */
  effectType?: string;
}

/**
 * Spell or trap card in the backrow (spell/trap zone).
 */
export interface BackrowCard {
  /** Unique card definition ID */
  _id: Id<"cardDefinitions">;
  /** Card name */
  name: string;
  /** URL to card artwork (optional) */
  imageUrl?: string;
  /** Type of card (spell or trap only) */
  cardType: "spell" | "trap";
  /** Rarity tier */
  rarity: string;
  /** Deck archetype (optional) */
  archetype?: string;
  /** Whether the card is face-down (set) */
  isFaceDown: boolean;
  /** Card ability as JSON structure (optional) */
  ability?: JsonAbility;
  /** Human-readable ability text for display (optional) */
  abilityText?: string;
  /** Effect category */
  effectType?: string;
}

/**
 * Card representation in the graveyard.
 */
export interface GraveyardCard {
  /** Unique card definition ID */
  _id: Id<"cardDefinitions">;
  /** Card name */
  name: string;
  /** URL to card artwork (optional) */
  imageUrl?: string;
  /** Whether the card is face-down (rarely used in graveyard) */
  isFaceDown: boolean;
}
