/**
 * Matchmaking System
 *
 * Handles automatic player matching based on rating, mode, and deck archetype.
 * Features:
 * - ELO-based matchmaking with configurable rating windows
 * - Queue timeout and cleanup
 * - Real-time status updates for UI
 * - Automatic game creation when match found
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, internalAction } from "./_generated/server";
import type { MutationCtx, ActionCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import { validateSession } from "./lib/validators";

// ============================================================================
// CONSTANTS
// ============================================================================

const MATCHMAKING = {
  /** Initial rating window for matchmaking (±200 points) */
  INITIAL_RATING_WINDOW: 200,

  /** Expand rating window every 10 seconds by this amount */
  RATING_WINDOW_EXPANSION: 50,

  /** Maximum rating window (±1000 points = match anyone) */
  MAX_RATING_WINDOW: 1000,

  /** Queue timeout (5 minutes) */
  QUEUE_TIMEOUT_MS: 300000,

  /** How often to run matchmaking checks (10 seconds) */
  MATCHING_INTERVAL_MS: 10000,
} as const;

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get user's current matchmaking status
 *
 * Returns null if not in queue, or queue entry with elapsed time.
 */
export const getMyStatus = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { userId } = await validateSession(ctx, token);

    const queueEntry = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!queueEntry) {
      return null;
    }

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - queueEntry.joinedAt) / 1000);

    // Calculate current rating window (expands over time)
    const expansions = Math.floor(elapsedSeconds / 10); // Every 10 seconds
    const currentWindow = Math.min(
      MATCHMAKING.INITIAL_RATING_WINDOW + expansions * MATCHMAKING.RATING_WINDOW_EXPANSION,
      MATCHMAKING.MAX_RATING_WINDOW
    );

    return {
      status: "searching" as const,
      mode: queueEntry.mode,
      rating: queueEntry.rating,
      deckArchetype: queueEntry.deckArchetype,
      elapsedSeconds,
      currentRatingWindow: currentWindow,
      joinedAt: queueEntry.joinedAt,
    };
  },
});

/**
 * Get queue statistics (for debugging/admin)
 */
export const getQueueStats = query({
  handler: async (ctx) => {
    const queueEntries = await ctx.db.query("matchmakingQueue").collect();

    return {
      totalPlayers: queueEntries.length,
      byMode: {
        ranked: queueEntries.filter((e) => e.mode === "ranked").length,
        casual: queueEntries.filter((e) => e.mode === "casual").length,
      },
      averageWaitTime:
        queueEntries.length > 0
          ? Math.floor(
              queueEntries.reduce((sum, e) => sum + (Date.now() - e.joinedAt), 0) /
                queueEntries.length /
                1000
            )
          : 0,
    };
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Join matchmaking queue
 *
 * Adds player to queue and starts searching for opponents.
 */
export const joinQueue = mutation({
  args: {
    token: v.string(),
    mode: v.union(v.literal("ranked"), v.literal("casual")),
    deckArchetype: v.string(),
  },
  handler: async (ctx, { token, mode, deckArchetype }) => {
    const { userId, username } = await validateSession(ctx, token);

    // Check if already in queue
    const existing = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      throw new Error("Already in matchmaking queue");
    }

    // Check if already in an active game
    const activeLobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active"))
      )
      .first();

    if (activeLobby) {
      throw new Error("Already in a game lobby");
    }

    // Get user's rating
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const rating = mode === "ranked" ? user.rankedElo || 1000 : user.casualRating || 1000;

    // Add to queue
    await ctx.db.insert("matchmakingQueue", {
      userId,
      username,
      rating,
      deckArchetype,
      mode,
      joinedAt: Date.now(),
    });

    // Note: Matchmaking runs every 10 seconds via cron job (see crons.ts)
    // No need to trigger immediately

    return { success: true };
  },
});

/**
 * Leave matchmaking queue
 *
 * Removes player from queue.
 */
export const leaveQueue = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { userId } = await validateSession(ctx, token);

    const queueEntry = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!queueEntry) {
      throw new Error("Not in matchmaking queue");
    }

    await ctx.db.delete(queueEntry._id);

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS & ACTIONS
// ============================================================================

/**
 * Find and create matches for players in queue
 *
 * Called periodically (every 10 seconds) to match players.
 */
export const findMatches = internalAction({
  handler: async (ctx) => {
    const queueEntries = await ctx.runQuery(internal.matchmaking.getQueueEntries);

    // Group by mode
    const rankedQueue = queueEntries.filter((e) => e.mode === "ranked");
    const casualQueue = queueEntries.filter((e) => e.mode === "casual");

    // Process each mode separately
    await processQueue(ctx, rankedQueue, "ranked");
    await processQueue(ctx, casualQueue, "casual");

    // Note: Periodic execution is handled by cron job (see crons.ts)
    // No need to self-schedule
  },
});

/**
 * Process matchmaking for a specific mode
 */
