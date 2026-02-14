import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

export const recordMetrics = mutation({
  args: {
    timestamp: v.number(),
    price: v.number(),
    priceUsd: v.number(),
    marketCap: v.number(),
    volume24h: v.number(),
    txCount24h: v.number(),
    holderCount: v.number(),
    liquidity: v.number(),
    bondingCurveProgress: v.number(),
    graduationEta: v.optional(v.number()),
  },
  returns: v.id("tokenMetrics"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tokenMetrics", args);
    return id;
  },
});

export const getMetrics = query({
  args: {
    since: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.since !== undefined) {
      const metrics = await ctx.db
        .query("tokenMetrics")
        .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since!))
        .order("desc")
        .take(limit);
      return metrics;
    }

    const metrics = await ctx.db
      .query("tokenMetrics")
      .order("desc")
      .take(limit);
    return metrics;
  },
});

export const getLatestMetrics = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("tokenMetrics")
      .order("desc")
      .first();
    return latest;
  },
});
