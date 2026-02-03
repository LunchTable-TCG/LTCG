/**
 * Marketing Stats Module
 *
 * Provides public-facing statistics for landing pages and marketing materials.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get public statistics for marketing display
 * Returns aggregated stats about players, games, and activity
 */
export const getPublicStats = query({
  args: {},
  returns: v.object({
    totalPlayers: v.number(),
    gamesPlayedToday: v.number(),
    totalGamesPlayed: v.number(),
    activePlayersNow: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const fifteenMinutesAgo = now - 15 * 60 * 1000;

    // Count total registered players
    const allUsers = await ctx.db.query("users").collect();
    const totalPlayers = allUsers.length;

    // Count games started today
    const gamesToday = await ctx.db
      .query("gameLobbies")
      .filter((q) => q.gte(q.field("_creationTime"), todayStartMs))
      .collect();
    const gamesPlayedToday = gamesToday.length;

    // Count all games ever played
    const allGames = await ctx.db.query("gameLobbies").collect();
    const totalGamesPlayed = allGames.length;

    // Count active players (recent presence)
    const activeUsers = await ctx.db
      .query("userPresence")
      .filter((q) => q.gte(q.field("lastActiveAt"), fifteenMinutesAgo))
      .collect();
    const activePlayersNow = activeUsers.length;

    return {
      totalPlayers,
      gamesPlayedToday,
      totalGamesPlayed,
      activePlayersNow,
    };
  },
});
