/**
 * Battle Replay System
 *
 * Implements Yu-Gi-Oh's battle replay mechanic:
 * - Replay occurs when the number of monsters on the opponent's field changes
 *   after attack declaration but before damage calculation
 * - The attacking player can:
 *   1. Choose a new attack target
 *   2. Attack directly (if field is now empty)
 *   3. Cancel the attack entirely
 * - Replay does NOT occur if the attacking monster itself is removed
 *
 * Flow:
 * 1. Attack declared -> pendingAction set with target info
 * 2. Response window opens for opponent
 * 3. If opponent's monster count changes (e.g., monster destroyed by effect):
 *    - Check if attacker still exists
 *    - If attacker exists, trigger replay
 *    - Set pendingReplay state
 * 4. Attacker receives replay prompt
 * 5. Attacker responds with new target, direct attack, or cancel
 * 6. Battle continues or attack is cancelled
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { logger } from "../lib/debug";
import { recordEventHelper } from "./gameEvents";

// ============================================================================
// TYPES
// ============================================================================

export interface ReplayState {
  attackerId: Id<"cardDefinitions">;
  attackerOwnerId: Id<"users">;
  originalTargetId?: Id<"cardDefinitions">;
  originalMonsterCount: number;
  currentMonsterCount: number;
  triggeredAt: number;
  availableTargets: Id<"cardDefinitions">[];
  canAttackDirectly: boolean;
}

export type ReplayChoice =
  | { type: "new_target"; targetId: Id<"cardDefinitions"> }
  | { type: "direct_attack" }
  | { type: "cancel" };

// ============================================================================
// REPLAY DETECTION
// ============================================================================

/**
 * Check if replay should be triggered after field state changes
 *
 * Called after any action that might change the opponent's monster count
 * (e.g., effect resolution, chain resolution).
 *
 * Replay is triggered when:
 * 1. There's a pending attack action
 * 2. The attacker still exists on the field
 * 3. The opponent's monster count has changed from when the attack was declared
 *
 * @returns true if replay was triggered and pendingReplay was set
 */
export async function checkReplayCondition(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">
): Promise<boolean> {
  const pendingAction = gameState.pendingAction;

  // Only check for replay during pending attack actions
  if (!pendingAction || pendingAction.type !== "attack" || !pendingAction.attackerId) {
    return false;
  }

  const attackerId = pendingAction.attackerId;
  const originalTargetId = pendingAction.targetId;
  const originalMonsterCount = pendingAction.originalMonsterCount;
  const isHostAttacking = gameState.currentTurnPlayerId === gameState.hostId;

  // Get boards
  const attackerBoard = isHostAttacking ? gameState.hostBoard : gameState.opponentBoard;
  const opponentBoard = isHostAttacking ? gameState.opponentBoard : gameState.hostBoard;

  // Check if attacker still exists on the field
  const attackerStillExists = attackerBoard.some((bc) => bc.cardId === attackerId);

  if (!attackerStillExists) {
    // Attacker was removed - no replay, clear pending action
    logger.debug("Attacker removed from field, no replay triggered", { attackerId });
    await ctx.db.patch(gameState._id, {
      pendingAction: undefined,
    });
    return false;
  }

  const currentMonsterCount = opponentBoard.length;

  // If we have the original count stored, use that for comparison
  if (originalMonsterCount !== undefined && currentMonsterCount !== originalMonsterCount) {
    return await triggerReplay(
      ctx,
      lobbyId,
      gameState,
      attackerId,
      gameState.currentTurnPlayerId,
      originalTargetId,
      opponentBoard,
      originalMonsterCount,
      currentMonsterCount
    );
  }

  // Fallback: Check if target was removed (for backwards compatibility)
  if (originalTargetId) {
    const targetStillExists = opponentBoard.some((bc) => bc.cardId === originalTargetId);

    if (!targetStillExists) {
      // Target was removed - trigger replay
      return await triggerReplay(
        ctx,
        lobbyId,
        gameState,
        attackerId,
        gameState.currentTurnPlayerId,
        originalTargetId,
        opponentBoard
      );
    }
  }

  // No replay needed
  return false;
}

/**
 * Check for replay based on monster count change
 *
 * This is called with the original monster count that was saved at attack declaration.
 */
