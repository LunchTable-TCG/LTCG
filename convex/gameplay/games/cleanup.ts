import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internalAction } from "../../_generated/server";
import { internalMutation } from "../../functions";

/**
 * Type-safe internal API accessor
 * Avoids TS2589 "Type instantiation is excessively deep" by using a typed wrapper
 */
interface InternalGamesAPI {
  getActiveLobbiesForCleanup: typeof internal.games.getActiveLobbiesForCleanup;
  forfeitGame: typeof internal.games.forfeitGame;
  getWaitingLobbiesForCleanup: typeof internal.games.getWaitingLobbiesForCleanup;
  cancelStaleWaitingLobby: typeof internal.games.cancelStaleWaitingLobby;
}

const internalGames = internal.games as InternalGamesAPI;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update user presence status
 */
async function updatePresenceInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
  username: string,
  status: "online" | "in_game" | "idle"
): Promise<void> {
  const existing = await ctx.db
    .query("userPresence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      status,
      lastActiveAt: Date.now(),
    });
  } else {
    await ctx.db.insert("userPresence", {
      userId,
      username,
      status,
      lastActiveAt: Date.now(),
    });
  }
}

// ============================================================================
// SCHEDULED CLEANUP
// ============================================================================

/**
 * Cleanup stale game lobbies
 * Runs every minute to check for games where players haven't made a move in > 2 minutes
 */
export const cleanupStaleGames = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    const TIMEOUT_MS = 120000; // 2 minutes (120 seconds)

    // Get all active games
    const activeLobbies = await ctx.runQuery(internalGames.getActiveLobbiesForCleanup);

    for (const lobby of activeLobbies) {
      // Check if last move was more than 2 minutes ago
      if (lobby.lastMoveAt && now - lobby.lastMoveAt > TIMEOUT_MS) {
        // Forfeit the game for the player whose turn it is
        if (lobby.currentTurnPlayerId) {
          await ctx.runMutation(internalGames.forfeitGame, {
            lobbyId: lobby._id,
            forfeitingPlayerId: lobby.currentTurnPlayerId,
          });
        }
      }
    }

    // Also cleanup waiting lobbies that have been waiting for too long (30 minutes)
    const WAITING_TIMEOUT_MS = 1800000; // 30 minutes
    const waitingLobbies = await ctx.runQuery(internalGames.getWaitingLobbiesForCleanup);

    for (const lobby of waitingLobbies) {
      if (now - lobby.createdAt > WAITING_TIMEOUT_MS) {
        await ctx.runMutation(internalGames.cancelStaleWaitingLobby, {
          lobbyId: lobby._id,
        });
      }
    }
  },
});

/**
 * Cancel stale waiting lobby (internal mutation)
 */
export const cancelStaleWaitingLobby = internalMutation({
  args: { lobbyId: v.id("gameLobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) return;

    // Update lobby to cancelled
    await ctx.db.patch(args.lobbyId, {
      status: "cancelled",
    });

    // Update host presence
    await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "online");
  },
});
