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

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { logger } from "../lib/debug";
import { ErrorCode, createError } from "../lib/errorCodes";
import { resolveChainHelper } from "./chainResolver";
import { type TimeoutStatus, checkActionTimeout, isTimeoutActive } from "./timeoutSystem";

// Re-export timeout types and helpers for convenience
export {
  type TimeoutConfig,
  type TimeoutStatus,
  DEFAULT_TIMEOUT_CONFIG,
  formatTimeRemaining,
  initializeMatchTimer,
  startActionTimeout,
  handleTimeout,
  clearActionTimeout,
  getTimeoutConfig,
  isTimeoutActive,
  getPlayerTimeoutCount,
  hasExceededTimeoutThreshold,
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
): Promise<{ resolved: boolean; chainResolved?: boolean }> {
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

      // Refresh state after chain resolution
      const refreshedState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
        .first();

      if (refreshedState) {
        // Close response window after chain resolves
        await closeResponseWindow(ctx, refreshedState);
      }

      return { resolved: true, chainResolved: true };
    }

    // No chain, just close window
    await closeResponseWindow(ctx, gameState);
    return { resolved: true };
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
 * Enhanced pass priority that properly handles chain resolution
 *
 * This version provides more detailed return information for complex scenarios:
 * - Whether the window is fully resolved
 * - Whether a chain will resolve (but window stays open for responses)
 * - Who the new active player is
 */
export async function passResponsePriorityEnhanced(
  ctx: MutationCtx,
  _lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  passPlayerId: Id<"users">
): Promise<{
  resolved: boolean;
  chainWillResolve: boolean;
  newActivePlayer?: Id<"users">;
}> {
  const window = gameState.responseWindow;
  if (!window) {
    return { resolved: true, chainWillResolve: false };
  }

  // Verify it's this player's turn to pass
  if (window.activePlayerId !== passPlayerId) {
    throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
      reason: "It's not your turn to pass priority",
      activePlayer: window.activePlayerId,
      attemptedPlayer: passPlayerId,
    });
  }

  const newPassCount = (window.passCount || 0) + 1;
  const chain = gameState.currentChain || [];

  // Track priority history
  await trackPriorityAction(ctx, gameState, passPlayerId, "passed");

  // Both players passed
  if (newPassCount >= 2) {
    if (chain.length > 0) {
      // Chain will resolve - but don't close window yet
      // Chain resolver will reset priority after each link
      return { resolved: false, chainWillResolve: true };
    }
    // No chain - close response window
    await ctx.db.patch(gameState._id, {
      responseWindow: undefined,
    });
    return { resolved: true, chainWillResolve: false };
  }

  // One player passed - give priority to other player
  const isHost = passPlayerId === gameState.hostId;
  const newActivePlayer = isHost ? gameState.opponentId : gameState.hostId;

  await ctx.db.patch(gameState._id, {
    responseWindow: {
      ...window,
      activePlayerId: newActivePlayer,
      passCount: newPassCount,
    },
    currentPriorityPlayer: newActivePlayer,
  });

  logger.debug("Enhanced priority passed", {
    from: passPlayerId,
    to: newActivePlayer,
    passCount: newPassCount,
    chainLength: chain.length,
  });

  return {
    resolved: false,
    chainWillResolve: false,
    newActivePlayer,
  };
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

/**
 * Check if a response window is open and active
 */
export function isResponseWindowActive(gameState: Doc<"gameStates">) {
  return !!gameState.responseWindow && gameState.responseWindow.canRespond;
}

/**
 * Get the current response window state
 */
export function getResponseWindow(gameState: Doc<"gameStates">): ResponseWindowState | null {
  return gameState.responseWindow || null;
}

/**
 * Check if a player can respond in the current window
 */
export function canPlayerRespond(gameState: Doc<"gameStates">, playerId: Id<"users">) {
  const window = gameState.responseWindow;

  if (!window || !window.canRespond) {
    return false;
  }

  return window.activePlayerId === playerId;
}

/**
 * Determine if an effect can be activated based on response window state
 *
 * Rules:
 * - Spell Speed 1 (normal spells, normal summons): Only during open window (no chain)
 * - Spell Speed 2 (quick spells, traps, quick effects): During any window or chain
 * - Spell Speed 3 (counter traps): During any window or chain, can respond to Speed 2+
 */