async function processQueue(
  ctx: ActionCtx,
  queue: Doc<"matchmakingQueue">[],
  mode: "ranked" | "casual"
): Promise<void> {
  if (queue.length < 2) return; // Need at least 2 players

  const now = Date.now();
  const matched = new Set<string>();

  // Sort by rating for efficient matching
  const sortedQueue = [...queue].sort((a, b) => a.rating - b.rating);

  for (let i = 0; i < sortedQueue.length; i++) {
    const player1 = sortedQueue[i]!;
    if (matched.has(player1._id)) continue;

    // Calculate rating window based on wait time
    const waitTimeSeconds = Math.floor((now - player1.joinedAt) / 1000);
    const expansions = Math.floor(waitTimeSeconds / 10);
    const ratingWindow = Math.min(
      MATCHMAKING.INITIAL_RATING_WINDOW + expansions * MATCHMAKING.RATING_WINDOW_EXPANSION,
      MATCHMAKING.MAX_RATING_WINDOW
    );

    // Find best opponent within rating window
    for (let j = i + 1; j < sortedQueue.length; j++) {
      const player2 = sortedQueue[j]!;
      if (matched.has(player2._id)) continue;

      const ratingDiff = Math.abs(player1.rating - player2.rating);

      // Check if within rating window
      if (ratingDiff <= ratingWindow) {
        // Match found! Create game
        try {
          await ctx.runMutation(internal.matchmaking.createMatchedGame, {
            player1Id: player1.userId,
            player2Id: player2.userId,
            mode,
          });

          matched.add(player1._id);
          matched.add(player2._id);
          break;
        } catch (error) {
          console.error("Failed to create matched game:", error);
        }
      }

      // If rating diff is too large, stop searching (sorted queue)
      if (player2.rating - player1.rating > ratingWindow) {
        break;
      }
    }
  }
}

/**
 * Get all queue entries (internal query)
 */
export const getQueueEntries = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("matchmakingQueue").collect();
  },
});

/**
 * Create game between matched players
 */
export const createMatchedGame = internalMutation({
  args: {
    player1Id: v.id("users"),
    player2Id: v.id("users"),
    mode: v.union(v.literal("ranked"), v.literal("casual")),
  },
  handler: async (ctx, { player1Id, player2Id, mode }) => {
    // Get player details
    const player1 = await ctx.db.get(player1Id);
    const player2 = await ctx.db.get(player2Id);

    if (!player1 || !player2) {
      throw new Error("Player not found");
    }

    // Get queue entries to get deck archetypes
    const queue1 = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", player1Id))
      .first();

    const queue2 = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", player2Id))
      .first();

    if (!queue1 || !queue2) {
      throw new Error("Players no longer in queue");
    }

    // Create game lobby
    const gameId = crypto.randomUUID();
    const now = Date.now();
    const goesFirst = Math.random() < 0.5 ? player1Id : player2Id;

    const player1Rating = mode === "ranked" ? player1.rankedElo || 1000 : player1.casualRating || 1000;
    const player2Rating = mode === "ranked" ? player2.rankedElo || 1000 : player2.casualRating || 1000;

    const lobbyId = await ctx.db.insert("gameLobbies", {
      hostId: player1Id,
      hostUsername: player1.username || player1.name || "Unknown",
      hostRank: getRank(player1Rating),
      hostRating: player1Rating,
      deckArchetype: queue1.deckArchetype,
      mode,
      status: "active",
      isPrivate: false,
      opponentId: player2Id,
      opponentUsername: player2.username || player2.name || "Unknown",
      opponentRank: getRank(player2Rating),
      gameId,
      currentTurnPlayerId: goesFirst,
      turnStartedAt: now,
      lastMoveAt: now,
      turnNumber: 1,
      createdAt: now,
      startedAt: now,
    });

    // Remove both players from queue
    await ctx.db.delete(queue1._id);
    await ctx.db.delete(queue2._id);

    // Update player presence
    const player1Username = player1.username || player1.name || "Unknown";
    const player2Username = player2.username || player2.name || "Unknown";
    await updatePresenceInternal(ctx, player1Id, player1Username, "in_game");
    await updatePresenceInternal(ctx, player2Id, player2Username, "in_game");

    // Initialize game state with decks
    await ctx.runMutation(internal.games.initializeGameState, {
      lobbyId,
      gameId,
      hostId: player1Id,
      opponentId: player2Id,
      currentTurnPlayerId: goesFirst,
    });

    // Record game start event
    await ctx.runMutation(api.gameEvents.recordGameStart, {
      lobbyId,
      gameId,
      hostId: player1Id,
      hostUsername: player1Username,
      opponentId: player2Id,
      opponentUsername: player2Username,
    });

    return { lobbyId, gameId };
  },
});

/**
 * Cleanup expired queue entries
 *
 * Removes players who have been waiting too long.
 */
export const cleanupExpiredEntries = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const entries = await ctx.db.query("matchmakingQueue").collect();

    for (const entry of entries) {
      const waitTime = now - entry.joinedAt;
      if (waitTime > MATCHMAKING.QUEUE_TIMEOUT_MS) {
        await ctx.db.delete(entry._id);
      }
    }
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate rank tier from rating
 */
function getRank(rating: number): string {
  if (rating >= 2200) return "Legend";
  if (rating >= 2000) return "Master";
  if (rating >= 1800) return "Diamond";
  if (rating >= 1600) return "Platinum";
  if (rating >= 1400) return "Gold";
  if (rating >= 1200) return "Silver";
  return "Bronze";
}

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
