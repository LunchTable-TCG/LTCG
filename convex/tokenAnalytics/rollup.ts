/**
 * Token Stats Rollup
 *
 * Aggregate and query rolled-up token statistics by time period.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { internalMutation } from "../functions";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// Validators
const periodTypeValidator = v.union(v.literal("hour"), v.literal("day"));

// =============================================================================
// Queries
// =============================================================================

/**
 * Get stats rollup for a period type
 */
export const getByPeriod = query({
  args: {
    period: periodTypeValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("tokenStatsRollup")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .order("desc")
      .take(args.limit ?? 30);
  },
});

/**
 * Get stats for a specific time range
 */
export const getRange = query({
  args: {
    period: periodTypeValidator,
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const rollups = await ctx.db
      .query("tokenStatsRollup")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .collect();

    return rollups
      .filter((r) => r.periodStart >= args.startTime && r.periodStart <= args.endTime)
      .sort((a, b) => a.periodStart - b.periodStart);
  },
});

/**
 * Get summary statistics
 */
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Get latest daily rollup
    const latestDaily = await ctx.db
      .query("tokenStatsRollup")
      .withIndex("by_period", (q) => q.eq("period", "day"))
      .order("desc")
      .first();

    // Get latest metrics
    const latestMetrics = await ctx.db.query("tokenMetrics").order("desc").first();

    // Get 24h ago for comparison
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const allMetrics = await ctx.db
      .query("tokenMetrics")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
    const oldMetrics = allMetrics.find((m) => m.timestamp <= dayAgo);

    // Calculate changes
    const priceChange24h =
      latestMetrics && oldMetrics && oldMetrics.priceUsd > 0
        ? ((latestMetrics.priceUsd - oldMetrics.priceUsd) / oldMetrics.priceUsd) * 100
        : 0;

    const mcChange24h =
      latestMetrics && oldMetrics && oldMetrics.marketCap > 0
        ? ((latestMetrics.marketCap - oldMetrics.marketCap) / oldMetrics.marketCap) * 100
        : 0;

    return {
      currentPrice: latestMetrics?.priceUsd ?? 0,
      currentMarketCap: latestMetrics?.marketCap ?? 0,
      currentHolders: latestMetrics?.holderCount ?? 0,
      priceChange24h,
      mcChange24h,
      volume24h: latestDaily?.volume ?? 0,
      trades24h: latestDaily?.txCount ?? 0,
      uniqueTraders24h: latestDaily?.uniqueTraders ?? 0,
      newHolders24h: latestDaily?.newHolders ?? 0,
    };
  },
});

/**
 * Get historical summary
 */
export const getHistoricalSummary = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const days = args.days ?? 30;

    const dailyRollups = await ctx.db
      .query("tokenStatsRollup")
      .withIndex("by_period", (q) => q.eq("period", "day"))
      .order("desc")
      .take(days);

    const totalVolume = dailyRollups.reduce((sum, r) => sum + (r.volume ?? 0), 0);
    const totalTrades = dailyRollups.reduce((sum, r) => sum + (r.txCount ?? 0), 0);
    const totalNewHolders = dailyRollups.reduce((sum, r) => sum + (r.newHolders ?? 0), 0);

    const oldestPrice = dailyRollups[dailyRollups.length - 1]?.openPrice ?? 0;
    const latestPrice = dailyRollups[0]?.closePrice ?? 0;
    const priceChange = oldestPrice > 0 ? ((latestPrice - oldestPrice) / oldestPrice) * 100 : 0;

    return {
      period: `${days}d`,
      totalVolume,
      totalTrades,
      totalNewHolders,
      priceChange,
      avgDailyVolume: dailyRollups.length > 0 ? totalVolume / dailyRollups.length : 0,
      avgDailyTrades: dailyRollups.length > 0 ? totalTrades / dailyRollups.length : 0,
      dailyData: dailyRollups.reverse(),
    };
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Create or update a rollup period
 */