export async function checkReplayByMonsterCount(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  originalMonsterCount: number
): Promise<boolean> {
  const pendingAction = gameState.pendingAction;

  if (!pendingAction || pendingAction.type !== "attack" || !pendingAction.attackerId) {
    return false;
  }

  const isHostAttacking = gameState.currentTurnPlayerId === gameState.hostId;
  const attackerBoard = isHostAttacking ? gameState.hostBoard : gameState.opponentBoard;
  const opponentBoard = isHostAttacking ? gameState.opponentBoard : gameState.hostBoard;

  // Check attacker still exists
  const attackerStillExists = attackerBoard.some((bc) => bc.cardId === pendingAction.attackerId);
  if (!attackerStillExists) {
    await ctx.db.patch(gameState._id, { pendingAction: undefined });
    return false;
  }

  const currentMonsterCount = opponentBoard.length;

  // Replay triggers when monster count CHANGES (not just decreases)
  if (currentMonsterCount !== originalMonsterCount) {
    return await triggerReplay(
      ctx,
      lobbyId,
      gameState,
      pendingAction.attackerId,
      gameState.currentTurnPlayerId,
      pendingAction.targetId,
      opponentBoard,
      originalMonsterCount,
      currentMonsterCount
    );
  }

  return false;
}

/**
 * Trigger the replay state
 */
async function triggerReplay(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  attackerId: Id<"cardDefinitions">,
  attackerOwnerId: Id<"users">,
  originalTargetId: Id<"cardDefinitions"> | undefined,
  opponentBoard: Doc<"gameStates">["hostBoard"],
  originalCount?: number,
  currentCount?: number
): Promise<boolean> {
  // Get available targets (all monsters on opponent's field)
  const availableTargets = opponentBoard.map((bc) => bc.cardId);
  const canAttackDirectly = opponentBoard.length === 0;

  const replayState: ReplayState = {
    attackerId,
    attackerOwnerId,
    originalTargetId,
    originalMonsterCount: originalCount ?? (originalTargetId ? 1 : 0),
    currentMonsterCount: currentCount ?? opponentBoard.length,
    triggeredAt: Date.now(),
    availableTargets,
    canAttackDirectly,
  };

  // Get attacker card info for event
  const attackerCard = await ctx.db.get(attackerId);
  const attackerUser = await ctx.db.get(attackerOwnerId);

  // Get lobby for event recording
  const lobby = await ctx.db.get(lobbyId);

  await ctx.db.patch(gameState._id, {
    pendingReplay: replayState,
    pendingAction: undefined, // Clear pending action, replay takes over
  });

  // Record replay triggered event
  if (lobby?.gameId && lobby.turnNumber !== undefined) {
    await recordEventHelper(ctx, {
      lobbyId,
      gameId: lobby.gameId,
      turnNumber: lobby.turnNumber,
      eventType: "replay_triggered",
      playerId: attackerOwnerId,
      playerUsername: attackerUser?.username || "Unknown",
      description: `Battle replay triggered for ${attackerCard?.name || "monster"}`,
      metadata: {
        attackerId,
        attackerName: attackerCard?.name,
        originalTargetId,
        availableTargets: availableTargets.length,
        canAttackDirectly,
        originalMonsterCount: replayState.originalMonsterCount,
        currentMonsterCount: replayState.currentMonsterCount,
      },
    });
  }

  logger.info("Battle replay triggered", {
    attackerId,
    originalTargetId,
    availableTargets: availableTargets.length,
    canAttackDirectly,
  });

  return true;
}

// ============================================================================
// REPLAY STATE QUERIES
// ============================================================================

/**
 * Check if there's a pending replay for a player
 */
export function hasPendingReplay(
  gameState: Doc<"gameStates">,
  playerId: Id<"users">
): boolean {
  return (
    gameState.pendingReplay !== undefined &&
    gameState.pendingReplay.attackerOwnerId === playerId
  );
}

/**
 * Get pending replay state
 */
export function getPendingReplay(
  gameState: Doc<"gameStates">
): ReplayState | null {
  return gameState.pendingReplay || null;
}

/**
 * Validate a replay choice
 */
export function validateReplayChoice(
  replayState: ReplayState,
  choice: ReplayChoice
): { valid: boolean; reason?: string } {
  switch (choice.type) {
    case "new_target":
      if (!replayState.availableTargets.includes(choice.targetId)) {
        return { valid: false, reason: "Invalid target - not available for attack" };
      }
      return { valid: true };

    case "direct_attack":
      if (!replayState.canAttackDirectly) {
        return { valid: false, reason: "Cannot attack directly - opponent has monsters" };
      }
      return { valid: true };

    case "cancel":
      // Always valid to cancel
      return { valid: true };

    default:
      return { valid: false, reason: "Invalid replay choice type" };
  }
}

// ============================================================================
// REPLAY RESPONSE MUTATION
// ============================================================================

/**
 * Respond to a battle replay prompt
 *
 * The attacking player can:
 * 1. Choose a new attack target from available monsters
 * 2. Attack directly if opponent's field is empty
 * 3. Cancel the attack entirely
 */
