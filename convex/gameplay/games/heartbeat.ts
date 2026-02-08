import { v } from "convex/values";
import { internalMutation, mutation } from "../../functions";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";

// ============================================================================
// CLIENT HEARTBEAT
// ============================================================================

/**
 * Client heartbeat for crypto wager matches.
 * Clients call this every 5 seconds to prove liveness.
 * If a player reconnects while a DC timer is running, it clears the timer.
 */
export const heartbeat = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    // Get lobby and validate
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Lobby not found",
      });
    }

    if (lobby.status !== "active") {
      throw createError(ErrorCode.GAME_NOT_ACTIVE, {
        reason: "Game is not active",
      });
    }

    // Only crypto wager matches use heartbeat-based disconnect detection
    if (!lobby.cryptoWagerCurrency) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Heartbeat only applies to crypto wager matches",
      });
    }

    // Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
      });
    }

    // Determine if user is host or opponent
    const isHost = gameState.hostId === auth.userId;
    const isOpponent = gameState.opponentId === auth.userId;

    if (!isHost && !isOpponent) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You are not a player in this game",
      });
    }

    const now = Date.now();

    // Build patch: update the appropriate heartbeat field
    // biome-ignore lint/suspicious/noExplicitAny: dynamic patch object
    const patch: Record<string, any> = {};

    if (isHost) {
      patch["hostLastHeartbeat"] = now;
    } else {
      patch["opponentLastHeartbeat"] = now;
    }

    // If there's an active DC timer for THIS player, clear it (player reconnected)
    if (gameState.dcTimerStartedAt && gameState.dcPlayerId === auth.userId) {
      patch["dcTimerStartedAt"] = undefined;
      patch["dcPlayerId"] = undefined;
    }

    await ctx.db.patch(gameState._id, patch);

    return { success: true };
  },
});

// ============================================================================
// INTERNAL HEARTBEAT (for agents calling via API)
// ============================================================================

/**
 * Internal heartbeat mutation for agent players.
 * Called via HTTP API with pre-verified userId (no Privy auth needed).
 */
export const heartbeatInternal = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get lobby and validate
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Lobby not found",
      });
    }

    if (lobby.status !== "active") {
      throw createError(ErrorCode.GAME_NOT_ACTIVE, {
        reason: "Game is not active",
      });
    }

    if (!lobby.cryptoWagerCurrency) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Heartbeat only applies to crypto wager matches",
      });
    }

    // Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
      });
    }

    // Determine if user is host or opponent
    const isHost = gameState.hostId === args.userId;
    const isOpponent = gameState.opponentId === args.userId;

    if (!isHost && !isOpponent) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User is not a player in this game",
      });
    }

    const now = Date.now();

    // biome-ignore lint/suspicious/noExplicitAny: dynamic patch object
    const patch: Record<string, any> = {};

    if (isHost) {
      patch["hostLastHeartbeat"] = now;
    } else {
      patch["opponentLastHeartbeat"] = now;
    }

    // If there's an active DC timer for THIS player, clear it (player reconnected)
    if (gameState.dcTimerStartedAt && gameState.dcPlayerId === args.userId) {
      patch["dcTimerStartedAt"] = undefined;
      patch["dcPlayerId"] = undefined;
    }

    await ctx.db.patch(gameState._id, patch);

    return { success: true };
  },
});
