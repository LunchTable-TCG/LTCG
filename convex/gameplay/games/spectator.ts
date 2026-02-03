import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { SPECTATOR } from "../../lib/constants";
import { ErrorCode, createError } from "../../lib/errorCodes";

// ============================================================================
// SPECTATOR MUTATIONS
// ============================================================================

/**
 * Track spectator joining a game
 *
 * Features:
 * - Increments spectator count
 * - Enforces max spectator limit
 * - Works for anonymous users (no auth required)
 */
export const joinAsSpectator = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, { lobbyId }) => {
    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game not found",
      });
    }

    // Verify game is spectatable
    if (lobby.isPrivate || lobby.allowSpectators === false) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot spectate this game",
      });
    }

    if (lobby.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game is not active",
      });
    }

    // Enforce max spectators - check immediately before increment
    // Convex OCC will retry this mutation if concurrent writes conflict
    const maxSpectators = lobby.maxSpectators || SPECTATOR.MAX_SPECTATORS_PER_GAME;
    const currentCount = lobby.spectatorCount || 0;

    if (currentCount >= maxSpectators) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game is at maximum spectator capacity",
      });
    }

    // Atomic increment - Convex OCC handles concurrent modifications
    // If another spectator joins simultaneously, one mutation will retry
    const newCount = currentCount + 1;
    await ctx.db.patch(lobbyId, {
      spectatorCount: newCount,
    });

    return { success: true, spectatorCount: newCount };
  },
});

/**
 * Track spectator leaving a game
 *
 * Features:
 * - Decrements spectator count (with floor of 0)
 * - Safe to call even if count is already 0
 */
export const leaveAsSpectator = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, { lobbyId }) => {
    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      // Game already ended, no need to decrement
      return { success: true, spectatorCount: 0 };
    }

    // Atomic decrement with floor of 0
    // Convex OCC handles concurrent modifications
    const newCount = Math.max(0, (lobby.spectatorCount || 0) - 1);
    await ctx.db.patch(lobbyId, {
      spectatorCount: newCount,
    });

    return { success: true, spectatorCount: newCount };
  },
});
