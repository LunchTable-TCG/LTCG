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
  MonsterCard,
  SpellTrapCard,
} from "../types/api";

// ============================================================================
// Card Type Guards
// ============================================================================

/**
 * Check if a CardInHand is a creature/monster
 */
export function isCreatureCard(
  card: CardInHand | null | undefined
): card is CardInHand & { cardType: "creature" } {
  return card != null && (card.cardType === "creature" || card.type === "creature");
}

/**
 * Check if a CardInHand is a spell
 */
export function isSpellCard(
  card: CardInHand | null | undefined
): card is CardInHand & { cardType: "spell" } {
  return card != null && (card.cardType === "spell" || card.type === "spell");
}

/**
 * Check if a CardInHand is a trap
 */
export function isTrapCard(
  card: CardInHand | null | undefined
): card is CardInHand & { cardType: "trap" } {
  return card != null && (card.cardType === "trap" || card.type === "trap");
}

/**
 * Check if a CardInHand is equipment
 */
export function isEquipmentCard(
  card: CardInHand | null | undefined
): card is CardInHand & { cardType: "equipment" } {
  return card != null && (card.cardType === "equipment" || card.type === "equipment");
}

/**
 * Check if a BoardCard is a creature
 */
export function isBoardCreature(
  card: BoardCard | null | undefined
): card is BoardCard & { cardType: "creature" } {
  return card != null && card.cardType === "creature";
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
 * Check if a card is a MonsterCard (legacy format from normalization)
 */
export function isMonsterCard(card: unknown): card is MonsterCard {
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
    (c.type === "creature" || c.type === "spell" || c.type === "trap" || c.type === "equipment")
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
export function isMainPhase(phase: string | undefined): phase is "main1" | "main2" {
  return phase === "main1" || phase === "main2";
}

/**
 * Check if a game state phase is battle phase
 */
export function isBattlePhase(phase: string | undefined): phase is "battle" {
  return phase === "battle";
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
  return isBattlePhase(phase);
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
export function isFaceDown(card: BoardCard | MonsterCard | null | undefined): boolean {
  if (card == null) return false;
  if ("isFaceDown" in card) return card.isFaceDown;
  if ("position" in card && card.position === "facedown") return true;
  if ("faceUp" in card) return card.faceUp === false;
  return false;
}
