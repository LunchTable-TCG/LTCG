import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

export const recordTrade = mutation({
  args: {
    signature: v.string(),
    type: v.union(v.literal("buy"), v.literal("sell")),
    traderAddress: v.string(),
    tokenAmount: v.number(),
    solAmount: v.number(),
    pricePerToken: v.number(),
    timestamp: v.number(),
    isWhale: v.boolean(),
    source: v.optional(v.string()),
  },
  returns: v.id("tokenTrades"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tokenTrades", args);
    return id;
  },
});

export const getTrades = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.union(v.literal("buy"), v.literal("sell"))),
    whaleOnly: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.whaleOnly) {
      const trades = await ctx.db
        .query("tokenTrades")
        .withIndex("by_whale", (q) => q.eq("isWhale", true))
        .order("desc")
        .take(limit);
      return trades;
    }

    if (args.type) {
      const trades = await ctx.db
        .query("tokenTrades")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(limit);
      return trades;
    }

    const trades = await ctx.db
      .query("tokenTrades")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
    return trades;
  },
});

export const getTradeBySignature = query({
  args: { signature: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const trade = await ctx.db
      .query("tokenTrades")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();
    return trade;
  },
});
