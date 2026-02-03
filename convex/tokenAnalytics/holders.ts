/**
 * Token Holder Management
 *
 * Track and query token holders, balances, and holder statistics.
 */

import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all token holders with pagination
 */
export const getAll = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sortBy: v.optional(
      v.union(v.literal("balance"), v.literal("firstBuy"), v.literal("lastActivity"))
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Get all holders
    const allHolders = await ctx.db.query("tokenHolders").collect();

    // Sort
    const sorted = [...allHolders].sort((a, b) => {
      const field = args.sortBy ?? "balance";
      const order = args.sortOrder ?? "desc";

      let aVal: number;
      let bVal: number;
      if (field === "balance") {
        aVal = a.balance;
        bVal = b.balance;
      } else if (field === "firstBuy") {
        aVal = a.firstPurchaseAt ?? 0;
        bVal = b.firstPurchaseAt ?? 0;
      } else {
        aVal = a.lastActivityAt ?? 0;
        bVal = b.lastActivityAt ?? 0;
      }

      return order === "desc" ? bVal - aVal : aVal - bVal;
    });

    // Paginate
    const paginated = sorted.slice(offset, offset + limit);

    return {
      holders: paginated,
      total: allHolders.length,
      hasMore: offset + limit < allHolders.length,
    };
  },
});

/**
 * Get top holders
 */
export const getTop = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const holders = await ctx.db.query("tokenHolders").collect();

    // Sort by balance descending
    const sorted = [...holders].sort((a, b) => b.balance - a.balance);

    return sorted.slice(0, args.limit ?? 10);
  },
});

/**
 * Get holder by address
 */
export const getByAddress = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("tokenHolders")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
  },
});

/**
 * Get holder distribution statistics
 */
export const getDistribution = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const holders = await ctx.db.query("tokenHolders").collect();

    if (holders.length === 0) {
      return {
        totalHolders: 0,
        totalSupplyHeld: 0,
        distribution: [],
        topHoldersPercentage: 0,
      };
    }

    // Calculate total supply held
    const totalSupplyHeld = holders.reduce((sum, h) => sum + h.balance, 0);

    // Sort by balance
    const sorted = [...holders].sort((a, b) => b.balance - a.balance);

    // Calculate distribution buckets
    const buckets = [
      { label: "Whales (>1%)", min: totalSupplyHeld * 0.01, count: 0, totalBalance: 0 },
      {
        label: "Large (0.1-1%)",
        min: totalSupplyHeld * 0.001,
        max: totalSupplyHeld * 0.01,
        count: 0,
        totalBalance: 0,
      },
      {
        label: "Medium (0.01-0.1%)",
        min: totalSupplyHeld * 0.0001,
        max: totalSupplyHeld * 0.001,
        count: 0,
        totalBalance: 0,
      },
      { label: "Small (<0.01%)", max: totalSupplyHeld * 0.0001, count: 0, totalBalance: 0 },
    ];

    for (const holder of holders) {
      for (const bucket of buckets) {
        const min = bucket.min ?? 0;
        const max = bucket.max ?? Number.POSITIVE_INFINITY;
        if (holder.balance >= min && holder.balance < max) {
          bucket.count++;
          bucket.totalBalance += holder.balance;
          break;
        }
      }
    }

    // Top 10 holders percentage
    const top10Balance = sorted.slice(0, 10).reduce((sum, h) => sum + h.balance, 0);
    const topHoldersPercentage = totalSupplyHeld > 0 ? (top10Balance / totalSupplyHeld) * 100 : 0;

    return {
      totalHolders: holders.length,
      totalSupplyHeld,
      distribution: buckets.map((b) => ({
        label: b.label,
        count: b.count,
        percentage: totalSupplyHeld > 0 ? (b.totalBalance / totalSupplyHeld) * 100 : 0,
      })),
      topHoldersPercentage,
    };
  },
});

/**
 * Get holder growth over time
 */
export const getGrowth = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const holders = await ctx.db.query("tokenHolders").collect();

    // Group by day
    const dayMs = 24 * 60 * 60 * 1000;
    const buckets = new Map<number, number>();

    // Initialize buckets for each day
    for (let i = 0; i <= days; i++) {
      const dayStart = Math.floor((Date.now() - i * dayMs) / dayMs) * dayMs;
      buckets.set(dayStart, 0);
    }

    // Count holders by first purchase date
    for (const holder of holders) {
      if (holder.firstPurchaseAt && holder.firstPurchaseAt >= since) {
        const dayStart = Math.floor(holder.firstPurchaseAt / dayMs) * dayMs;
        const existing = buckets.get(dayStart) ?? 0;
        buckets.set(dayStart, existing + 1);
      }
    }

    // Convert to cumulative and sorted array
    const sorted = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
    let cumulative = holders.filter((h) => !h.firstPurchaseAt || h.firstPurchaseAt < since).length;

    return sorted.map(([timestamp, newHolders]) => {
      cumulative += newHolders;
      return {
        timestamp,
        newHolders,
        totalHolders: cumulative,
      };
    });
  },
});

// =============================================================================
// Internal Mutations (called by webhooks/actions)
// =============================================================================

/**
 * Upsert holder record
 */
export const upsert = internalMutation({
  args: {
    address: v.string(),
    balance: v.number(),
    percentOwnership: v.optional(v.number()),
    isNew: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tokenHolders")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: args.balance,
        percentOwnership: args.percentOwnership ?? existing.percentOwnership,
        lastActivityAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("tokenHolders", {
      address: args.address,
      balance: args.balance,
      percentOwnership: args.percentOwnership ?? 0,
      firstPurchaseAt: now,
      lastActivityAt: now,
      totalBought: args.balance,
      totalSold: 0,
      isPlatformWallet: false,
    });
  },
});

/**
 * Remove holder (balance went to 0)
 */
export const remove = internalMutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tokenHolders")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { deleted: true };
    }
    return { deleted: false };
  },
});

/**
 * Batch upsert holders (for backfill)
 */
export const batchUpsert = internalMutation({
  args: {
    holders: v.array(
      v.object({
        address: v.string(),
        balance: v.number(),
        percentOwnership: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let updated = 0;
    let created = 0;
    const now = Date.now();

    for (const holder of args.holders) {
      const existing = await ctx.db
        .query("tokenHolders")
        .withIndex("by_address", (q) => q.eq("address", holder.address))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          balance: holder.balance,
          percentOwnership: holder.percentOwnership ?? existing.percentOwnership,
          lastActivityAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("tokenHolders", {
          address: holder.address,
          balance: holder.balance,
          percentOwnership: holder.percentOwnership ?? 0,
          firstPurchaseAt: now,
          lastActivityAt: now,
          totalBought: holder.balance,
          totalSold: 0,
          isPlatformWallet: false,
        });
        created++;
      }
    }

    return { updated, created };
  },
});
