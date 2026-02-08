/**
 * Response Window Handler
 *
 * Manages the response window system for chain timing.
 * Controls when players can activate effects or respond to actions.
 *
 * Response Window Flow:
 * 1. Action occurs (summon, attack, spell/trap activation)
 * 2. Response window opens for opponent
 * 3. Opponent can:
 *    a) Respond with a fast effect (trap, quick spell, quick monster effect)
 *    b) Pass priority
 * 4. If opponent responds, turn player gets priority to respond
 * 5. When both players pass consecutively, window closes and action resolves
 *    (or chain resolves if one was built)
 *
 * Timeout Integration:
 * - Response windows automatically start action timeout if timeout system is active
 * - Timeout status can be checked via getTimeoutStatus()
 * - On timeout, auto-pass is triggered if configured
 */

import * as generatedApi from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import type { MutationCtx } from "../_generated/server";
import { logger } from "../lib/debug";
import { resolveChainHelper } from "./chainResolver";
import { checkReplayCondition } from "./replaySystem";
import { type TimeoutStatus, checkActionTimeout, isTimeoutActive } from "./timeoutSystem";

// Re-export timeout types and helpers for convenience
export {
  type TimeoutConfig,
  type TimeoutStatus,
  DEFAULT_TIMEOUT_CONFIG,
  formatTimeRemaining,
} from "./timeoutSystem";

export type ResponseWindowType =
  | "summon"
  | "attack_declaration"
  | "spell_activation"
  | "trap_activation"
  | "effect_activation"
  | "damage_calculation"
  | "end_phase"
  | "open";

export interface ResponseWindowState {
  type: ResponseWindowType;
  triggerPlayerId: Id<"users">;
  activePlayerId: Id<"users">;
  canRespond: boolean;
  chainOpen: boolean;
  passCount: number;
  createdAt: number;
  expiresAt?: number;
}

/**
 * Open a response window for an action
 *
 * Called after:
 * - Monster summon (normal, special, flip)
 * - Attack declaration
 * - Spell/trap activation
 * - Effect activation
 *
 * If timeout system is active, automatically starts the action timeout.
 * Custom timeoutMs can override the configured per-action timeout.
 */
export async function openResponseWindow(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  windowType: ResponseWindowType,
  triggerPlayerId: Id<"users">,
  timeoutMs?: number
) {
  // Guard: don't overwrite an existing response window
  if (gameState.responseWindow) {
    logger.warn("Response window already open, skipping", {
      existingType: gameState.responseWindow.type,
      requestedType: windowType,
    });
    return;
  }

  const opponentId = triggerPlayerId === gameState.hostId ? gameState.opponentId : gameState.hostId;

  // Calculate expiration time
  // Priority: explicit timeoutMs > configured perActionMs > undefined (no timeout)
  let expiresAt: number | undefined;
  if (timeoutMs !== undefined) {
    expiresAt = Date.now() + timeoutMs;
  } else if (isTimeoutActive(gameState) && gameState.timeoutConfig) {
    expiresAt = Date.now() + gameState.timeoutConfig.perActionMs;
  }

  const responseWindow: ResponseWindowState = {
    type: windowType,
    triggerPlayerId,
    activePlayerId: opponentId, // Opponent gets first response
    canRespond: true,
    chainOpen: false,
    passCount: 0,
    createdAt: Date.now(),
    expiresAt,
  };

  await ctx.db.patch(gameState._id, {
    responseWindow,
    currentPriorityPlayer: opponentId,
    turnTimerStart: expiresAt ? Date.now() : undefined,
  });

  logger.debug("Response window opened", {
    type: windowType,
    triggerPlayer: triggerPlayerId,
    activePlayer: opponentId,
    expiresAt,
  });

  // Schedule AI chain response if opponent is AI (story mode)
  const lobby = await ctx.db.get(gameState.lobbyId);
  if (lobby?.mode === "story" && opponentId === gameState.opponentId && lobby.gameId) {
    await ctx.scheduler.runAfter(200, internalAny.gameplay.ai.aiTurn.executeAIChainResponse, {
      gameId: lobby.gameId,
    });
  }
}

/**
 * Close the response window
 *
 * Called when:
 * - Both players pass consecutively
 * - Response window times out
 * - Chain resolves
 */
export async function closeResponseWindow(ctx: MutationCtx, gameState: Doc<"gameStates">) {
  await ctx.db.patch(gameState._id, {
    responseWindow: undefined,
    currentPriorityPlayer: undefined,
  });

  logger.debug("Response window closed");
}

/**
 * Pass priority in the response window
 *
 * Returns:
 * - { resolved: false } if opponent now has priority
 * - { resolved: true } if both players passed (window closes)
 */
