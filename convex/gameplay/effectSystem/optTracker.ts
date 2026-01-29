/**
 * OPT/HOPT Effect Tracking System
 *
 * Manages Once Per Turn (OPT) and Hard Once Per Turn (HOPT) restrictions for card effects.
 *
 * Key Distinctions:
 * - OPT (Once Per Turn): Resets at the start of each turn for the turn player.
 *   Example: "Once per turn: Draw 1 card"
 *
 * - HOPT (Hard Once Per Turn): Resets at the start of the player's NEXT turn.
 *   This means the restriction persists through the opponent's turn.
 *   Example: "You can only use this effect of [Card Name] once per turn"
 *
 * Both track by card instance AND effect index, since a single card can have
 * multiple effects with different OPT/HOPT restrictions.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { logger } from "../../lib/debug";

/** OPT usage record stored in gameState */
export interface OPTRecord {
  cardId: Id<"cardDefinitions">;
  effectIndex: number;
  playerId: Id<"users">;
  turnUsed: number;
}

/** HOPT usage record stored in gameState */
export interface HOPTRecord {
  cardId: Id<"cardDefinitions">;
  effectIndex: number;
  playerId: Id<"users">;
  turnUsed: number;
  resetOnTurn: number;
}

/**
 * Check if a card effect can be activated based on OPT/HOPT restrictions
 *
 * @param gameState - Current game state
 * @param cardId - Card definition ID attempting to use the effect
 * @param effectIndex - Index of the effect on the card (0-indexed)
 * @param playerId - Player attempting to activate the effect
 * @param isHOPT - Whether this is a HOPT effect (vs standard OPT)
 * @returns Object with canActivate boolean and reason string
 */
export function checkCanActivateOPT(
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  effectIndex: number,
  playerId: Id<"users">,
  isHOPT: boolean
): { canActivate: boolean; reason?: string } {
  if (isHOPT) {
    return checkHOPT(gameState, cardId, effectIndex, playerId);
  }
  return checkOPT(gameState, cardId, effectIndex, playerId);
}

/**
 * Check standard OPT restriction
 *
 * OPT effects reset at the start of each turn for the turn player.
 * A player can use an OPT effect once during their turn, and it resets
 * when their next turn starts.
 */
function checkOPT(
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  effectIndex: number,
  playerId: Id<"users">
): { canActivate: boolean; reason?: string } {
  const optRecords = (gameState.optUsedThisTurn || []) as OPTRecord[];

  // Check if this specific effect has been used this turn by this player
  const usedRecord = optRecords.find(
    (record) =>
      record.cardId === cardId &&
      record.effectIndex === effectIndex &&
      record.playerId === playerId
  );

  if (usedRecord) {
    logger.debug("OPT check failed - effect already used this turn", {
      cardId,
      effectIndex,
      playerId,
      turnUsed: usedRecord.turnUsed,
    });
    return {
      canActivate: false,
      reason: "This effect can only be used once per turn",
    };
  }

  return { canActivate: true };
}

/**
 * Check HOPT restriction
 *
 * HOPT effects reset at the start of the player's NEXT turn.
 * This means:
 * - Player A uses HOPT effect on turn 3
 * - It remains restricted during Player B's turn (turn 4)
 * - It resets when Player A's turn starts again (turn 5)
 */
function checkHOPT(
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  effectIndex: number,
  playerId: Id<"users">
): { canActivate: boolean; reason?: string } {
  const hoptRecords = (gameState.hoptUsedEffects || []) as HOPTRecord[];

  // Check if this specific effect has been used and hasn't reset yet
  const usedRecord = hoptRecords.find(
    (record) =>
      record.cardId === cardId &&
      record.effectIndex === effectIndex &&
      record.playerId === playerId &&
      record.resetOnTurn > gameState.turnNumber
  );

  if (usedRecord) {
    logger.debug("HOPT check failed - effect not yet reset", {
      cardId,
      effectIndex,
      playerId,
      turnUsed: usedRecord.turnUsed,
      resetOnTurn: usedRecord.resetOnTurn,
      currentTurn: gameState.turnNumber,
    });
    return {
      canActivate: false,
      reason: "You can only use this effect of this card once per turn",
    };
  }

  return { canActivate: true };
}

/**
 * Mark an effect as used (OPT or HOPT)
 *
 * Records the effect usage for tracking purposes. For HOPT effects,
 * calculates the turn number when the restriction should reset.
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param cardId - Card definition ID
 * @param effectIndex - Index of the effect on the card (0-indexed)
 * @param playerId - Player who used the effect
 * @param isHOPT - Whether this is a HOPT effect
 */
export async function markEffectUsed(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  effectIndex: number,
  playerId: Id<"users">,
  isHOPT: boolean
): Promise<void> {
  if (isHOPT) {
    await markHOPTUsed(ctx, gameState, cardId, effectIndex, playerId);
  } else {
    await markOPTUsed(ctx, gameState, cardId, effectIndex, playerId);
  }
}

/**
 * Mark an OPT effect as used
 */
async function markOPTUsed(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  effectIndex: number,
  playerId: Id<"users">
): Promise<void> {
  const optRecords = (gameState.optUsedThisTurn || []) as OPTRecord[];

  // Check if already recorded (prevent duplicates)
  const alreadyRecorded = optRecords.some(
    (record) =>
      record.cardId === cardId &&
      record.effectIndex === effectIndex &&
      record.playerId === playerId
  );

  if (alreadyRecorded) {
    return;
  }

  const newRecord: OPTRecord = {
    cardId,
    effectIndex,
    playerId,
    turnUsed: gameState.turnNumber,
  };

  await ctx.db.patch(gameState._id, {
    optUsedThisTurn: [...optRecords, newRecord],
  });

  logger.debug("Marked OPT effect as used", {
    cardId,
    effectIndex,
    playerId,
    turnUsed: gameState.turnNumber,
  });
}