export const upsertRollup = internalMutation({
  args: {
    period: periodTypeValidator,
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
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tokenStatsRollup")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .filter((q) => q.eq(q.field("periodStart"), args.periodStart))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        closePrice: args.closePrice,
        highPrice: Math.max(existing.highPrice, args.highPrice),
        lowPrice: Math.min(existing.lowPrice, args.lowPrice),
        volume: args.volume,
        buyVolume: args.buyVolume,
        sellVolume: args.sellVolume,
        txCount: args.txCount,
        buyCount: args.buyCount,
        sellCount: args.sellCount,
        uniqueTraders: args.uniqueTraders,
        newHolders: args.newHolders,
        lostHolders: args.lostHolders,
      });
      return existing._id;
    }

    return await ctx.db.insert("tokenStatsRollup", args);
  },
});

/**
 * Generate rollup for a period (called by scheduled job)
 */
export const generateRollup = internalMutation({
  args: {
    period: periodTypeValidator,
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Get trades for the period
    const trades = await ctx.db.query("tokenTrades").withIndex("by_timestamp").collect();
    const periodTrades = trades.filter(
      (t) => t.timestamp >= args.periodStart && t.timestamp < args.periodEnd
    );

    // Get metrics for the period
    const metrics = await ctx.db.query("tokenMetrics").withIndex("by_timestamp").collect();
    const periodMetrics = metrics.filter(
      (m) => m.timestamp >= args.periodStart && m.timestamp < args.periodEnd
    );

    if (periodMetrics.length === 0) {
      return { skipped: true, reason: "No metrics for period" };
    }

    const prices = periodMetrics.map((m) => m.priceUsd);
    const buys = periodTrades.filter((t) => t.type === "buy");
    const sells = periodTrades.filter((t) => t.type === "sell");

    // Get holder changes
    const holders = await ctx.db.query("tokenHolders").collect();
    const newHolders = holders.filter(
      (h) => h.firstPurchaseAt >= args.periodStart && h.firstPurchaseAt < args.periodEnd
    ).length;

    const rollupData = {
      period: args.period,
      periodStart: args.periodStart,
      volume: periodTrades.reduce((sum, t) => sum + t.solAmount, 0),
      buyVolume: buys.reduce((sum, t) => sum + t.solAmount, 0),
      sellVolume: sells.reduce((sum, t) => sum + t.solAmount, 0),
      txCount: periodTrades.length,
      buyCount: buys.length,
      sellCount: sells.length,
      uniqueTraders: new Set(periodTrades.map((t) => t.traderAddress)).size,
      highPrice: Math.max(...prices, 0),
      lowPrice: Math.min(...prices.filter((p) => p > 0), prices[0] ?? 0),
      openPrice: prices[0] ?? 0,
      closePrice: prices[prices.length - 1] ?? 0,
      newHolders,
      lostHolders: 0,
    };

    // Inline upsert logic to avoid TS2589 with runMutation
    const existing = await ctx.db
      .query("tokenStatsRollup")
      .withIndex("by_period", (q) => q.eq("period", rollupData.period))
      .filter((q) => q.eq(q.field("periodStart"), rollupData.periodStart))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        closePrice: rollupData.closePrice,
        highPrice: Math.max(existing.highPrice, rollupData.highPrice),
        lowPrice: Math.min(existing.lowPrice, rollupData.lowPrice),
        volume: rollupData.volume,
        buyVolume: rollupData.buyVolume,
        sellVolume: rollupData.sellVolume,
        txCount: rollupData.txCount,
        buyCount: rollupData.buyCount,
        sellCount: rollupData.sellCount,
        uniqueTraders: rollupData.uniqueTraders,
        newHolders: rollupData.newHolders,
        lostHolders: rollupData.lostHolders,
      });
    } else {
      await ctx.db.insert("tokenStatsRollup", rollupData);
    }

    return { success: true, ...rollupData };
  },
});