export const respondToReplay = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    choice: v.union(
      v.object({
        type: v.literal("new_target"),
        targetId: v.id("cardDefinitions"),
      }),
      v.object({
        type: v.literal("direct_attack"),
      }),
      v.object({
        type: v.literal("cancel"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthMutation(ctx);

    // Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
    }

    // Check for pending replay
    const replayState = gameState.pendingReplay;
    if (!replayState) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "No pending replay to respond to",
      });
    }

    // Verify player is the attacker
    if (replayState.attackerOwnerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Only the attacking player can respond to replay",
      });
    }

    // Validate the choice
    const validation = validateReplayChoice(replayState, args.choice);
    if (!validation.valid) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: validation.reason,
      });
    }

    // Get attacker card info
    const attackerCard = await ctx.db.get(replayState.attackerId);

    // Handle the choice
    switch (args.choice.type) {
      case "new_target": {
        const targetCard = await ctx.db.get(args.choice.targetId);

        // Record event
        if (lobby.gameId && lobby.turnNumber !== undefined) {
          await recordEventHelper(ctx, {
            lobbyId: args.lobbyId,
            gameId: lobby.gameId,
            turnNumber: lobby.turnNumber,
            eventType: "replay_target_selected",
            playerId: user.userId,
            playerUsername: user.username,
            description: `${user.username} redirects attack to ${targetCard?.name || "monster"}`,
            metadata: {
              attackerId: replayState.attackerId,
              attackerName: attackerCard?.name,
              newTargetId: args.choice.targetId,
              newTargetName: targetCard?.name,
            },
          });
        }

        // Clear replay and set new pending action
        await ctx.db.patch(gameState._id, {
          pendingReplay: undefined,
          pendingAction: {
            type: "attack",
            attackerId: replayState.attackerId,
            targetId: args.choice.targetId,
          },
        });

        return {
          success: true,
          action: "new_target",
          targetId: args.choice.targetId,
          targetName: targetCard?.name,
          message: `Attack redirected to ${targetCard?.name || "new target"}`,
        };
      }

      case "direct_attack": {
        // Record event
        if (lobby.gameId && lobby.turnNumber !== undefined) {
          await recordEventHelper(ctx, {
            lobbyId: args.lobbyId,
            gameId: lobby.gameId,
            turnNumber: lobby.turnNumber,
            eventType: "replay_target_selected",
            playerId: user.userId,
            playerUsername: user.username,
            description: `${user.username} chooses to attack directly`,
            metadata: {
              attackerId: replayState.attackerId,
              attackerName: attackerCard?.name,
              directAttack: true,
            },
          });
        }

        // Clear replay and set pending direct attack
        await ctx.db.patch(gameState._id, {
          pendingReplay: undefined,
          pendingAction: {
            type: "attack",
            attackerId: replayState.attackerId,
            targetId: undefined, // Direct attack
          },
        });

        return {
          success: true,
          action: "direct_attack",
          message: `${attackerCard?.name || "Monster"} will attack directly`,
        };
      }

      case "cancel": {
        // Record event
        if (lobby.gameId && lobby.turnNumber !== undefined) {
          await recordEventHelper(ctx, {
            lobbyId: args.lobbyId,
            gameId: lobby.gameId,
            turnNumber: lobby.turnNumber,
            eventType: "replay_cancelled",
            playerId: user.userId,
            playerUsername: user.username,
            description: `${user.username} cancels the attack`,
            metadata: {
              attackerId: replayState.attackerId,
              attackerName: attackerCard?.name,
            },
          });
        }

        // Clear replay, no pending action
        await ctx.db.patch(gameState._id, {
          pendingReplay: undefined,
          pendingAction: undefined,
        });

        return {
          success: true,
          action: "cancelled",
          message: "Attack cancelled",
        };
      }
    }
  },
});

// ============================================================================
// HELPER FOR COMBAT SYSTEM INTEGRATION
// ============================================================================

/**
 * Store original monster count when attack is declared
 *
 * This should be called when declareAttack creates the pendingAction.
 * The count is used later to detect if replay should trigger.
 */
export function getOpponentMonsterCount(
  gameState: Doc<"gameStates">,
  attackingPlayerId: Id<"users">
): number {
  const isHostAttacking = attackingPlayerId === gameState.hostId;
  const opponentBoard = isHostAttacking ? gameState.opponentBoard : gameState.hostBoard;
  return opponentBoard.length;
}

/**
 * Clear pending replay state
 *
 * Called when:
 * - Battle resolves normally (no field changes)
 * - Game ends
 * - Turn ends
 */
export async function clearPendingReplay(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">
): Promise<void> {
  if (gameState.pendingReplay) {
    await ctx.db.patch(gameState._id, {
      pendingReplay: undefined,
    });
  }
}