/**
 * Mark a HOPT effect as used
 *
 * Calculates the reset turn based on turn order:
 * - If it's the player's turn, reset on their next turn (current + 2)
 * - If it's opponent's turn, reset on their next turn (current + 1 for when their turn comes)
 */
async function markHOPTUsed(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  effectIndex: number,
  playerId: Id<"users">
): Promise<void> {
  const hoptRecords = (gameState.hoptUsedEffects || []) as HOPTRecord[];

  // Check if already recorded for current restriction period
  const alreadyRecorded = hoptRecords.some(
    (record) =>
      record.cardId === cardId &&
      record.effectIndex === effectIndex &&
      record.playerId === playerId &&
      record.resetOnTurn > gameState.turnNumber
  );

  if (alreadyRecorded) {
    return;
  }

  // Calculate when this HOPT should reset
  // HOPT resets at the start of the player's NEXT turn
  // Turn order: Host (1) -> Opponent (2) -> Host (3) -> Opponent (4) -> ...
  // Host turns: 1, 3, 5, 7... (odd)
  // Opponent turns: 2, 4, 6, 8... (even)
  const isPlayerHost = playerId === gameState.hostId;
  const currentTurn = gameState.turnNumber;

  let resetOnTurn: number;
  if (isPlayerHost) {
    // Host's turns are odd numbers (1, 3, 5...)
    // Find the next odd number after current turn
    if (currentTurn % 2 === 1) {
      // Currently host's turn, next host turn is +2
      resetOnTurn = currentTurn + 2;
    } else {
      // Currently opponent's turn, next host turn is +1
      resetOnTurn = currentTurn + 1;
    }
  } else {
    // Opponent's turns are even numbers (2, 4, 6...)
    // Find the next even number after current turn
    if (currentTurn % 2 === 0) {
      // Currently opponent's turn, next opponent turn is +2
      resetOnTurn = currentTurn + 2;
    } else {
      // Currently host's turn, next opponent turn is +1
      resetOnTurn = currentTurn + 1;
    }
  }

  const newRecord: HOPTRecord = {
    cardId,
    effectIndex,
    playerId,
    turnUsed: currentTurn,
    resetOnTurn,
  };

  await ctx.db.patch(gameState._id, {
    hoptUsedEffects: [...hoptRecords, newRecord],
  });

  logger.debug("Marked HOPT effect as used", {
    cardId,
    effectIndex,
    playerId,
    turnUsed: currentTurn,
    resetOnTurn,
  });
}

/**
 * Reset OPT effects at turn start
 *
 * Called at the start of a player's turn to:
 * 1. Clear OPT records for the turn player (their effects reset)
 * 2. Clean up expired HOPT records (those that have passed their reset turn)
 *
 * Note: OPT effects reset for the TURN PLAYER only, not for both players.
 * This matches Yu-Gi-Oh rules where "once per turn" means once during your turn.
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param turnPlayerId - The player whose turn is starting
 */
export async function resetOPTEffects(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  turnPlayerId: Id<"users">
): Promise<void> {
  const optRecords = (gameState.optUsedThisTurn || []) as OPTRecord[];
  const hoptRecords = (gameState.hoptUsedEffects || []) as HOPTRecord[];

  // Reset OPT for the turn player only
  // Other player's OPT effects remain restricted until their turn
  const newOptRecords = optRecords.filter(
    (record) => record.playerId !== turnPlayerId
  );

  // Clean up expired HOPT records
  // Keep records where resetOnTurn is still in the future
  const newHoptRecords = hoptRecords.filter(
    (record) => record.resetOnTurn > gameState.turnNumber
  );

  const optCleared = optRecords.length - newOptRecords.length;
  const hoptCleared = hoptRecords.length - newHoptRecords.length;

  if (optCleared > 0 || hoptCleared > 0) {
    logger.debug("Reset OPT/HOPT effects at turn start", {
      turnPlayerId,
      turnNumber: gameState.turnNumber,
      optCleared,
      hoptCleared,
      optRemaining: newOptRecords.length,
      hoptRemaining: newHoptRecords.length,
    });
  }

  await ctx.db.patch(gameState._id, {
    optUsedThisTurn: newOptRecords,
    hoptUsedEffects: newHoptRecords,
  });
}

/**
 * Legacy compatibility: Check if a card has used any OPT effect this turn
 *
 * This is for backward compatibility with the old simple OPT tracking.
 * Prefer using checkCanActivateOPT with specific effectIndex for new code.
 *
 * @param gameState - Current game state
 * @param cardId - Card definition ID to check
 * @returns True if any effect on this card has been used this turn
 */
export function hasUsedAnyOPT(
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">
): boolean {
  const optRecords = (gameState.optUsedThisTurn || []) as OPTRecord[];
  return optRecords.some((record) => record.cardId === cardId);
}

/**
 * Legacy compatibility: Mark the first effect (index 0) of a card as used
 *
 * For backward compatibility with code that doesn't specify effect index.
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param cardId - Card definition ID
 * @param playerId - Player who used the effect
 */
export async function markCardOPTUsed(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  playerId: Id<"users">
): Promise<void> {
  await markOPTUsed(ctx, gameState, cardId, 0, playerId);
}

/**
 * Clear all OPT/HOPT tracking (for game reset or testing)
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 */
export async function clearAllOPTTracking(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">
): Promise<void> {
  await ctx.db.patch(gameState._id, {
    optUsedThisTurn: [],
    hoptUsedEffects: [],
  });

  logger.debug("Cleared all OPT/HOPT tracking");
}
