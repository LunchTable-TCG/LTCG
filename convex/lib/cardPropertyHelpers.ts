/**
 * Card Property Helpers
 *
 * Helper functions for accessing card properties with fallback logic.
 * Ensures backward compatibility with existing cards that don't have
 * the new industry-standard TCG fields populated.
 */

import type { Doc } from "../_generated/dataModel";
import type { Attribute } from "./types";

// =============================================================================
// Card Definition Helpers
// =============================================================================

/**
 * Get card level with fallback to cost
 *
 * If the card has an explicit `level` field, use it.
 * Otherwise, fall back to `cost` for backward compatibility.
 *
 * @param card - Card definition document
 * @returns Card level (1-12)
 */
export function getCardLevel(card: Doc<"cardDefinitions">): number {
  return card.level ?? card.cost;
}

/**
 * Get card attribute with fallback to archetype derivation
 *
 * If the card has an explicit `attribute` field, use it.
 * Otherwise, derive from archetype using the existing mapping.
 *
 * @param card - Card definition document
 * @returns Card attribute
 */
export function getCardAttribute(card: Doc<"cardDefinitions">): Attribute {
  if (card.attribute) {
    return card.attribute;
  }

  // Fallback: derive from archetype
  return deriveAttributeFromArchetype(card.archetype);
}

/**
 * Derive attribute from archetype name
 *
 * Maps archetype identifiers to their corresponding attributes.
 * Used as fallback when explicit attribute is not set.
 *
 * @param archetype - Archetype identifier
 * @returns Derived attribute
 */
export function deriveAttributeFromArchetype(archetype: string): Attribute {
  const mapping: Record<string, Attribute> = {
    dropout: "red",
    prep: "blue",
    geek: "yellow",
    freak: "purple",
    nerd: "green",
    goodie_two_shoes: "white",
  };

  return mapping[archetype.toLowerCase()] || "white";
}

/**
 * Get tribute count required for a card based on its level
 *
 * LTCG rules:
 * - Level 1-6: No tributes required
 * - Level 7+: 1 tribute required
 *
 * @param card - Card definition document
 * @returns Number of tributes required (0 or 1)
 */
export function getTributeCount(card: Doc<"cardDefinitions">): number {
  const level = getCardLevel(card);
  if (level >= 7) return 1;
  return 0;
}

/**
 * Check if a card requires tributes for normal summon
 *
 * @param card - Card definition document
 * @returns True if tributes are required
 */
export function requiresTributes(card: Doc<"cardDefinitions">): boolean {
  return getTributeCount(card) > 0;
}

// =============================================================================
// Board Card Instance Helpers
// =============================================================================

/**
 * Token data for generated token monsters
 */
export interface TokenData {
  name: string;
  atk: number;
  def: number;
  level?: number;
  attribute?: string;
  type?: string;
}

/**
 * Board card instance type (from game state)
 */
interface BoardCard {
  cardId: Doc<"cardDefinitions">["_id"];
  position: number;
  attack: number;
  defense: number;
  hasAttacked: boolean;
  isFaceDown: boolean;
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
  hasChangedPosition?: boolean;
  turnSummoned?: number;
  equippedCards?: Doc<"cardDefinitions">["_id"][];
  isToken?: boolean;
  tokenData?: TokenData;
}

/**
 * Check if a board card can change position this turn
 *
 * Rules:
 * - Cannot change position if summoned this turn
 * - Cannot change position if already changed this turn
 * - Face-down monsters cannot change position (flip summon is different)
 *
 * @param boardCard - Board card instance
 * @param currentTurn - Current turn number
 * @returns True if position change is allowed
 */
export function canChangePosition(boardCard: BoardCard, currentTurn: number): boolean {
  // Cannot change position if summoned this turn
  if (boardCard.turnSummoned === currentTurn) {
    return false;
  }

  // Cannot change position if already changed this turn
  if (boardCard.hasChangedPosition === true) {
    return false;
  }

  // Face-down monsters cannot manually change position
  if (boardCard.isFaceDown) {
    return false;
  }

  return true;
}

/**
 * Check if a board card was summoned this turn
 *
 * @param boardCard - Board card instance
 * @param currentTurn - Current turn number
 * @returns True if summoned this turn
 */
export function wasSummonedThisTurn(boardCard: BoardCard, currentTurn: number): boolean {
  return boardCard.turnSummoned === currentTurn;
}

/**
 * Create initial board card state for a newly summoned monster
 *
 * @param cardId - Card definition ID
 * @param card - Card definition document
 * @param position - 1 for attack, -1 for defense
 * @param isFaceDown - Whether the monster is set face-down
 * @param currentTurn - Current turn number
 * @returns Board card instance
 */
export function createBoardCard(
  cardId: Doc<"cardDefinitions">["_id"],
  card: Doc<"cardDefinitions">,
  position: number,
  isFaceDown: boolean,
  currentTurn: number
): BoardCard {
  return {
    cardId,
    position,
    attack: card.attack ?? 0,
    defense: card.defense ?? 0,
    hasAttacked: false,
    isFaceDown,
    hasChangedPosition: false,
    turnSummoned: currentTurn,
  };
}

/**
 * Reset turn-based flags on board cards at end of turn
 *
 * Call this for all board cards when a turn ends.
 * Resets hasAttacked and hasChangedPosition flags.
 *
 * @param boardCard - Board card instance
 * @returns Updated board card instance
 */
export function resetTurnFlags(boardCard: BoardCard): BoardCard {
  return {
    ...boardCard,
    hasAttacked: false,
    hasChangedPosition: false,
  };
}

/**
 * Check if a board card is a token
 *
 * @param boardCard - Board card instance
 * @returns True if the card is a token
 */
export function isToken(boardCard: BoardCard): boolean {
  return boardCard.isToken === true;
}

/**
 * Get token data from a board card
 *
 * @param boardCard - Board card instance
 * @returns Token data if the card is a token, null otherwise
 */
export function getTokenData(boardCard: BoardCard): TokenData | null {
  return boardCard.isToken && boardCard.tokenData ? boardCard.tokenData : null;
}
