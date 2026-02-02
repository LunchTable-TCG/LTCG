/**
 * Timeout System
 *
 * Manages competitive timeout enforcement for matches:
 * - Per-action timeout (default 180 seconds / 3 minutes)
 * - Total match timeout (default 1800 seconds / 30 minutes)
 * - Auto-pass on action timeout
 * - Timeout occurrence tracking
 *
 * Timeout Flow:
 * 1. Match timer starts when game begins (initializeMatchTimer)
 * 2. Action timer starts when response window opens (startActionTimeout)
 * 3. On timeout, auto-pass is triggered if enabled (handleTimeout)
 * 4. All timeouts are tracked for analytics (recordTimeout)
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { logger } from "../lib/debug";

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export interface TimeoutConfig {
  /** Milliseconds allowed per action (default: 180000 = 3 minutes) */
  perActionMs: number;
  /** Milliseconds allowed for total match (default: 1800000 = 30 minutes) */
  totalMatchMs: number;
  /** Whether to auto-pass when action times out */
  autoPassOnTimeout: boolean;
  /** Milliseconds before timeout to show warning (default: 30000 = 30 seconds) */
  warningAtMs: number;
}

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  perActionMs: 180000, // 3 minutes per action
  totalMatchMs: 1800000, // 30 minutes total
  autoPassOnTimeout: true,
  warningAtMs: 30000, // 30 second warning
};

export interface TimeoutStatus {
  /** Whether the current action has timed out */
  timedOut: boolean;
  /** Milliseconds remaining for current action */
  timeRemainingMs: number;
  /** Whether warning threshold has been reached */
  warning: boolean;
  /** Milliseconds remaining for entire match */
  matchTimeRemainingMs: number;
  /** Whether match time has expired */
  matchTimedOut: boolean;
}

export interface TimeoutOccurrence {
  playerId: Id<"users">;
  occurredAt: number;
  action: string;
  timeRemainingMs: number;
}

// ============================================================================
// TIMEOUT STATUS CHECKING
// ============================================================================

/**
 * Check if current action has timed out
 *
 * Returns timeout status including:
 * - Whether action/match is timed out
 * - Time remaining for action and match
 * - Whether warning threshold reached
 */
export function checkActionTimeout(
  gameState: Doc<"gameStates">,
  config?: TimeoutConfig
): TimeoutStatus {
  const timeoutConfig = config || gameState.timeoutConfig || DEFAULT_TIMEOUT_CONFIG;
  const now = Date.now();

  // Check action timeout from response window
  const responseWindow = gameState.responseWindow;
  let actionTimeRemaining = timeoutConfig.perActionMs;
  let actionTimedOut = false;
  let warning = false;

  if (responseWindow?.expiresAt) {
    actionTimeRemaining = Math.max(0, responseWindow.expiresAt - now);
    actionTimedOut = actionTimeRemaining === 0;
    warning = actionTimeRemaining > 0 && actionTimeRemaining <= timeoutConfig.warningAtMs;
  }

  // Check match timeout
  let matchTimeRemaining = timeoutConfig.totalMatchMs;
  let matchTimedOut = false;

  if (gameState.matchTimerStart) {
    const elapsed = now - gameState.matchTimerStart;
    matchTimeRemaining = Math.max(0, timeoutConfig.totalMatchMs - elapsed);
    matchTimedOut = matchTimeRemaining === 0;
  }

  return {
    timedOut: actionTimedOut || matchTimedOut,
    timeRemainingMs: actionTimeRemaining,
    warning,
    matchTimeRemainingMs: matchTimeRemaining,
    matchTimedOut,
  };
}

/**
 * Get time remaining formatted as M:SS
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// ============================================================================
// TIMEOUT MANAGEMENT
// ============================================================================

/**
 * Initialize match timer when game starts
 *
 * Called at the beginning of a match to start the overall match timer.
 * Optionally accepts custom timeout configuration.
 */
export async function initializeMatchTimer(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  config?: Partial<TimeoutConfig>
) {
  const fullConfig = { ...DEFAULT_TIMEOUT_CONFIG, ...config };

  await ctx.db.patch(gameState._id, {
    matchTimerStart: Date.now(),
    timeoutConfig: fullConfig,
    timeoutsUsed: [],
  });

  logger.debug("Match timer initialized", {
    totalMatchMs: fullConfig.totalMatchMs,
    perActionMs: fullConfig.perActionMs,
  });
}

/**
 * Start timeout timer for an action
 *
 * Called when a response window opens to set the expiration time.
 * Returns the expiration timestamp for client-side countdown.
 */
