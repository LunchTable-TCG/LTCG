import { v } from "convex/values";
import { internalMutation } from "../functions";

/**
 * Capture a point-in-time analytics snapshot for trend analysis.
 * Called periodically by cron to build historical data.
 */
export const captureSnapshot = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Player metrics
    const totalUsers = await ctx.db.query("users").collect();
    const totalUserCount = totalUsers.length;

    // Active users (played a game in last 24h)
    const oneDayAgo = now - 86400000;
    const recentGames = await ctx.db
      .query("gameLobbies")
      .withIndex("by_created", (q) => q.gte("createdAt", oneDayAgo))
      .collect();
    const activePlayerIds = new Set<string>();
    for (const game of recentGames) {
      if (game.hostId) activePlayerIds.add(game.hostId);
      if (game.opponentId) activePlayerIds.add(game.opponentId);
    }
    const dailyActiveUsers = activePlayerIds.size;

    // Economy metrics
    const allCurrency = await ctx.db.query("playerCurrency").collect();
    let totalGoldInCirculation = 0;
    let totalGemsInCirculation = 0;
    for (const pc of allCurrency) {
      totalGoldInCirculation += pc.gold;
      totalGemsInCirculation += pc.gems;
    }

    // Game metrics (games in last 24h)
    const gamesPlayedLast24h = recentGames.length;

    // Marketplace metrics
    const activeListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const activeListingCount = activeListings.length;

    // Matchmaking queue
    const queueEntries = await ctx.db.query("matchmakingQueue").collect();
    const playersInQueue = queueEntries.length;

    await ctx.db.insert("analyticsSnapshots", {
      timestamp: now,
      period: "hourly",
      metrics: {
        totalUsers: totalUserCount,
        dailyActiveUsers,
        totalGoldInCirculation,
        totalGemsInCirculation,
        gamesPlayedLast24h,
        activeMarketplaceListings: activeListingCount,
        playersInMatchmakingQueue: playersInQueue,
      },
    });
  },
});

/**
 * Cleanup old snapshots to prevent unbounded growth.
 * Keeps: hourly for 7 days, daily for 90 days.
 */
export const cleanupOldSnapshots = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const ninetyDaysAgo = now - 90 * 86400000;

    // Delete hourly snapshots older than 7 days
    const oldHourly = await ctx.db
      .query("analyticsSnapshots")
      .withIndex("by_period_timestamp", (q) =>
        q.eq("period", "hourly").lt("timestamp", sevenDaysAgo)
      )
      .collect();

    for (const snapshot of oldHourly) {
      await ctx.db.delete(snapshot._id);
    }

    // Delete daily snapshots older than 90 days
    const oldDaily = await ctx.db
      .query("analyticsSnapshots")
      .withIndex("by_period_timestamp", (q) =>
        q.eq("period", "daily").lt("timestamp", ninetyDaysAgo)
      )
      .collect();

    for (const snapshot of oldDaily) {
      await ctx.db.delete(snapshot._id);
    }
  },
});
