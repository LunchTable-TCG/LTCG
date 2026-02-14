/**
 * @module @ltcg/core/types/game
 *
 * Game system types (cards, decks, game state).
 * Includes representations for cards in Hand, Board, Backrow, and Graveyard.
 */

import { GAME_CONFIG } from "../config/gameConfig";
import type { JsonAbility } from "./card-logic";
import type { Id } from "./common";

/**
 * Basic simplified CardType
 */
export type CardType = (typeof GAME_CONFIG.CARD_TYPES)[number];

export type Rarity = (typeof GAME_CONFIG.RARITIES)[number];

export type Attribute = (typeof GAME_CONFIG.ATTRIBUTES)[number];

export type Archetype = (typeof GAME_CONFIG.ARCHETYPES)[number];

export type SpellType = (typeof GAME_CONFIG.SPELL_TYPES)[number];

export type TrapType = (typeof GAME_CONFIG.TRAP_TYPES)[number];

export type CardVariant = (typeof GAME_CONFIG.VARIANTS)[number];

export type ViceType = (typeof GAME_CONFIG.VICE_TYPES)[number];

export type RankedFormat = (typeof GAME_CONFIG.RANKED_FORMATS)[number];

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
  /** Type of card (spell, trap, or class) */
  cardType: "spell" | "trap" | "class";
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