export async function passResponsePriority(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">
): Promise<{
  resolved: boolean;
  chainResolved?: boolean;
  battleTransition?: "replay" | "damage_step" | "execute_damage";
}> {
  const window = gameState.responseWindow;

  if (!window) {
    logger.warn("No response window to pass priority in");
    return { resolved: true };
  }

  // Verify it's this player's turn to act
  if (window.activePlayerId !== playerId) {
    logger.warn("Player does not have priority", {
      expected: window.activePlayerId,
      actual: playerId,
    });
    return { resolved: false };
  }

  const newPassCount = window.passCount + 1;

  // If both players have passed consecutively, resolve
  if (newPassCount >= 2) {
    // Check if there's a chain to resolve
    const chain = gameState.currentChain || [];

    if (chain.length > 0) {
      // Resolve the chain
      await resolveChainHelper(ctx, { lobbyId });
    }

    // Refresh state after potential chain resolution
    const refreshedState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .first();

    if (!refreshedState) {
      return { resolved: true, chainResolved: chain.length > 0 };
    }

    const windowType = window.type;

    // === BATTLE STEP TRANSITIONS ===

    if (windowType === "attack_declaration") {
      // Close attack_declaration window
      await closeResponseWindow(ctx, refreshedState);

      // Check replay condition (monster count changed during response?)
      const replayNeeded = await checkReplayCondition(ctx, lobbyId, refreshedState);

      if (replayNeeded) {
        // pendingReplay is set by checkReplayCondition — frontend/agent handles choice
        logger.debug("Battle replay triggered after attack declaration");
        return { resolved: true, chainResolved: chain.length > 0, battleTransition: "replay" };
      }

      // No replay → open damage_calculation window
      const stateForDamage = await ctx.db.get(refreshedState._id);
      if (stateForDamage) {
        await openResponseWindow(ctx, stateForDamage, "damage_calculation", window.triggerPlayerId);
      }

      logger.debug("Transitioning from attack_declaration to damage_calculation");
      return { resolved: true, chainResolved: chain.length > 0, battleTransition: "damage_step" };
    }

    if (windowType === "damage_calculation") {
      // Close damage_calculation window
      await closeResponseWindow(ctx, refreshedState);

      // Signal to caller to execute the actual damage step
      // (executeDamageStep lives in combatSystem.ts — called by the mutation to avoid circular deps)
      logger.debug("Damage calculation window closed, ready for battle resolution");
      return {
        resolved: true,
        chainResolved: chain.length > 0,
        battleTransition: "execute_damage",
      };
    }

    // Non-battle window — existing behavior
    await closeResponseWindow(ctx, refreshedState);
    return { resolved: true, chainResolved: chain.length > 0 };
  }

  // Pass priority to opponent
  const opponentId = playerId === gameState.hostId ? gameState.opponentId : gameState.hostId;

  await ctx.db.patch(gameState._id, {
    responseWindow: {
      ...window,
      activePlayerId: opponentId,
      passCount: newPassCount,
    },
    currentPriorityPlayer: opponentId,
  });

  logger.debug("Priority passed", {
    from: playerId,
    to: opponentId,
    passCount: newPassCount,
  });

  // Track priority history
  await trackPriorityAction(ctx, gameState, playerId, "passed");

  // Schedule AI chain response if new priority player is AI (story mode)
  const lobby = await ctx.db.get(lobbyId);
  if (lobby?.mode === "story" && opponentId === gameState.opponentId && lobby.gameId) {
    await ctx.scheduler.runAfter(200, internalAny.gameplay.ai.aiTurn.executeAIChainResponse, {
      gameId: lobby.gameId,
    });
  }

  return { resolved: false };
}

/**
 * Reset priority after a chain link resolves
 * Turn player gets priority first to respond or pass
 */
export async function resetPriorityAfterChainLink(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  turnPlayerId: Id<"users">
) {
  const window = gameState.responseWindow;
  if (!window) return;

  // Turn player gets priority first after each chain link
  await ctx.db.patch(gameState._id, {
    responseWindow: {
      ...window,
      activePlayerId: turnPlayerId,
      passCount: 0, // Reset pass count for new response opportunity
    },
    currentPriorityPlayer: turnPlayerId,
  });

  logger.debug("Priority reset after chain link", {
    activePlayer: turnPlayerId,
    passCount: 0,
  });
}

/**
 * Track priority action in history for debugging/replays
 * Keeps last 50 entries to avoid unbounded growth
 */
async function trackPriorityAction(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  action: string
) {
  const history = gameState.priorityHistory || [];
  const chainLength = (gameState.currentChain || []).length;

  await ctx.db.patch(gameState._id, {
    priorityHistory: [
      ...history.slice(-49), // Keep last 49 + new entry = 50
      {
        playerId,
        action,
        timestamp: Date.now(),
        chainLength,
      },
    ],
  });
}

/**
 * Respond to a response window by activating an effect
 *
 * Resets pass count and opens chain if not already open
 */
export async function respondInWindow(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">
) {
  const window = gameState.responseWindow;

  if (!window) {
    logger.warn("No response window to respond in");
    return;
  }

  // Verify it's this player's turn to act
  if (window.activePlayerId !== playerId) {
    logger.warn("Player does not have priority to respond", {
      expected: window.activePlayerId,
      actual: playerId,
    });
    return;
  }

  const opponentId = playerId === gameState.hostId ? gameState.opponentId : gameState.hostId;

  // Reset pass count and give priority to opponent
  await ctx.db.patch(gameState._id, {
    responseWindow: {
      ...window,
      activePlayerId: opponentId,
      chainOpen: true,
      passCount: 0,
    },
    currentPriorityPlayer: opponentId,
  });

  logger.debug("Response made", {
    by: playerId,
    priorityTo: opponentId,
    chainOpen: true,
  });

  // Track priority history for the response
  await trackPriorityAction(ctx, gameState, playerId, "responded");
}

// ============================================================================
// TIMEOUT INTEGRATION
// ============================================================================

/**
 * Get timeout status for the current response window
 *
 * Returns detailed timeout information including:
 * - Whether action/match has timed out
 * - Time remaining for action and match
 * - Whether warning threshold has been reached
 */
export function getTimeoutStatus(gameState: Doc<"gameStates">): TimeoutStatus | null {
  // Only return timeout status if timeout system is active
  if (!isTimeoutActive(gameState)) {
    return null;
  }

  return checkActionTimeout(gameState);
}
