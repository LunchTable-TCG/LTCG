/**
 * Admin Revenue Analytics
 *
 * Aggregation queries for revenue dashboards. Provides real-time metrics
 * on pack sales, gem purchases, currency circulation, and spending patterns.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// ============================================================================
// OVERVIEW METRICS
// ============================================================================

/**
 * Get revenue overview with totals by time period
 */
export const getRevenueOverview = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get pack opening history for revenue calculation
    const packHistory = await ctx.db.query("packOpeningHistory").collect();

    // Get gem purchases for token revenue
    const gemPurchases = await ctx.db
      .query("tokenGemPurchases")
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    // Calculate pack revenue by time period
    const packRevenueToday = packHistory
      .filter((p) => p.openedAt >= oneDayAgo)
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const packRevenueWeek = packHistory
      .filter((p) => p.openedAt >= oneWeekAgo)
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const packRevenueMonth = packHistory
      .filter((p) => p.openedAt >= oneMonthAgo)
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const packRevenueAllTime = packHistory.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    // Calculate gem purchase revenue (USD value)
    const gemRevenueToday = gemPurchases
      .filter((p) => (p.confirmedAt || 0) >= oneDayAgo)
      .reduce((sum, p) => sum + (p.usdValue || 0), 0);

    const gemRevenueWeek = gemPurchases
      .filter((p) => (p.confirmedAt || 0) >= oneWeekAgo)
      .reduce((sum, p) => sum + (p.usdValue || 0), 0);

    const gemRevenueMonth = gemPurchases
      .filter((p) => (p.confirmedAt || 0) >= oneMonthAgo)
      .reduce((sum, p) => sum + (p.usdValue || 0), 0);

    const gemRevenueAllTime = gemPurchases.reduce((sum, p) => sum + (p.usdValue || 0), 0);

    // Count unique spenders
    const uniqueSpendersToday = new Set([
      ...packHistory.filter((p) => p.openedAt >= oneDayAgo).map((p) => p.userId),
      ...gemPurchases.filter((p) => (p.confirmedAt || 0) >= oneDayAgo).map((p) => p.userId),
    ]).size;

    const uniqueSpendersWeek = new Set([
      ...packHistory.filter((p) => p.openedAt >= oneWeekAgo).map((p) => p.userId),
      ...gemPurchases.filter((p) => (p.confirmedAt || 0) >= oneWeekAgo).map((p) => p.userId),
    ]).size;

    return {
      packs: {
        today: packRevenueToday,
        week: packRevenueWeek,
        month: packRevenueMonth,
        allTime: packRevenueAllTime,
      },
      gems: {
        today: gemRevenueToday,
        week: gemRevenueWeek,
        month: gemRevenueMonth,
        allTime: gemRevenueAllTime,
      },
      combined: {
        today: packRevenueToday + gemRevenueToday,
        week: packRevenueWeek + gemRevenueWeek,
        month: packRevenueMonth + gemRevenueMonth,
        allTime: packRevenueAllTime + gemRevenueAllTime,
      },
      spenders: {
        today: uniqueSpendersToday,
        week: uniqueSpendersWeek,
      },
      packCount: {
        today: packHistory.filter((p) => p.openedAt >= oneDayAgo).length,
        week: packHistory.filter((p) => p.openedAt >= oneWeekAgo).length,
        month: packHistory.filter((p) => p.openedAt >= oneMonthAgo).length,
        allTime: packHistory.length,
      },
    };
  },
});

/**
 * Get revenue trend for charts (daily data for past 30 days)
 */
export const getRevenueTrend = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const days = args.days ?? 30;
    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    // Get all pack history in time range
    const packHistory = await ctx.db
      .query("packOpeningHistory")
      .filter((q) => q.gte(q.field("openedAt"), startTime))
      .collect();

    // Get gem purchases in time range
    const gemPurchases = await ctx.db
      .query("tokenGemPurchases")
      .filter((q) =>
        q.and(q.eq(q.field("status"), "confirmed"), q.gte(q.field("confirmedAt"), startTime))
      )
      .collect();

    // Group by day
    const dailyData: Record<
      string,
      { date: string; packs: number; gems: number; packCount: number; gemCount: number }
    > = {};

    for (let i = 0; i < days; i++) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = now - i * 24 * 60 * 60 * 1000;
      const dateKey = new Date(dayStart).toISOString().split("T")[0] ?? "";

      const dayPacks = packHistory.filter((p) => p.openedAt >= dayStart && p.openedAt < dayEnd);
      const dayGems = gemPurchases.filter(
        (p) => (p.confirmedAt || 0) >= dayStart && (p.confirmedAt || 0) < dayEnd
      );

      dailyData[dateKey] = {
        date: dateKey,
        packs: dayPacks.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
        gems: dayGems.reduce((sum, p) => sum + (p.usdValue || 0), 0),
        packCount: dayPacks.length,
        gemCount: dayGems.length,
      };
    }

    // Convert to array sorted by date
    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  },
});

