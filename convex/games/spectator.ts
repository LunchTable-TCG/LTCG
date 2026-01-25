import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { SPECTATOR } from "../lib/constants";

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
    token: v.optional(v.string()), // Optional: for tracking logged-in users
  },
  handler: async (ctx, { lobbyId, token }) => {
    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new Error("Game not found");
    }

    // Verify game is spectatable
    if (lobby.isPrivate || lobby.allowSpectators === false) {
      throw new Error("Cannot spectate this game");
    }

    if (lobby.status !== "active") {
      throw new Error("Game is not active");
    }

    const currentCount = lobby.spectatorCount || 0;

    // Enforce max spectators
    const maxSpectators = lobby.maxSpectators || SPECTATOR.MAX_SPECTATORS_PER_GAME;
    if (currentCount >= maxSpectators) {
      throw new Error("Game is at maximum spectator capacity");
    }

    // Increment count
    await ctx.db.patch(lobbyId, {
      spectatorCount: currentCount + 1,
    });

    return { success: true, spectatorCount: currentCount + 1 };
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
    token: v.optional(v.string()),
  },
  handler: async (ctx, { lobbyId, token }) => {
    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      // Game already ended, no need to decrement
      return { success: true };
    }

    const currentCount = lobby.spectatorCount || 0;

    // Decrement with floor of 0
    await ctx.db.patch(lobbyId, {
      spectatorCount: Math.max(0, currentCount - 1),
    });

    return { success: true, spectatorCount: Math.max(0, currentCount - 1) };
  },
});
