/**
 * Leaderboards System
 *
 * Implements 9 leaderboard variations (3 types × 3 player segments):
 * - Types: Ranked (ELO), Casual (Rating), Story (XP)
 * - Segments: All Players, Humans Only, AI Agents Only
 *
 * Features:
 * - Real-time leaderboard queries with .take() optimization
 * - Cached snapshots refreshed every 5 minutes
 * - Individual user rank queries
 * - Scheduled snapshot refresh for performance
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import {
  casualLeaderboard,
  casualLeaderboardAI,
  casualLeaderboardHumans,
  rankedLeaderboard,
  rankedLeaderboardAI,
  rankedLeaderboardHumans,
  storyLeaderboard,
} from "../infrastructure/aggregates";
import { LEADERBOARD } from "../lib/constants";
import { requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { calculateWinRate } from "../lib/helpers";
import {
  battleHistoryEntryValidator,
  cachedLeaderboardValidator,
  leaderboardEntryValidator,
  userRankValidator,
} from "../lib/returnValidators";
import { gameModeValidator, playerSegmentValidator } from "../schema";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get real-time leaderboard (optimized with indexes and .take()).
 * Returns top N players based on rating/XP for the specified leaderboard type and player segment.
 * Uses aggregates for O(log n) performance.
 *
 * @param type - Leaderboard type: "ranked" (ELO), "casual" (rating), or "story" (XP)
 * @param segment - Player segment: "all", "humans", or "ai"
 * @param limit - Maximum number of entries to return (default: 50)
 * @returns Array of leaderboard entries with rank, rating, and win/loss stats
 */
export const getLeaderboard = query({
  args: {
    type: gameModeValidator,
    segment: playerSegmentValidator,
    limit: v.optional(v.number()),
  },
  returns: v.array(leaderboardEntryValidator),
  handler: async (ctx, { type, segment, limit = LEADERBOARD.RANKS_TO_DISPLAY }) => {
    // Select the appropriate aggregate based on type
    let aggregate;
    let namespace: "human" | "ai" | undefined;

    if (type === "ranked") {
      aggregate = segment === "all" ? rankedLeaderboard : rankedLeaderboardHumans; // Both use same aggregate with namespace
      namespace = segment === "humans" ? "human" : segment === "ai" ? "ai" : undefined;
    } else if (type === "casual") {
      aggregate = segment === "all" ? casualLeaderboard : casualLeaderboardHumans; // Both use same aggregate with namespace
      namespace = segment === "humans" ? "human" : segment === "ai" ? "ai" : undefined;
    } else {
      // Story mode - segment filtering handled manually due to join
      aggregate = storyLeaderboard;
      namespace = undefined;
    }

    // Story mode requires special handling due to join with users table
    if (type === "story") {
      const results = [];
      let index = 0;
      let fetched = 0;

      // Fetch documents until we have enough after filtering
      while (fetched < limit && index < limit * 3) {
        const item = await aggregate.at(ctx, index);
        if (!item) break;

        // Get full playerXP document
        const xp = await ctx.db.get(item.id as Id<"playerXP">);
        if (!xp) {
          index++;
          continue;
        }

        const user = await ctx.db.get(xp.userId);
        if (!user) {
          index++;
          continue;
        }

        // Filter by segment
        const isAiAgent = user.isAiAgent || false;
        if (segment === "humans" && isAiAgent) {
          index++;
          continue;
        }
        if (segment === "ai" && !isAiAgent) {
          index++;
          continue;
        }

        results.push({
          userId: user._id,
          username: user.username,
          rank: fetched + 1,
          rating: xp.currentXP,
          level: xp.currentLevel,
          wins: user.storyWins || 0,
          losses: 0, // Story mode doesn't track losses
          winRate: calculateWinRate(user, type),
          isAiAgent,
        });

        fetched++;
        index++;
      }

      return results;
    }

    // Ranked and Casual modes - fetch full documents from aggregate items
    const results = [];
    for (let i = 0; i < limit; i++) {
      const item = namespace
        ? await aggregate.at(ctx, i, { namespace })
        : await aggregate.at(ctx, i);
      if (!item) break;

      // Get full user document
      const player = await ctx.db.get(item.id as Id<"users">);
      if (!player) continue;

      const rating = type === "ranked" ? player.rankedElo || 1000 : player.casualRating || 1000;
      const wins = type === "ranked" ? player.rankedWins || 0 : player.casualWins || 0;
      const losses = type === "ranked" ? player.rankedLosses || 0 : player.casualLosses || 0;

      results.push({
        userId: player._id,
        username: player.username,
        rank: i + 1,
        rating,
        level: 1, // Level not used for ranked/casual
        wins,
        losses,
        winRate: calculateWinRate(player, type),
        isAiAgent: player.isAiAgent || false,
      });
    }

    return results;
  },
});

/**
 * Get cached leaderboard (faster, but slightly stale - updates every 5 min).
 * Returns cached snapshot if available, otherwise returns null.
 * Frontend should fallback to real-time query if null.
 *
 * @param type - Leaderboard type: "ranked", "casual", or "story"
 * @param segment - Player segment: "all", "humans", or "ai"
 * @returns Cached leaderboard snapshot or null if not yet generated
 */