export function canActivateInWindow(
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  spellSpeed: 1 | 2 | 3
): { canActivate: boolean; reason?: string } {
  const window = gameState.responseWindow;
  const chain = gameState.currentChain || [];

  // No window = during main phase, can activate Speed 1
  if (!window) {
    if (spellSpeed === 1) {
      return { canActivate: true };
    }
    // Speed 2/3 can be activated during main phase too (to start a chain)
    return { canActivate: true };
  }

  // Check if player has priority
  if (window.activePlayerId !== playerId) {
    return {
      canActivate: false,
      reason: "You do not have priority",
    };
  }

  // Check spell speed compatibility with chain
  if (chain.length > 0) {
    const lastLink = chain[chain.length - 1];

    // Speed 3 exclusive rule: Only Speed 3 can respond to Speed 3
    if (lastLink && lastLink.spellSpeed === 3) {
      if (spellSpeed !== 3) {
        return {
          canActivate: false,
          reason: "Only Counter Traps (Speed 3) can respond to Counter Traps",
        };
      }
    }

    // Check if any Speed 3 exists in chain - locks out non-Speed 3
    const hasSpeed3InChain = chain.some((link) => link.spellSpeed === 3);
    if (hasSpeed3InChain && spellSpeed < 3) {
      return {
        canActivate: false,
        reason: "Cannot chain Speed < 3 after a Counter Trap has been activated",
      };
    }

    // Normal rule: Can't chain lower speed to higher
    if (lastLink && spellSpeed < lastLink.spellSpeed) {
      return {
        canActivate: false,
        reason: `Cannot chain Spell Speed ${spellSpeed} to Spell Speed ${lastLink.spellSpeed}`,
      };
    }
  }

  // Speed 3 can only respond to Speed 2+ effects (not Speed 1)
  if (spellSpeed === 3 && chain.length > 0) {
    const lastLink = chain[chain.length - 1];
    if (lastLink && lastLink.spellSpeed < 2) {
      return {
        canActivate: false,
        reason: "Counter Traps can only respond to Quick effects (Speed 2) or higher",
      };
    }
  }

  // Speed 1 effects can't be used during response windows (except open window with no chain)
  if (spellSpeed === 1 && window.chainOpen) {
    return {
      canActivate: false,
      reason: "Spell Speed 1 effects cannot be chained",
    };
  }

  // Speed 1 can only be used in certain windows
  if (spellSpeed === 1 && window.type !== "open") {
    return {
      canActivate: false,
      reason: "Spell Speed 1 effects can only be activated during open windows",
    };
  }

  return { canActivate: true };
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

/**
 * Refresh action timeout when priority changes
 *
 * Called when priority passes to a new player to reset their action timer.
 * This ensures each player gets the full action time for their response.
 */
export async function refreshActionTimeout(ctx: MutationCtx, gameState: Doc<"gameStates">) {
  // Only refresh if timeout system is active
  if (!isTimeoutActive(gameState) || !gameState.responseWindow) {
    return;
  }

  const config = gameState.timeoutConfig;
  if (!config) return;

  const newExpiresAt = Date.now() + config.perActionMs;

  await ctx.db.patch(gameState._id, {
    responseWindow: {
      ...gameState.responseWindow,
      expiresAt: newExpiresAt,
    },
    turnTimerStart: Date.now(),
  });

  logger.debug("Action timeout refreshed", {
    newExpiresAt,
    activePlayer: gameState.responseWindow.activePlayerId,
  });
}

/**
 * Check if response window has timed out
 *
 * Simple boolean check for whether the current action has exceeded its timeout.
 * Use getTimeoutStatus() for detailed information.
 */
export function hasResponseTimedOut(gameState: Doc<"gameStates">): boolean {
  const status = getTimeoutStatus(gameState);
  return status ? status.timedOut : false;
}

/**
 * Check if timeout warning should be shown
 *
 * Returns true if the action is within the warning threshold (e.g., 30 seconds remaining)
 * but hasn't timed out yet.
 */
export function shouldShowTimeoutWarning(gameState: Doc<"gameStates">): boolean {
  const status = getTimeoutStatus(gameState);
  return status ? status.warning : false;
}
