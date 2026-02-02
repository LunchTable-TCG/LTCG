/**
 * Summon Validator
 *
 * Validates all types of monster summons in Yu-Gi-Oh:
 * - Normal Summon (1 per turn, with tribute requirements)
 * - Tribute Summon (Level 5-6 = 1 tribute, Level 7+ = 2 tributes)
 * - Flip Summon (face-down → face-up)
 * - Special Summon (Fusion, Ritual, Synchro, Xyz, Pendulum, Link)
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getTributeCount, canChangePosition } from "../lib/cardPropertyHelpers";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate Normal Summon
 *
 * Requirements:
 * - Player has not already normal summoned this turn
 * - Monster zone has space (max 5 monsters)
 * - Card is in player's hand
 * - Tribute requirements met:
 *   - Level 1-4: No tributes
 *   - Level 5-6: 1 tribute
 *   - Level 7+: 2 tributes
 */
export async function validateNormalSummon(
  ctx: QueryCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  cardId: Id<"cardDefinitions">,
  tributeCardIds?: Id<"cardDefinitions">[]
): Promise<ValidationResult> {
  const isHost = playerId === gameState.hostId;

  // 1. Check if player already normal summoned this turn
  const hasNormalSummoned = isHost
    ? gameState.hostNormalSummonedThisTurn
    : gameState.opponentNormalSummonedThisTurn;

  if (hasNormalSummoned) {
    return {
      valid: false,
      error:
        "You can only Normal Summon or Set once per turn. You've already used your Normal Summon this turn.",
    };
  }

  // 2. Check monster zone space (max 5 monsters)
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const MONSTER_ZONE_LIMIT = 5;

  if (board.length >= MONSTER_ZONE_LIMIT) {
    return {
      valid: false,
      error:
        "Your Monster Zone is full (maximum 5 monsters). Remove a monster from the field before summoning.",
    };
  }

  // 3. Check if card is in player's hand
  const hand = isHost ? gameState.hostHand : gameState.opponentHand;
  if (!hand.includes(cardId)) {
    return {
      valid: false,
      error: "This card is not in your hand. You can only summon monsters from your hand.",
    };
  }

  // 4. Get card details to check level
  const card = await ctx.db.get(cardId);
  if (!card) {
    return {
      valid: false,
      error: "Card not found in database. Please try again or contact support.",
    };
  }

  if (card.cardType !== "creature") {
    return {
      valid: false,
      error:
        "Only monster cards can be Normal Summoned. Use 'Set' or 'Activate' for Spell/Trap cards.",
    };
  }

  // 5. Validate tribute requirements based on level (uses new helper with fallback to cost)
  const tributesProvided = tributeCardIds?.length || 0;
  const requiredTributes = getTributeCount(card);

  if (tributesProvided < requiredTributes) {
    const cardName = card.name || "This monster";
    const tributeWord = requiredTributes === 1 ? "tribute" : "tributes";
    const hasWord = tributesProvided === 1 ? "has" : "have";

    return {
      valid: false,
      error: `${cardName} requires ${requiredTributes} ${tributeWord} to summon. You ${hasWord} only selected ${tributesProvided}. Select ${requiredTributes} monster${requiredTributes > 1 ? "s" : ""} from your field to tribute, then try again.`,
    };
  }

  if (tributesProvided > requiredTributes) {
    const cardName = card.name || "This monster";
    const tributeWord = requiredTributes === 1 ? "tribute" : "tributes";

    return {
      valid: false,
      error: `${cardName} only requires ${requiredTributes} ${tributeWord}, but you selected ${tributesProvided}. Please select exactly ${requiredTributes} monster${requiredTributes > 1 ? "s" : ""} to tribute.`,
    };
  }

  // 6. If tributes required, validate tribute cards
  if (requiredTributes > 0 && tributeCardIds) {
    for (const tributeId of tributeCardIds) {
      // Check if tribute card is on player's board
      const isOnBoard = board.some((boardCard) => boardCard.cardId === tributeId);
      if (!isOnBoard) {
        return {
          valid: false,
          error:
            "You can only tribute monsters that are on your field. The selected monster is not on your field.",
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate Special Summon
 *
 * Requirements:
 * - Monster zone has space (max 5 monsters)
 * - Card-specific summon conditions met (checked separately)
 * - For Extra Deck summons: validate materials and requirements
 *
 * Note: This is a simplified version - full implementation would need
 * card-specific summon condition logic.
 *
 * @param ctx - Query context
 * @param gameState - Current game state
 * @param playerId - Player attempting special summon
 * @param cardId - Card being special summoned
 * @param summonType - Type of special summon (fusion, ritual, synchro, xyz, pendulum, link)
 * @returns Validation result with error message if invalid
 * @example
 * await validateSpecialSummon(ctx, gameState, playerId, fusionMonster, "fusion")
 */
export async function validateSpecialSummon(
  ctx: QueryCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  cardId: Id<"cardDefinitions">,
  _summonType: "fusion" | "ritual" | "synchro" | "xyz" | "pendulum" | "link"
): Promise<ValidationResult> {
  const isHost = playerId === gameState.hostId;

  // 1. Check monster zone space (max 5 monsters)
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const MONSTER_ZONE_LIMIT = 5;

  if (board.length >= MONSTER_ZONE_LIMIT) {
    return {
      valid: false,
      error: "Monster Zone is full (max 5 monsters)",
    };
  }

  // 2. Get card details
  const card = await ctx.db.get(cardId);
  if (!card) {
    return {
      valid: false,
      error: "Card not found",
    };
  }

  if (card.cardType !== "creature") {
    return {
      valid: false,
      error: "Card is not a creature card",
    };
  }

  // 3. Validate summon type matches card type
  // Note: This would require additional card metadata to fully validate
  // For MVP, we'll allow any special summon with proper materials

  // 4. Check if card can be special summoned
  // (Some cards have restrictions like "Cannot be Special Summoned")
  // Note: This would require parsing card text, deferred to Phase 2

  return { valid: true };
}

/**
 * Validate Flip Summon
 *
 * Requirements:
 * - Card is face-down on player's field
 * - Card was not set this turn (must wait 1 turn before flipping)
 *
 * @param ctx - Query context
 * @param gameState - Current game state
 * @param playerId - Player attempting flip summon
 * @param cardId - Card being flipped face-up
 * @returns Validation result with error message if invalid
 * @example
 * await validateFlipSummon(ctx, gameState, playerId, faceDownMonster)
 */
export async function validateFlipSummon(
  _ctx: QueryCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  cardId: Id<"cardDefinitions">
): Promise<ValidationResult> {
  const isHost = playerId === gameState.hostId;
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

  // 1. Find card on board
  const boardCard = board.find((card) => card.cardId === cardId);
  if (!boardCard) {
    return {
      valid: false,
      error: "Card is not on your field",
    };
  }

  // 2. Check if card is face-down
  // Note: Current schema doesn't have isFaceDown field on board cards
  // This would need to be added to schema in future
  // For now, we'll assume position -1 = face-down defense
  if (boardCard.position >= 0) {
    return {
      valid: false,
      error: "Card is already face-up",
    };
  }

  // 3. Check if card was set this turn
  // Note: This would require tracking when cards were set
  // For MVP, we'll skip this check and allow immediate flip summons
  // This will be implemented when we add cardsSetThisTurn tracking

  return { valid: true };
}

/**
 * Validate Set Monster
 *
 * Requirements:
 * - Player has not already normal summoned/set this turn (shares limit)
 * - Monster zone has space (max 5 monsters)
 * - Card is in player's hand
 * - Tribute requirements met (same as Normal Summon for Level 5+)
 *
 * @param ctx - Query context
 * @param gameState - Current game state
 * @param playerId - Player attempting to set monster
 * @param cardId - Card being set face-down
 * @param tributeCardIds - Optional tribute cards (for Level 5+ monsters)
 * @returns Validation result with error message if invalid
 * @example
 * await validateSetMonster(ctx, gameState, playerId, monsterCard) // Level 4 or lower
 * await validateSetMonster(ctx, gameState, playerId, level5Card, [tributeId]) // Level 5-6
 */
export async function validateSetMonster(
  ctx: QueryCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  cardId: Id<"cardDefinitions">,
  tributeCardIds?: Id<"cardDefinitions">[]
): Promise<ValidationResult> {
  // Setting a monster uses the same validation as Normal Summon
  // (both count as the 1 Normal Summon per turn)
  return validateNormalSummon(ctx, gameState, playerId, cardId, tributeCardIds);
}

/**
 * Validate Position Change
 *
 * Requirements:
 * - Card is on player's field
 * - Card is face-up
 * - Not in Battle Phase
 * - Card has not changed position this turn (would need tracking)
 *
 * @param ctx - Query context
 * @param gameState - Current game state
 * @param playerId - Player attempting position change
 * @param cardId - Card being switched (attack ↔ defense)
 * @returns Validation result with error message if invalid
 * @example
 * await validatePositionChange(ctx, gameState, playerId, attackPositionMonster)
 * // Switches attack → defense or defense → attack
 */
export async function validatePositionChange(
  _ctx: QueryCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  cardId: Id<"cardDefinitions">
): Promise<ValidationResult> {
  const isHost = playerId === gameState.hostId;
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

  // 1. Find card on board
  const boardCard = board.find((card) => card.cardId === cardId);
  if (!boardCard) {
    return {
      valid: false,
      error: "Card is not on your field",
    };
  }

  // 2. Check if card is face-up
  if (boardCard.isFaceDown) {
    return {
      valid: false,
      error: "Cannot change position of face-down monster. Use Flip Summon instead.",
    };
  }

  // 3. Check current phase (cannot change position in Battle Phase)
  const currentPhase = gameState.currentPhase;
  if (
    currentPhase === "battle_start" ||
    currentPhase === "battle" ||
    currentPhase === "battle_end"
  ) {
    return {
      valid: false,
      error: "Cannot change position during Battle Phase",
    };
  }

  // 4. Check if card can change position this turn (summoned this turn or already changed)
  const currentTurn = gameState.turnNumber;
  if (!canChangePosition(boardCard, currentTurn)) {
    // Determine the specific reason
    if (boardCard.turnSummoned === currentTurn) {
      return {
        valid: false,
        error: "Cannot change position of a monster the same turn it was summoned.",
      };
    }
    if (boardCard.hasChangedPosition) {
      return {
        valid: false,
        error: "This monster has already changed position this turn.",
      };
    }
  }

  return { valid: true };
}