export const getCachedLeaderboard = query({
  args: {
    type: gameModeValidator,
    segment: playerSegmentValidator,
  },
  returns: cachedLeaderboardValidator,
  handler: async (ctx, { type, segment }) => {
    const snapshot = await ctx.db
      .query("leaderboardSnapshots")
      .withIndex("by_leaderboard", (q) =>
        q.eq("leaderboardType", type).eq("playerSegment", segment)
      )
      .first();

    if (!snapshot) {
      // No snapshot exists yet - frontend should fallback to real-time query
      return null;
    }

    return {
      rankings: snapshot.rankings,
      lastUpdated: snapshot.lastUpdated,
      isCached: true,
    };
  },
});

/**
 * Get user's rank on a specific leaderboard.
 * Uses aggregate's indexOf() for O(log n) rank lookup instead of O(n) counting.
 * Automatically filters by player type (human/AI) based on user's isAiAgent flag.
 *
 * @param type - Leaderboard type: "ranked", "casual", or "story"
 * @returns User's rank, rating, percentile, and total players in segment
 * @throws NOT_FOUND_USER if user not found
 */
export const getUserRank = query({
  args: {
    type: gameModeValidator,
  },
  returns: userRankValidator,
  handler: async (ctx, { type }) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get the full user object
    const user = await ctx.db.get(userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    // Story mode uses playerXP table
    if (type === "story") {
      const playerXP = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (!playerXP) {
        // User hasn't started story mode yet
        return {
          rank: 0,
          rating: 0,
          level: 1,
          totalPlayers: 0,
          percentile: 0,
        };
      }

      // Use aggregate for O(log n) rank lookup
      const index = await storyLeaderboard.indexOfDoc(ctx, playerXP);
      const totalPlayers = await storyLeaderboard.count(ctx);

      const rank = index + 1; // indexOfDoc returns 0-based index, convert to 1-based rank

      return {
        rank,
        rating: playerXP.currentXP,
        level: playerXP.currentLevel,
        totalPlayers,
        percentile: totalPlayers > 0 ? Math.round((rank / totalPlayers) * 100) : 100,
      };
    }

    // Ranked and Casual modes use users table
    // For segment-specific ranks, use namespace filtering
    const isAiAgent = user.isAiAgent || false;
    const namespace: "human" | "ai" = isAiAgent ? "ai" : "human";

    const aggregate = type === "ranked" ? rankedLeaderboardHumans : casualLeaderboardHumans;

    const userRating = type === "ranked" ? user.rankedElo || 1000 : user.casualRating || 1000;

    // Use aggregate for O(log n) rank lookup
    // Pass the negative key (matching our sortKey) and namespace
    const key = -userRating;
    const index = await aggregate.indexOf(ctx, key, { namespace, id: userId });
    const totalPlayers = await aggregate.count(ctx, { namespace });

    const rank = index + 1; // indexOfDoc returns 0-based index, convert to 1-based rank

    return {
      rank,
      rating: userRating,
      level: 1, // Level not used for ranked/casual
      totalPlayers,
      percentile: totalPlayers > 0 ? Math.round((rank / totalPlayers) * 100) : 100,
    };
  },
});

/**
 * Get battle history for the current user.
 * Returns recent matches with rating changes, opponents, and results.
 * Can filter by game type (ranked/casual/story) if needed.
 *
 * @param limit - Maximum number of matches to return (default: 20)
 * @param gameType - Optional filter by game type ("ranked", "casual", or "story")
 * @returns Array of match history entries sorted by most recent first
 */
export const getBattleHistory = query({
  args: {
    limit: v.optional(v.number()),
    gameType: v.optional(gameModeValidator),
  },
  returns: v.array(battleHistoryEntryValidator),
  handler: async (ctx, { limit = 20, gameType }) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get matches where user was winner
    const wonMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_winner", (q) => q.eq("winnerId", userId))
      .order("desc")
      .take(limit);

    // Get matches where user was loser
    const lostMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_loser", (q) => q.eq("loserId", userId))
      .order("desc")
      .take(limit);

    // Combine and format results
    const wonResults = await Promise.all(
      wonMatches.map(async (match) => {
        const opponent = await ctx.db.get(match.loserId);
        return {
          _id: match._id,
          opponentId: match.loserId,
          opponentUsername: opponent?.username || opponent?.name || "Unknown",
          gameType: match.gameType,
          result: "win" as const,
          ratingBefore: match.winnerRatingBefore,
          ratingAfter: match.winnerRatingAfter,
          ratingChange: match.winnerRatingAfter - match.winnerRatingBefore,
          xpAwarded: match.xpAwarded,
          completedAt: match.completedAt,
        };
      })
    );

    const lostResults = await Promise.all(
      lostMatches.map(async (match) => {
        const opponent = await ctx.db.get(match.winnerId);
        return {
          _id: match._id,
          opponentId: match.winnerId,
          opponentUsername: opponent?.username || opponent?.name || "Unknown",
          gameType: match.gameType,
          result: "loss" as const,
          ratingBefore: match.loserRatingBefore,
          ratingAfter: match.loserRatingAfter,
          ratingChange: match.loserRatingAfter - match.loserRatingBefore,
          xpAwarded: match.xpAwarded,
          completedAt: match.completedAt,
        };
      })
    );

    // Combine, sort by completedAt, and apply filters
    let allMatches = [...wonResults, ...lostResults].sort((a, b) => b.completedAt - a.completedAt);

    // Filter by game type if specified
    if (gameType) {
      allMatches = allMatches.filter((m) => m.gameType === gameType);
    }

    // Return limited results
    return allMatches.slice(0, limit);
  },
});

