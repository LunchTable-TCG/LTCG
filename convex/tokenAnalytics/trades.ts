/**
 * Token Trades Management
 *
 * Track and query token trades from the bonding curve.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { internalMutation } from "../functions";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// Validators
const tradeTypeValidator = v.union(v.literal("buy"), v.literal("sell"));

// =============================================================================
// Queries
// =============================================================================

/**
 * Get recent trades
 */
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("tokenTrades")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Get trades by wallet
 */
export const getByTrader = query({
  args: {
    traderAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("tokenTrades")
      .withIndex("by_trader", (q) => q.eq("traderAddress", args.traderAddress))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Get trades by type
 */
export const getByType = query({
  args: {
    type: tradeTypeValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("tokenTrades")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Get whale trades
 */
export const getWhaleTrades = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("tokenTrades")
      .withIndex("by_whale", (q) => q.eq("isWhale", true))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

/**
 * Get trade statistics
 */
export const getStats = query({
  args: {
    period: v.optional(
      v.union(v.literal("1h"), v.literal("24h"), v.literal("7d"), v.literal("all"))
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const periodMs = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      all: Number.POSITIVE_INFINITY,
    };

    const since = args.period === "all" ? 0 : Date.now() - periodMs[args.period ?? "24h"];

    const trades = await ctx.db.query("tokenTrades").withIndex("by_timestamp").collect();
    const filtered = trades.filter((t) => t.timestamp >= since);

    const buys = filtered.filter((t) => t.type === "buy");
    const sells = filtered.filter((t) => t.type === "sell");

    return {
      totalTrades: filtered.length,
      buyCount: buys.length,
      sellCount: sells.length,
      buyVolumeSol: buys.reduce((sum, t) => sum + t.solAmount, 0),
      sellVolumeSol: sells.reduce((sum, t) => sum + t.solAmount, 0),
      buyVolumeTokens: buys.reduce((sum, t) => sum + t.tokenAmount, 0),
      sellVolumeTokens: sells.reduce((sum, t) => sum + t.tokenAmount, 0),
      uniqueTraders: new Set(filtered.map((t) => t.traderAddress)).size,
      avgTradeSize:
        filtered.length > 0
          ? filtered.reduce((sum, t) => sum + t.solAmount, 0) / filtered.length
          : 0,
      largestBuy: Math.max(...buys.map((t) => t.solAmount), 0),
      largestSell: Math.max(...sells.map((t) => t.solAmount), 0),
      whaleTradeCount: filtered.filter((t) => t.isWhale).length,
    };
  },
});

/**
 * Get volume chart data
 */
export const getVolumeChart = query({
  args: {
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const periodMs = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };

    const intervalMs = {
      "1h": 5 * 60 * 1000,
      "24h": 60 * 60 * 1000,
      "7d": 4 * 60 * 60 * 1000,
    };

    const since = Date.now() - periodMs[args.period];
    const interval = intervalMs[args.period];

    const trades = await ctx.db.query("tokenTrades").withIndex("by_timestamp").collect();
    const filtered = trades.filter((t) => t.timestamp >= since);

    const buckets = new Map<
      number,
      { buys: number; sells: number; buyVolume: number; sellVolume: number }
    >();

    for (const trade of filtered) {
      const bucket = Math.floor(trade.timestamp / interval) * interval;
      const existing = buckets.get(bucket) ?? { buys: 0, sells: 0, buyVolume: 0, sellVolume: 0 };

      if (trade.type === "buy") {
        existing.buys++;
        existing.buyVolume += trade.solAmount;
      } else {
        existing.sells++;
        existing.sellVolume += trade.solAmount;
      }

      buckets.set(bucket, existing);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        ...data,
        totalVolume: data.buyVolume + data.sellVolume,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  },
});

// =============================================================================
// Internal Mutations (called by webhooks/actions)
// =============================================================================

/**
 * Record a new trade
 */
export const record = internalMutation({
  args: {
    signature: v.string(),
    traderAddress: v.string(),
    type: tradeTypeValidator,
    tokenAmount: v.number(),
    solAmount: v.number(),
    pricePerToken: v.number(),
    timestamp: v.optional(v.number()),
    isWhale: v.optional(v.boolean()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if trade already recorded (idempotency)
    const existing = await ctx.db
      .query("tokenTrades")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();

    if (existing) {
      return { duplicate: true, id: existing._id };
    }

    const id = await ctx.db.insert("tokenTrades", {
      signature: args.signature,
      type: args.type,
      traderAddress: args.traderAddress,
      tokenAmount: args.tokenAmount,
      solAmount: args.solAmount,
      pricePerToken: args.pricePerToken,
      timestamp: args.timestamp ?? Date.now(),
      isWhale: args.isWhale ?? false,
      source: args.source,
    });

    return { duplicate: false, id };
  },
});

/**
 * Batch record trades (for backfill)
 */
export const batchRecord = internalMutation({
  args: {
    trades: v.array(
      v.object({
        signature: v.string(),
        traderAddress: v.string(),
        type: tradeTypeValidator,
        tokenAmount: v.number(),
        solAmount: v.number(),
        pricePerToken: v.number(),
        timestamp: v.number(),
        isWhale: v.boolean(),
        source: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let duplicates = 0;

    for (const trade of args.trades) {
      const existing = await ctx.db
        .query("tokenTrades")
        .withIndex("by_signature", (q) => q.eq("signature", trade.signature))
        .first();

      if (existing) {
        duplicates++;
        continue;
      }

      await ctx.db.insert("tokenTrades", trade);
      inserted++;
    }

    return { inserted, duplicates };
  },
});
