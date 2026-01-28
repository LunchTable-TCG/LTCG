/**
 * Match History Queries
 *
 * Provides access to historical match data for players
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuthQuery } from "../lib/convexAuth";
import { matchHistoryEntryValidator } from "../lib/returnValidators";

// Type definitions
type MatchResult = "victory" | "defeat";

/**
 * Get match history for a user
 *
 * Retrieves the authenticated user's match history, including both wins and losses.
 * Results are enriched with opponent information, rating changes, and XP gained.
 * Returns matches sorted by completion time (most recent first).
 *
 * @param limit - Maximum number of matches to return (default: 50)
 * @returns Array of match history entries with result, opponent, rating change, and timestamp
 */
export const getMatchHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get matches where user is either winner or loser
    const wonMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_winner", (q) => q.eq("winnerId", userId))
      .order("desc")
      .take(limit);

    const lostMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_loser", (q) => q.eq("loserId", userId))
      .order("desc")
      .take(limit);

    // Combine and sort by completion time
    const allMatches = [...wonMatches, ...lostMatches]
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit);

    // Enrich with opponent data
    const enrichedMatches = await Promise.all(
      allMatches.map(async (match) => {
        const isWinner = match.winnerId === userId;
        const opponentId = isWinner ? match.loserId : match.winnerId;
        const opponent = await ctx.db.get(opponentId);

        const result: MatchResult = isWinner ? "victory" : "defeat";

        return {
          id: match._id,
          result,
          mode: match.gameType,
          opponent: {
            id: opponentId,
            username: opponent?.username || "Unknown",
          },
          ratingChange: isWinner
            ? match.winnerRatingAfter - match.winnerRatingBefore
            : match.loserRatingAfter - match.loserRatingBefore,
          xpGained: isWinner ? match.xpAwarded || 0 : 0,
          timestamp: match.completedAt,
        };
      })
    );

    return enrichedMatches;
  },
});