// ============================================================================
// INTERNAL MUTATIONS (Called by cron jobs)
// ============================================================================

/**
 * Refresh all 9 leaderboard snapshots.
 * Called by cron job every 5 minutes to keep snapshots fresh.
 * Updates snapshots for all combinations of type (ranked/casual/story) × segment (all/humans/ai).
 *
 * @internal Called by cron job, not directly from client
 */
export const refreshAllSnapshots = internalMutation({
  handler: async (ctx) => {
    const types = ["ranked", "casual", "story"] as const;
    const segments = ["all", "humans", "ai"] as const;

    for (const type of types) {
      for (const segment of segments) {
        await refreshSnapshot(ctx, type, segment);
      }
    }
  },
});

/**
 * Helper: Refresh a single leaderboard snapshot
 */
async function refreshSnapshot(
  ctx: MutationCtx,
  type: "ranked" | "casual" | "story",
  segment: "all" | "humans" | "ai"
) {
  // Get top N players for this leaderboard
  const rankings = await getLeaderboardRankings(ctx, type, segment, LEADERBOARD.PAGE_SIZE);

  // Find existing snapshot
  const existing = await ctx.db
    .query("leaderboardSnapshots")
    .withIndex("by_leaderboard", (q) => q.eq("leaderboardType", type).eq("playerSegment", segment))
    .first();

  if (existing) {
    // Update existing snapshot
    await ctx.db.patch(existing._id, {
      rankings,
      lastUpdated: Date.now(),
    });
  } else {
    // Create new snapshot
    await ctx.db.insert("leaderboardSnapshots", {
      leaderboardType: type,
      playerSegment: segment,
      rankings,
      lastUpdated: Date.now(),
    });
  }
}

/**
 * Helper: Generate rankings for a specific leaderboard
 */
async function getLeaderboardRankings(
  ctx: MutationCtx,
  type: "ranked" | "casual" | "story",
  segment: "all" | "humans" | "ai",
  limit: number
) {
  // Story mode uses playerXP table, others use users table
  if (type === "story") {
    // Query playerXP table for story leaderboard
    const playerXPs = await ctx.db
      .query("playerXP")
      .withIndex("by_level")
      .order("desc")
      .take(limit * 3); // Take more to filter by segment

    // Get user data and filter by segment
    const playersWithData = await Promise.all(
      playerXPs.map(async (xp) => {
        const user = await ctx.db.get(xp.userId);
        if (!user) return null;

        // Filter by segment
        const isAiAgent = user.isAiAgent || false;
        if (segment === "humans" && isAiAgent) return null;
        if (segment === "ai" && !isAiAgent) return null;

        return {
          userId: user._id,
          username: user.username || user.name || "Unknown",
          rating: xp.currentXP,
          level: xp.currentLevel,
          wins: user.storyWins || 0,
          losses: 0, // Story mode doesn't track losses
          winRate: calculateWinRate(user, type),
          isAiAgent,
        };
      })
    );

    // Filter out nulls and take limit
    const filteredPlayers = playersWithData.filter((p) => p !== null).slice(0, limit);

    // Add ranks
    return filteredPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }

  // Ranked and Casual modes use users table
  const ratingField = type === "ranked" ? "rankedElo" : "casualRating";

  let players;

  if (segment === "humans" || segment === "ai") {
    const indexName = `${ratingField}_byType` as const;
    const isAiAgent = segment === "ai";

    players = await ctx.db
      .query("users")
      .withIndex(indexName, (q) => q.eq("isAiAgent", isAiAgent))
      .order("desc")
      .take(limit);
  } else {
    // Use simple index for "all" segment
    players = await ctx.db.query("users").withIndex(ratingField).order("desc").take(limit);
  }

  // Format rankings
  return players.map((player, index) => {
    const rating = type === "ranked" ? player.rankedElo || 1000 : player.casualRating || 1000;

    const wins = type === "ranked" ? player.rankedWins || 0 : player.casualWins || 0;

    const losses = type === "ranked" ? player.rankedLosses || 0 : player.casualLosses || 0;

    return {
      userId: player._id,
      username: player.username || player.name || "Unknown",
      rank: index + 1,
      rating,
      level: 1, // Level not used for ranked/casual
      wins,
      losses,
      winRate: calculateWinRate(player, type),
      isAiAgent: player.isAiAgent || false,
    };
  });
}
