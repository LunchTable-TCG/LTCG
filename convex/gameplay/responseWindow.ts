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
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { logger } from "../lib/debug";
import { resolveChainHelper } from "./chainResolver";

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
 */
export async function openResponseWindow(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  windowType: ResponseWindowType,
  triggerPlayerId: Id<"users">,
  timeoutMs?: number
) {
  const opponentId = triggerPlayerId === gameState.hostId ? gameState.opponentId : gameState.hostId;

  const responseWindow: ResponseWindowState = {
    type: windowType,
    triggerPlayerId,
    activePlayerId: opponentId, // Opponent gets first response
    canRespond: true,
    chainOpen: false,
    passCount: 0,
    createdAt: Date.now(),
    expiresAt: timeoutMs ? Date.now() + timeoutMs : undefined,
  };

  await ctx.db.patch(gameState._id, {
    responseWindow,
    currentPriorityPlayer: opponentId,
  });

  logger.debug("Response window opened", {
    type: windowType,
    triggerPlayer: triggerPlayerId,
    activePlayer: opponentId,
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
export async function closeResponseWindow(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">
) {
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

  return { resolved: false };
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
    if (lastLink && spellSpeed < lastLink.spellSpeed) {
      return {
        canActivate: false,
        reason: `Cannot chain Spell Speed ${spellSpeed} to Spell Speed ${lastLink.spellSpeed}`,
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
