/**
 * Token Metrics Management
 *
 * Track and query token metrics including price, market cap,
 * holder count, and bonding curve progress.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { internalMutation } from "../functions";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get latest token metrics
 */
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db.query("tokenMetrics").order("desc").first();
  },
});

/**
 * Get token metrics history
 */
export const getHistory = query({
  args: {
    limit: v.optional(v.number()),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const query_ = ctx.db.query("tokenMetrics").withIndex("by_timestamp").order("desc");
    const metrics = await query_.take(args.limit ?? 100);

    if (args.since) {
      const since = args.since;
      return metrics.filter((m) => m.timestamp >= since);
    }

    return metrics;
  },
});

/**
 * Get bonding curve progress
 */
export const getBondingCurveProgress = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const latest = await ctx.db.query("tokenMetrics").order("desc").first();
    const config = await ctx.db.query("tokenConfig").order("desc").first();

    if (!latest) {
      return {
        currentMarketCap: 0,
        targetMarketCap: config?.targetMarketCap ?? 90000,
        progress: 0,
        liquidity: 0,
        estimatedGraduationTime: null,
      };
    }

    const targetMarketCap = config?.targetMarketCap ?? 90000;
    const progress = latest.bondingCurveProgress ?? 0;

    return {
      currentMarketCap: latest.marketCap,
      targetMarketCap,
      progress,
      liquidity: latest.liquidity,
      estimatedGraduationTime: latest.graduationEta ?? null,
    };
  },
});

/**
 * Get price chart data
 */
export const getPriceChart = query({
  args: {
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d"), v.literal("30d")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();
    const periodMs = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    const since = now - periodMs[args.period];

    const metrics = await ctx.db
      .query("tokenMetrics")
      .withIndex("by_timestamp")
      .order("asc")
      .collect();

    const filtered = metrics.filter((m) => m.timestamp >= since);

    // Determine interval based on period
    const intervalMs =
      args.period === "1h"
        ? 60 * 1000
        : args.period === "24h"
          ? 15 * 60 * 1000
          : args.period === "7d"
            ? 60 * 60 * 1000
            : 4 * 60 * 60 * 1000;

    // Group by interval and take last value
    const buckets = new Map<number, { timestamp: number; priceUsd: number; volume: number }>();

    for (const m of filtered) {
      const bucket = Math.floor(m.timestamp / intervalMs) * intervalMs;
      buckets.set(bucket, {
        timestamp: bucket,
        priceUsd: m.priceUsd,
        volume: m.volume24h ?? 0,
      });
    }

    return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
  },
});

// =============================================================================
// Internal Mutations (called by webhooks/actions)
// =============================================================================

/**
 * Record new token metrics
 */
export const record = internalMutation({
  args: {
    price: v.number(),
    priceUsd: v.number(),
    marketCap: v.number(),
    volume24h: v.optional(v.number()),
    txCount24h: v.optional(v.number()),
    holderCount: v.optional(v.number()),
    liquidity: v.optional(v.number()),
    bondingCurveProgress: v.optional(v.number()),
    graduationEta: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("tokenMetrics", {
      timestamp: Date.now(),
      price: args.price,
      priceUsd: args.priceUsd,
      marketCap: args.marketCap,
      volume24h: args.volume24h ?? 0,
      txCount24h: args.txCount24h ?? 0,
      holderCount: args.holderCount ?? 0,
      liquidity: args.liquidity ?? 0,
      bondingCurveProgress: args.bondingCurveProgress ?? 0,
      graduationEta: args.graduationEta,
    });
  },
});

/**
 * Batch record metrics (for backfill)
 */
export const batchRecord = internalMutation({
  args: {
    metrics: v.array(
      v.object({
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
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const metric of args.metrics) {
      await ctx.db.insert("tokenMetrics", metric);
    }
    return { inserted: args.metrics.length };
  },
});
