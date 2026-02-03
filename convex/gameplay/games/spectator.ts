import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { SPECTATOR } from "../../lib/constants";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { spectatorCounter } from "../../infrastructure/shardedCounters";

// ============================================================================
// SPECTATOR MUTATIONS
// ============================================================================

/**
 * Track spectator joining a game
 *
 * Features:
 * - Increments spectator count via sharded counter (no OCC conflicts)
 * - Enforces max spectator limit
 * - Works for anonymous users (no auth required)
 * - Note: Count is eventually consistent, may lag behind actual spectators by ~1s
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

    // Enforce max spectators - check current sharded counter value
    // Note: Due to eventual consistency, this may briefly allow 1-2 extra spectators
    // during high concurrency, but this is acceptable for spectating
    const maxSpectators = lobby.maxSpectators || SPECTATOR.MAX_SPECTATORS_PER_GAME;
    const currentCount = await spectatorCounter.count(ctx, lobbyId);

    if (currentCount >= maxSpectators) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game is at maximum spectator capacity",
      });
    }

    // Increment via sharded counter - eliminates OCC conflicts
    // Multiple concurrent joins are distributed across counter shards
    await spectatorCounter.add(ctx, lobbyId, 1);
    const newCount = await spectatorCounter.count(ctx, lobbyId);

    return { success: true, spectatorCount: newCount };
  },
});

/**
 * Track spectator leaving a game
 *
 * Features:
 * - Decrements spectator count via sharded counter (floors at 0)
 * - Safe to call even if count is already 0 (sharded counter handles negative floors)
 * - Works after game ends or is deleted
 * - Note: Count is eventually consistent, may lag behind actual spectators by ~1s
 */
export const leaveAsSpectator = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, { lobbyId }) => {
    // No need to check if lobby exists - spectator counter can decrement regardless
    // This handles the case where the game already ended

    // Decrement via sharded counter - eliminates OCC conflicts
    // Multiple concurrent leaves are distributed across counter shards
    // Sharded counter implementation ensures count never goes below 0
    await spectatorCounter.add(ctx, lobbyId, -1);
    const newCount = await spectatorCounter.count(ctx, lobbyId);

    return { success: true, spectatorCount: newCount };
  },
});
