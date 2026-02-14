import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// SHARED HELPERS
// ============================================================================

const transactionTypeValidator = v.union(
  v.literal("purchase"),
  v.literal("reward"),
  v.literal("sale"),
  v.literal("gift"),
  v.literal("refund"),
  v.literal("admin_refund"),
  v.literal("conversion"),
  v.literal("marketplace_fee"),
  v.literal("auction_bid"),
  v.literal("auction_refund"),
  v.literal("wager"),
  v.literal("wager_payout"),
  v.literal("wager_refund"),
  v.literal("tournament_entry"),
  v.literal("tournament_refund"),
  v.literal("tournament_prize")
);

const currencyTypeValidator = v.union(v.literal("gold"), v.literal("gems"));

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Initialize player currency with welcome bonus.
 * Called during signup from the host app.
 */
export const initializePlayerCurrency = mutation({
  args: {
    userId: v.string(),
    welcomeBonus: v.object({
      gold: v.number(),
      gems: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) return null;

    const { gold, gems } = args.welcomeBonus;

    await ctx.db.insert("playerCurrency", {
      userId: args.userId,
      gold,
      gems,
      lifetimeGoldEarned: gold,
      lifetimeGoldSpent: 0,
      lifetimeGemsEarned: gems,
      lifetimeGemsSpent: 0,
      lastUpdatedAt: Date.now(),
    });

    if (gold > 0) {
      await ctx.db.insert("currencyTransactions", {
        userId: args.userId,
        transactionType: "gift",
        currencyType: "gold",
        amount: gold,
        balanceAfter: gold,
        description: "Welcome bonus",
        createdAt: Date.now(),
      });
    }

    if (gems > 0) {
      await ctx.db.insert("currencyTransactions", {
        userId: args.userId,
        transactionType: "gift",
        currencyType: "gems",
        amount: gems,
        balanceAfter: gems,
        description: "Welcome bonus",
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Adjust player currency atomically.
 * Handles balance validation, lifetime stats, and transaction recording.
 */
export const adjustPlayerCurrency = mutation({
  args: {
    userId: v.string(),
    transactionType: transactionTypeValidator,
    currencyType: currencyTypeValidator,
    amount: v.number(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    gold: v.number(),
    gems: v.number(),
  }),
  handler: async (ctx, args) => {
    let currency = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!currency) {
      const id = await ctx.db.insert("playerCurrency", {
        userId: args.userId,
        gold: 0,
        gems: 0,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
      currency = (await ctx.db.get(id))!;
    }

    const isGold = args.currencyType === "gold";
    const currentBalance = isGold ? currency.gold : currency.gems;
    const newBalance = currentBalance + args.amount;

    if (newBalance < 0) {
      throw new Error(
        `Insufficient ${args.currencyType}: have ${currentBalance}, need ${-args.amount}`
      );
    }

    const patch: Record<string, number> = {
      lastUpdatedAt: Date.now(),
    };

    if (isGold) {
      patch.gold = newBalance;
      if (args.amount > 0) patch.lifetimeGoldEarned = currency.lifetimeGoldEarned + args.amount;
      if (args.amount < 0) patch.lifetimeGoldSpent = currency.lifetimeGoldSpent + Math.abs(args.amount);
    } else {
      patch.gems = newBalance;
      if (args.amount > 0) patch.lifetimeGemsEarned = currency.lifetimeGemsEarned + args.amount;
      if (args.amount < 0) patch.lifetimeGemsSpent = currency.lifetimeGemsSpent + Math.abs(args.amount);
    }

    await ctx.db.patch(currency._id, patch);

    await ctx.db.insert("currencyTransactions", {
      userId: args.userId,
      transactionType: args.transactionType,
      currencyType: args.currencyType,
      amount: args.amount,
      balanceAfter: newBalance,
      referenceId: args.referenceId,
      description: args.description,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return {
      gold: isGold ? newBalance : currency.gold,
      gems: isGold ? currency.gems : newBalance,
    };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get player's current currency balance.
 */
export const getPlayerBalance = query({
  args: { userId: v.string() },
  returns: v.object({
    gold: v.number(),
    gems: v.number(),
    lifetimeGoldEarned: v.number(),
    lifetimeGoldSpent: v.number(),
    lifetimeGemsEarned: v.number(),
    lifetimeGemsSpent: v.number(),
    lastUpdatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const currency = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!currency) {
      return {
        gold: 0,
        gems: 0,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      };
    }

    return {
      gold: currency.gold,
      gems: currency.gems,
      lifetimeGoldEarned: currency.lifetimeGoldEarned,
      lifetimeGoldSpent: currency.lifetimeGoldSpent,
      lifetimeGemsEarned: currency.lifetimeGemsEarned,
      lifetimeGemsSpent: currency.lifetimeGemsSpent,
      lastUpdatedAt: currency.lastUpdatedAt,
    };
  },
});

/**
 * Get player's transaction history (most recent first).
 */
export const getTransactionHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("currencyTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get player's transaction history with cursor-based pagination.
 */
export const getTransactionHistoryPaginated = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("currencyTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