// ============================================================================
// PACK ANALYTICS
// ============================================================================

/**
 * Get pack sales breakdown by product type
 */
export const getPackSalesBreakdown = query({
  args: {
    period: v.optional(
      v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("all"))
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const period = args.period ?? "month";
    const now = Date.now();
    const startTime =
      period === "day"
        ? now - 24 * 60 * 60 * 1000
        : period === "week"
          ? now - 7 * 24 * 60 * 60 * 1000
          : period === "month"
            ? now - 30 * 24 * 60 * 60 * 1000
            : 0;

    const packHistory = await ctx.db
      .query("packOpeningHistory")
      .filter((q) => q.gte(q.field("openedAt"), startTime))
      .collect();

    // Group by pack type
    const byPackType: Record<
      string,
      { packType: string; count: number; goldRevenue: number; gemRevenue: number }
    > = {};

    for (const pack of packHistory) {
      const key = pack.packType;
      if (!byPackType[key]) {
        byPackType[key] = { packType: key, count: 0, goldRevenue: 0, gemRevenue: 0 };
      }
      byPackType[key].count++;
      if (pack.currencyUsed === "gold") {
        byPackType[key].goldRevenue += pack.amountPaid || 0;
      } else {
        byPackType[key].gemRevenue += pack.amountPaid || 0;
      }
    }

    return Object.values(byPackType).sort((a, b) => b.count - a.count);
  },
});

// ============================================================================
// GEM PURCHASE ANALYTICS
// ============================================================================

/**
 * Get gem purchase metrics
 */
