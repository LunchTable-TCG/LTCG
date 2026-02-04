/**
 * Token Marketplace Maintenance
 *
 * Cron-triggered maintenance jobs for the token marketplace system.
 * These jobs run automatically to keep the marketplace healthy.
 *
 * Jobs:
 * - expireStalePurchases: Expires pending purchases that weren't signed in time
 * - refreshActiveBalances: Refreshes token balances for active marketplace users
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";
import { internalMutation } from "../functions";

// Module-scope typed helper to avoid TS2589 "Type instantiation is excessively deep"
// biome-ignore lint/suspicious/noExplicitAny: Convex deep type workaround
const internalAny = internal as any;

// ============================================================================
// INTERNAL MUTATIONS (called by crons)
// ============================================================================

/**
 * Expire stale pending token purchases
 *
 * Finds pending purchases in "awaiting_signature" status where expiresAt has passed,
 * and updates their status to "expired". This prevents purchases from blocking
 * listings indefinitely if the buyer abandons the transaction.
 *
 * Runs every 1 minute via cron.
 *
 * @returns Count of expired purchases
 */
export const expireStalePurchases = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find pending purchases that are awaiting signature and have expired
    const stalePurchases = await ctx.db
      .query("pendingTokenPurchases")
      .withIndex("by_status", (q) => q.eq("status", "awaiting_signature"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Expire each stale purchase
    for (const purchase of stalePurchases) {
      await ctx.db.patch(purchase._id, { status: "expired" });
    }

    if (stalePurchases.length > 0) {
      console.log(`[tokenMaintenance] Expired ${stalePurchases.length} stale token purchases`);
    }

    return { expiredCount: stalePurchases.length };
  },
});

/**
 * Refresh token balances for active marketplace users
 *
 * Finds users who have been active in the token marketplace recently
 * (pending purchases, listings, or completed transactions in last 30 minutes)
 * and refreshes their token balance cache. This keeps balances fresh for
 * active traders without excessive RPC calls.
 *
 * Runs every 5 minutes via cron.
 *
 * @returns Count of users whose balances were refreshed
 */
export const refreshActiveBalances = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const ACTIVE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
    const activeThreshold = now - ACTIVE_WINDOW_MS;

    // Get users with recent pending purchases
    const recentPendingPurchases = await ctx.runQuery(
      internalAny.economy.tokenMaintenance.getRecentPendingPurchaseBuyers,
      { since: activeThreshold }
    );

    // Get users with recent token listings (created or updated)
    const recentListingSellers = await ctx.runQuery(
      internalAny.economy.tokenMaintenance.getRecentTokenListingSellers,
      { since: activeThreshold }
    );

    // Get users with recent token transactions
    const recentTransactionUsers = await ctx.runQuery(
      internalAny.economy.tokenMaintenance.getRecentTokenTransactionUsers,
      { since: activeThreshold }
    );

    // Combine and deduplicate user IDs
    const activeUserIds = new Set([
      ...recentPendingPurchases,
      ...recentListingSellers,
      ...recentTransactionUsers,
    ]);

    // Refresh balance for each active user
    let refreshedCount = 0;
    for (const userId of activeUserIds) {
      try {
        await ctx.runMutation(internalAny.economy.tokenMaintenance.scheduleBalanceRefresh, {
          userId,
        });
        refreshedCount++;
      } catch (error) {
        // Log but don't fail the entire batch
        console.error(`[tokenMaintenance] Failed to refresh balance for user ${userId}:`, error);
      }
    }

    if (refreshedCount > 0) {
      console.log(`[tokenMaintenance] Refreshed balances for ${refreshedCount} active users`);
    }

    return { refreshedCount };
  },
});

// ============================================================================
// INTERNAL QUERIES (helpers for refreshActiveBalances)
// ============================================================================

/**
 * Get user IDs from recent pending purchases
 */
export const getRecentPendingPurchaseBuyers = internalQuery({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    // Get pending purchases created since threshold
    const recentPurchases = await ctx.db
      .query("pendingTokenPurchases")
      .filter((q) => q.gte(q.field("createdAt"), args.since))
      .take(100);

    return [...new Set(recentPurchases.map((p) => p.buyerId))];
  },
});

/**
 * Get user IDs from recent token listings
 */
export const getRecentTokenListingSellers = internalQuery({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    // Get token listings updated since threshold
    const recentListings = await ctx.db
      .query("marketplaceListings")
      .filter((q) =>
        q.and(q.eq(q.field("currencyType"), "token"), q.gte(q.field("updatedAt"), args.since))
      )
      .take(100);

    return [...new Set(recentListings.map((l) => l.sellerId))];
  },
});

/**
 * Get user IDs from recent token transactions
 */
export const getRecentTokenTransactionUsers = internalQuery({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    // Get token transactions created since threshold
    const recentTransactions = await ctx.db
      .query("tokenTransactions")
      .filter((q) => q.gte(q.field("createdAt"), args.since))
      .take(100);

    return [...new Set(recentTransactions.map((t) => t.userId))];
  },
});

/**
 * Schedule a balance refresh for a user (with rate limiting via scheduler)
 */
export const scheduleBalanceRefresh = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user has a wallet before scheduling
    const user = await ctx.db.get(args.userId);
    if (!user?.walletAddress) {
      return { scheduled: false, reason: "no_wallet" };
    }

    // Check if balance was refreshed very recently (within 1 minute) to avoid duplicate work
    const cached = await ctx.db
      .query("tokenBalanceCache")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();
    if (cached && now - cached.lastVerifiedAt < 60000) {
      return { scheduled: false, reason: "recently_refreshed" };
    }

    // Schedule the refresh
    await ctx.scheduler.runAfter(0, internalAny.economy.tokenBalance.refreshTokenBalance, {
      userId: args.userId,
    });

    return { scheduled: true };
  },
});
