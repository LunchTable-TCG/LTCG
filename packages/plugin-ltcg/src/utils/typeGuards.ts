/**
 * Type Guards for LTCG Plugin
 *
 * Runtime type checking utilities for discriminated unions and API responses.
 */

import type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  BoardCard,
  CardInGraveyard,
  CardInHand,
  StereotypeCard,
  SpellTrapCard,
} from "../types/api";

// ============================================================================
// Card Type Guards
// ============================================================================

/**
 * Check if a CardInHand is a stereotype (monster)
 */
export function isStereotypeCard(
  card: CardInHand | null | undefined
): card is CardInHand & { cardType: "stereotype" } {
  return card != null && (card.cardType === "stereotype" || card.type === "stereotype");
}

/**
 * Check if a CardInHand is a spell
 */
export function isSpellCard(
  card: CardInHand | null | undefined
): card is CardInHand & { cardType: "spell" } {
  return card != null && card.cardType === "spell";
}

/**
 * Check if a CardInHand is a trap
 */
export function isTrapCard(
  card: CardInHand | null | undefined
): card is CardInHand & { cardType: "trap" } {
  return card != null && card.cardType === "trap";
}

/**
 * Check if a CardInHand is a class card
 */
export function isClassCard(
  card: CardInHand | null | undefined
): card is CardInHand & { cardType: "class" } {
  return card != null && (card.cardType === "class" || card.type === "class");
}

/**
 * Check if a BoardCard is a stereotype
 */
export function isBoardStereotype(
  card: BoardCard | null | undefined
): card is BoardCard & { cardType: "stereotype" } {
  return card != null && card.cardType === "stereotype";
}

/**
 * Check if a BoardCard is a spell/trap on field
 */
export function isBoardSpellTrap(
  card: BoardCard | null | undefined
): card is BoardCard & { cardType: "spell" | "trap" } {
  return card != null && (card.cardType === "spell" || card.cardType === "trap");
}

// ============================================================================
// Board Card Type Guards
// ============================================================================

/**
 * Check if a card is a StereotypeCard (legacy format from normalization)
 */
export function isMonsterCard(card: unknown): card is StereotypeCard {
  if (typeof card !== "object" || card === null) return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.boardIndex === "number" &&
    typeof c.cardId === "string" &&
    typeof c.name === "string" &&
    (c.position === "attack" || c.position === "defense" || c.position === "facedown")
  );
}

/**
 * Check if a card is a SpellTrapCard (legacy format)
 */
export function isSpellTrapCard(card: unknown): card is SpellTrapCard {
  if (typeof card !== "object" || card === null) return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.boardIndex === "number" &&
    typeof c.cardId === "string" &&
    typeof c.name === "string" &&
    typeof c.faceUp === "boolean" &&
    (c.type === "spell" || c.type === "trap")
  );
}

/**
 * Check if a card is in the graveyard
 */
export function isGraveyardCard(card: unknown): card is CardInGraveyard {
  if (typeof card !== "object" || card === null) return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.cardId === "string" &&
    typeof c.name === "string" &&
    (c.type === "stereotype" || c.type === "spell" || c.type === "trap" || c.type === "class")
  );
}

// ============================================================================
// API Response Type Guards
// ============================================================================

/**
 * Check if an API response is a success response
 */
export function isApiSuccessResponse<T>(
  response: ApiResponse<T> | unknown
): response is ApiSuccessResponse<T> {
  if (typeof response !== "object" || response === null) return false;
  const r = response as Record<string, unknown>;
  return r.success === true && "data" in r;
}

/**
 * Check if an API response is an error response
 */
export function isApiErrorResponse(
  response: ApiResponse<unknown> | unknown
): response is ApiErrorResponse {
  if (typeof response !== "object" || response === null) return false;
  const r = response as Record<string, unknown>;
  return r.success === false && "error" in r && typeof r.error === "object";
}

// ============================================================================
// Game State Type Guards
// ============================================================================

/**
 * Check if a game state phase is a main phase (can summon, set cards)
 */
export function isMainPhase(phase: string | undefined): phase is "main" {
  return phase === "main";
}

/**
 * Check if a game state phase is combat phase
 */
export function isCombatPhase(phase: string | undefined): phase is "combat" {
  return phase === "combat";
}

/**
 * Check if a game phase allows summoning
 */
export function canSummonInPhase(phase: string | undefined): boolean {
  return isMainPhase(phase);
}

/**
 * Check if a game phase allows attacking
 */
export function canAttackInPhase(phase: string | undefined): boolean {
  return isCombatPhase(phase);
}

// ============================================================================
// Position Guards
// ============================================================================

/**
 * Check if a monster is in attack position
 */
export function isAttackPosition(position: unknown): position is "attack" | 1 {
  return position === "attack" || position === 1;
}

/**
 * Check if a monster is in defense position
 */
export function isDefensePosition(position: unknown): position is "defense" | 2 {
  return position === "defense" || position === 2;
}

/**
 * Check if a card is face-down
 */
export function isFaceDown(card: BoardCard | StereotypeCard | null | undefined): boolean {
  if (card == null) return false;
  if ("isFaceDown" in card) return card.isFaceDown;
  if ("position" in card && card.position === "facedown") return true;
  if ("faceUp" in card) return card.faceUp === false;
  return false;
}