export const getGemPurchaseMetrics = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get all gem purchases
    const allPurchases = await ctx.db.query("tokenGemPurchases").collect();
    const confirmed = allPurchases.filter((p) => p.status === "confirmed");
    const pending = allPurchases.filter((p) => p.status === "pending");
    const failed = allPurchases.filter((p) => p.status === "failed");

    // Calculate metrics
    const totalUsdVolume = confirmed.reduce((sum, p) => sum + (p.usdValue || 0), 0);
    const totalTokenVolume = confirmed.reduce((sum, p) => sum + (p.tokenAmount || 0), 0);
    const totalGemsGranted = confirmed.reduce((sum, p) => sum + (p.gemsReceived || 0), 0);

    const todayConfirmed = confirmed.filter((p) => (p.confirmedAt || 0) >= oneDayAgo);
    const weekConfirmed = confirmed.filter((p) => (p.confirmedAt || 0) >= oneWeekAgo);

    // Average purchase size
    const avgPurchaseUsd = confirmed.length > 0 ? totalUsdVolume / confirmed.length : 0;
    const avgGemsPerPurchase = confirmed.length > 0 ? totalGemsGranted / confirmed.length : 0;

    // Package popularity
    const byPackage: Record<string, number> = {};
    for (const p of confirmed) {
      byPackage[p.packageId] = (byPackage[p.packageId] || 0) + 1;
    }

    return {
      totals: {
        usdVolume: totalUsdVolume,
        tokenVolume: totalTokenVolume,
        gemsGranted: totalGemsGranted,
        purchases: confirmed.length,
      },
      today: {
        usdVolume: todayConfirmed.reduce((sum, p) => sum + (p.usdValue || 0), 0),
        purchases: todayConfirmed.length,
      },
      week: {
        usdVolume: weekConfirmed.reduce((sum, p) => sum + (p.usdValue || 0), 0),
        purchases: weekConfirmed.length,
      },
      averages: {
        usdPerPurchase: avgPurchaseUsd,
        gemsPerPurchase: avgGemsPerPurchase,
      },
      status: {
        confirmed: confirmed.length,
        pending: pending.length,
        failed: failed.length,
        conversionRate:
          allPurchases.length > 0 ? (confirmed.length / allPurchases.length) * 100 : 0,
      },
      byPackage: Object.entries(byPackage)
        .map(([packageId, count]) => ({ packageId, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

// ============================================================================
// SPENDING ANALYTICS
// ============================================================================

/**
 * Get top spenders leaderboard
 */
export const getTopSpenders = query({
  args: {
    limit: v.optional(v.number()),
    period: v.optional(
      v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("all"))
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 20;
    const period = args.period ?? "month";
    const now = Date.now();
    const startTime =
      period === "day"
        ? now - 24 * 60 * 60 * 1000
        : period === "week"
          ? now - 7 * 24 * 60 * 60 * 1000
          : period === "month"
            ? now - 30 * 24 * 60 * 60 * 1000
            : 0;

    // Get pack purchases
    const packHistory = await ctx.db
      .query("packOpeningHistory")
      .filter((q) => q.gte(q.field("openedAt"), startTime))
      .collect();

    // Get gem purchases
    const gemPurchases = await ctx.db
      .query("tokenGemPurchases")
      .filter((q) =>
        q.and(q.eq(q.field("status"), "confirmed"), q.gte(q.field("confirmedAt"), startTime))
      )
      .collect();

    // Aggregate by user
    const userSpending: Record<
      string,
      { packSpend: number; gemSpend: number; packCount: number; gemCount: number }
    > = {};

    for (const pack of packHistory) {
      const key = pack.userId;
      if (!userSpending[key]) {
        userSpending[key] = { packSpend: 0, gemSpend: 0, packCount: 0, gemCount: 0 };
      }
      userSpending[key].packSpend += pack.amountPaid || 0;
      userSpending[key].packCount++;
    }

    for (const gem of gemPurchases) {
      const key = gem.userId;
      if (!userSpending[key]) {
        userSpending[key] = { packSpend: 0, gemSpend: 0, packCount: 0, gemCount: 0 };
      }
      userSpending[key].gemSpend += gem.usdValue || 0;
      userSpending[key].gemCount++;
    }

    // Sort by total spending and take top N
    const sorted = Object.entries(userSpending)
      .map(([id, data]) => ({
        usedId: id,
        totalSpend: data.packSpend + data.gemSpend,
        ...data,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit);

    // Fetch usernames - cast to Id<"users"> since we know these are user IDs from packOpeningHistory/tokenGemPurchases
    const userIds = sorted.map((s) => s.usedId as Id<"users">);
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users
        .filter((u): u is Doc<"users"> => u !== null)
        .map((u) => [u._id.toString(), u.username || u.name || "Unknown"])
    );

    return sorted.map((s) => ({
      ...s,
      username: userMap.get(s.usedId) || "Unknown",
    }));
  },
});

// ============================================================================
// CURRENCY CIRCULATION
// ============================================================================

/**
 * Get currency circulation stats
 */
export const getCurrencyCirculation = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Get all currency balances from playerCurrency (single source of truth)
    const currencies = await ctx.db.query("playerCurrency").collect();

    const totalGold = currencies.reduce((sum, c) => sum + (c.gold || 0), 0);
    const totalGems = currencies.reduce((sum, c) => sum + (c.gems || 0), 0);

    const usersWithGold = currencies.filter((c) => (c.gold || 0) > 0).length;
    const usersWithGems = currencies.filter((c) => (c.gems || 0) > 0).length;

    const avgGold = currencies.length > 0 ? totalGold / currencies.length : 0;
    const avgGems = currencies.length > 0 ? totalGems / currencies.length : 0;

    // Get recent transactions for flow analysis
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentTransactions = await ctx.db
      .query("currencyTransactions")
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();

    // Filter by currency type and amount direction (positive = inflow, negative = outflow)
    const goldInflow = recentTransactions
      .filter((t) => t.currencyType === "gold" && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const goldOutflow = recentTransactions
      .filter((t) => t.currencyType === "gold" && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const gemsInflow = recentTransactions
      .filter((t) => t.currencyType === "gems" && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const gemsOutflow = recentTransactions
      .filter((t) => t.currencyType === "gems" && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      gold: {
        total: totalGold,
        holders: usersWithGold,
        average: avgGold,
        inflowToday: goldInflow,
        outflowToday: goldOutflow,
        netFlowToday: goldInflow - goldOutflow,
      },
      gems: {
        total: totalGems,
        holders: usersWithGems,
        average: avgGems,
        inflowToday: gemsInflow,
        outflowToday: gemsOutflow,
        netFlowToday: gemsInflow - gemsOutflow,
      },
      totalUsers: currencies.length,
    };
  },
});

// ============================================================================
// RECENT TRANSACTIONS
// ============================================================================

/**
 * Get recent large purchases for monitoring
 */
export const getRecentLargePurchases = query({
  args: {
    limit: v.optional(v.number()),
    minAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 50;
    const minAmount = args.minAmount ?? 1000; // Default: purchases over 1000 currency

    // Get pack history sorted by amount
    const packHistory = await ctx.db.query("packOpeningHistory").order("desc").take(500);

    const largePacks = packHistory.filter((p) => (p.amountPaid || 0) >= minAmount).slice(0, limit);

    // Fetch usernames
    const userIds = [...new Set(largePacks.map((p) => p.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users
        .filter((u): u is Doc<"users"> => u !== null)
        .map((u) => [u._id.toString(), u.username || u.name || "Unknown"])
    );

    return largePacks.map((p) => ({
      ...p,
      username: userMap.get(p.userId.toString()) || "Unknown",
    }));
  },
});
