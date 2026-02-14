import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const periodValidator = v.union(
  v.literal("hourly"),
  v.literal("daily"),
  v.literal("weekly")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Capture an analytics snapshot.
 */
export const captureSnapshot = mutation({
  args: {
    period: periodValidator,
    metrics: v.object({
      totalUsers: v.number(),
      dailyActiveUsers: v.number(),
      totalGoldInCirculation: v.number(),
      totalGemsInCirculation: v.number(),
      gamesPlayedLast24h: v.number(),
      activeMarketplaceListings: v.number(),
      playersInMatchmakingQueue: v.number(),
    }),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("analyticsSnapshots", {
      timestamp: Date.now(),
      period: args.period,
      metrics: args.metrics,
    });
    return id;
  },
});

/**
 * Cleanup old analytics snapshots.
 */
export const cleanupOldSnapshots = mutation({
  args: { olderThan: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const old = await ctx.db
      .query("analyticsSnapshots")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), args.olderThan))
      .collect();

    for (const snapshot of old) {
      await ctx.db.delete(snapshot._id);
    }

    return old.length;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get analytics snapshots for a period, optionally since a timestamp.
 */
export const getSnapshots = query({
  args: {
    period: periodValidator,
    since: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("analyticsSnapshots")
      .withIndex("by_period_timestamp", (q) => q.eq("period", args.period));

    if (args.since) {
      q = q.filter((q2) => q2.gte(q2.field("timestamp"), args.since!));
    }

    return await q.order("desc").take(500);
  },
});
