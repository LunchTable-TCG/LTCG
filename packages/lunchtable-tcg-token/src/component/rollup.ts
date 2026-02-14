import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

export const upsertRollup = mutation({
  args: {
    period: v.union(v.literal("hour"), v.literal("day")),
    periodStart: v.number(),
    volume: v.number(),
    buyVolume: v.number(),
    sellVolume: v.number(),
    txCount: v.number(),
    buyCount: v.number(),
    sellCount: v.number(),
    uniqueTraders: v.number(),
    highPrice: v.number(),
    lowPrice: v.number(),
    openPrice: v.number(),
    closePrice: v.number(),
    newHolders: v.number(),
    lostHolders: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tokenStatsRollup")
      .withIndex("by_period", (q) =>
        q.eq("period", args.period).eq("periodStart", args.periodStart)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        volume: args.volume,
        buyVolume: args.buyVolume,
        sellVolume: args.sellVolume,
        txCount: args.txCount,
        buyCount: args.buyCount,
        sellCount: args.sellCount,
        uniqueTraders: args.uniqueTraders,
        highPrice: args.highPrice,
        lowPrice: args.lowPrice,
        openPrice: args.openPrice,
        closePrice: args.closePrice,
        newHolders: args.newHolders,
        lostHolders: args.lostHolders,
      });
    } else {
      await ctx.db.insert("tokenStatsRollup", args);
    }

    return null;
  },
});

export const getRollups = query({
  args: {
    period: v.union(v.literal("hour"), v.literal("day")),
    since: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.since !== undefined) {
      const rollups = await ctx.db
        .query("tokenStatsRollup")
        .withIndex("by_period", (q) =>
          q.eq("period", args.period).gte("periodStart", args.since!)
        )
        .order("desc")
        .take(limit);
      return rollups;
    }

    const rollups = await ctx.db
      .query("tokenStatsRollup")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .order("desc")
      .take(limit);
    return rollups;
  },
});
