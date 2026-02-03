/**
 * Match History Queries
 *
 * Provides access to historical match data for players
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuthQuery } from "../lib/convexAuth";

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

/**
 * Get public match history for a user profile
 *
 * Retrieves match history for any user, respecting their privacy settings.
 * Returns null if the user has disabled showing match history.
 * If viewing own profile, always shows match history.
 *
 * @param userId - The user ID to fetch match history for
 * @param limit - Maximum number of matches to return (default: 5)
 * @returns Array of match history entries or null if privacy blocks access
 */
export const getPublicMatchHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 5 }) => {
    // Check if this is the authenticated user's own profile
    const identity = await ctx.auth.getUserIdentity();
    let viewerId: Id<"users"> | null = null;

    if (identity) {
      const viewer = await ctx.db
        .query("users")
        .withIndex("privyId", (q) => q.eq("privyId", identity.subject))
        .first();
      viewerId = viewer?._id ?? null;
    }

    const isOwnProfile = viewerId === userId;

    // If not own profile, check privacy settings
    if (!isOwnProfile) {
      const preferences = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      // Check if profile is public and match history is allowed
      const profilePublic = preferences?.privacy?.profilePublic ?? true;
      const showMatchHistory = preferences?.privacy?.showMatchHistory ?? true;

      if (!profilePublic || !showMatchHistory) {
        return null; // Privacy settings block access
      }
    }

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
          timestamp: match.completedAt,
        };
      })
    );

    return enrichedMatches;
  },
});

/**
 * Get user privacy settings for profile viewing
 *
 * Checks if a user's profile is accessible based on their privacy settings.
 * Returns privacy status for the frontend to handle appropriately.
 *
 * @param userId - The user ID to check privacy for
 * @returns Object with isPublic boolean and whether current user is the owner
 */
export const getProfilePrivacy = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Check if this is the authenticated user's own profile
    const identity = await ctx.auth.getUserIdentity();
    let viewerId: Id<"users"> | null = null;

    if (identity) {
      const viewer = await ctx.db
        .query("users")
        .withIndex("privyId", (q) => q.eq("privyId", identity.subject))
        .first();
      viewerId = viewer?._id ?? null;
    }

    const isOwnProfile = viewerId === userId;

    // If own profile, always accessible
    if (isOwnProfile) {
      return { isPublic: true, isOwnProfile: true };
    }

    // Check privacy settings
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const profilePublic = preferences?.privacy?.profilePublic ?? true;

    return { isPublic: profilePublic, isOwnProfile: false };
  },
});