export async function startActionTimeout(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  actionType: string
): Promise<{ expiresAt: number }> {
  const config = gameState.timeoutConfig || DEFAULT_TIMEOUT_CONFIG;
  const expiresAt = Date.now() + config.perActionMs;

  // Update response window with timeout if it exists
  if (gameState.responseWindow) {
    await ctx.db.patch(gameState._id, {
      responseWindow: {
        ...gameState.responseWindow,
        expiresAt,
      },
      turnTimerStart: Date.now(),
    });

    logger.debug("Action timeout started", {
      actionType,
      expiresAt,
      timeoutMs: config.perActionMs,
    });
  }

  return { expiresAt };
}

/**
 * Record a timeout occurrence
 *
 * Tracks when a player times out for analytics and potential penalties.
 */
export async function recordTimeout(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  actionType: string,
  timeRemainingMs: number
) {
  const timeoutsUsed = gameState.timeoutsUsed || [];

  const newTimeout: TimeoutOccurrence = {
    playerId,
    occurredAt: Date.now(),
    action: actionType,
    timeRemainingMs,
  };

  await ctx.db.patch(gameState._id, {
    timeoutsUsed: [...timeoutsUsed, newTimeout],
  });

  logger.debug("Timeout recorded", {
    playerId,
    actionType,
    totalTimeouts: timeoutsUsed.length + 1,
  });
}

/**
 * Handle timeout - auto-pass if enabled
 *
 * Called when an action timeout is detected.
 * Records the timeout and triggers auto-pass if configured.
 *
 * Returns whether auto-pass was executed.
 */
export async function handleTimeout(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  timedOutPlayerId: Id<"users">
): Promise<{ autoPassed: boolean; matchEnded: boolean }> {
  const config = gameState.timeoutConfig || DEFAULT_TIMEOUT_CONFIG;

  // Record the timeout occurrence
  await recordTimeout(ctx, gameState, timedOutPlayerId, "action_timeout", 0);

  // Check if match time has expired
  const status = checkActionTimeout(gameState, config);
  if (status.matchTimedOut) {
    logger.debug("Match timeout - game should end", {
      playerId: timedOutPlayerId,
    });
    return { autoPassed: false, matchEnded: true };
  }

  // Auto-pass if enabled
  if (config.autoPassOnTimeout) {
    // Import passResponsePriority dynamically to avoid circular deps
    const { passResponsePriority } = await import("./responseWindow");

    // Refresh game state to get latest
    const refreshedState = await ctx.db.get(gameState._id);
    if (refreshedState) {
      await passResponsePriority(ctx, lobbyId, refreshedState, timedOutPlayerId);
    }

    logger.debug("Auto-pass executed due to timeout", {
      playerId: timedOutPlayerId,
    });

    return { autoPassed: true, matchEnded: false };
  }

  return { autoPassed: false, matchEnded: false };
}

/**
 * Clear action timeout (when action is taken)
 *
 * Called when a player takes an action before timeout.
 * Resets the turn timer start for the next action.
 */
export async function clearActionTimeout(ctx: MutationCtx, gameState: Doc<"gameStates">) {
  if (gameState.responseWindow?.expiresAt) {
    await ctx.db.patch(gameState._id, {
      responseWindow: {
        ...gameState.responseWindow,
        expiresAt: undefined,
      },
      turnTimerStart: undefined,
    });

    logger.debug("Action timeout cleared");
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get timeout config from game state or use defaults
 */
export function getTimeoutConfig(gameState: Doc<"gameStates">): TimeoutConfig {
  return gameState.timeoutConfig || DEFAULT_TIMEOUT_CONFIG;
}

/**
 * Check if timeout system is active for this game
 */
export function isTimeoutActive(gameState: Doc<"gameStates">): boolean {
  return gameState.matchTimerStart !== undefined;
}

/**
 * Get count of timeouts for a specific player
 */
export function getPlayerTimeoutCount(gameState: Doc<"gameStates">, playerId: Id<"users">): number {
  const timeouts = gameState.timeoutsUsed || [];
  return timeouts.filter((t) => t.playerId === playerId).length;
}

/**
 * Check if player has exceeded timeout threshold
 *
 * Can be used to implement timeout penalties (e.g., auto-forfeit after 3 timeouts)
 */
export function hasExceededTimeoutThreshold(
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  threshold = 3
): boolean {
  return getPlayerTimeoutCount(gameState, playerId) >= threshold;
}
