/**
 * Token Balance Caching System
 *
 * Provides cached SPL token balance lookups for the LTCG token integration.
 * Balances are cached in Convex and refreshed on-demand to minimize RPC calls.
 *
 * Features:
 * - Cached balance queries with staleness detection
 * - Rate-limited balance refresh to prevent RPC spam
 * - Internal action for Solana RPC queries
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { TOKEN } from "../lib/constants";
import { getCurrentUser, requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { internalAny } from "../lib/internalHelpers";
import { checkRateLimitWrapper } from "../lib/rateLimit";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get the user's cached token balance
 *
 * Returns cached balance data with staleness indicator.
 * Balance is considered stale if older than TOKEN.BALANCE_CACHE_TTL_MS (60 seconds).
 *
 * @returns Cached balance info or null if no wallet connected
 */
export const getTokenBalance = query({
  args: {},
  returns: v.union(
    v.object({
      balance: v.number(),
      lastVerifiedAt: v.number(),
      isStale: v.boolean(),
      walletAddress: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const auth = await getCurrentUser(ctx);
    if (!auth) {
      return null;
    }

    // Look up user's wallet address
    const user = await ctx.db.get(auth.userId);
    if (!user?.walletAddress) {
      return null;
    }

    // Query cached balance
    const cached = await ctx.db
      .query("tokenBalanceCache")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .first();

    if (!cached) {
      return null;
    }

    const now = Date.now();
    const isStale = now - cached.lastVerifiedAt > TOKEN.BALANCE_CACHE_TTL_MS;

    return {
      balance: cached.balance,
      lastVerifiedAt: cached.lastVerifiedAt,
      isStale,
      walletAddress: user.walletAddress,
    };
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Request a balance refresh from the Solana RPC
 *
 * Rate-limited to once per 10 seconds to prevent RPC spam.
 * Schedules an internal action to query the blockchain and update cache.
 *
 * @returns Success boolean indicating if refresh was scheduled
 */
export const requestBalanceRefresh = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Rate limit: once per 10 seconds (6 per minute)
    await checkRateLimitWrapper(ctx, "TOKEN_BALANCE_REFRESH", userId);

    // Verify user has a connected wallet
    const user = await ctx.db.get(userId);
    if (!user?.walletAddress) {
      throw createError(ErrorCode.ECONOMY_WALLET_NOT_CONNECTED);
    }

    // Schedule the refresh action
    await ctx.scheduler.runAfter(0, internalAny.economy.tokenBalance.refreshTokenBalance, {
      userId,
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Cache a token balance record
 *
 * Upserts the balance record in the tokenBalanceCache table.
 * Called by refreshTokenBalance after querying the Solana RPC.
 */
export const cacheTokenBalance = internalMutation({
  args: {
    userId: v.id("users"),
    walletAddress: v.string(),
    tokenMint: v.string(),
    balance: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, walletAddress, tokenMint, balance } = args;
    const now = Date.now();

    // Check for existing record
    const existing = await ctx.db
      .query("tokenBalanceCache")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        walletAddress,
        tokenMint,
        balance,
        lastVerifiedAt: now,
      });
    } else {
      // Insert new record
      await ctx.db.insert("tokenBalanceCache", {
        userId,
        walletAddress,
        tokenMint,
        balance,
        lastVerifiedAt: now,
      });
    }
  },
});

// ============================================================================
// INTERNAL ACTIONS
// ============================================================================

/**
 * Refresh token balance from Solana RPC
 *
 * Fetches the user's wallet address, queries the Solana RPC for current
 * SPL token balance, and caches the result.
 *
 * @returns The new balance or null if user has no wallet
 */
export const refreshTokenBalance = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    // Get user's wallet address
    const user = await ctx.runQuery(internalAny.economy.tokenBalance.getUserWallet, { userId });

    if (!user?.walletAddress) {
      console.warn(`[tokenBalance] User ${userId} has no wallet connected`);
      return null;
    }

    const { walletAddress } = user;
    const tokenMint = TOKEN.MINT_ADDRESS;

    if (!tokenMint) {
      console.error("[tokenBalance] TOKEN.MINT_ADDRESS not configured");
      return null;
    }

    try {
      // Import Solana utilities (created by parallel task)
      // This import may show an error until the parallel task completes
      const { getSPLTokenBalance } = await import("../lib/solana/tokenBalance");

      // Query Solana RPC for current balance
      // getSPLTokenBalance returns TokenBalanceResult { balance, rawBalance, decimals, accountExists }
      const result = await getSPLTokenBalance(walletAddress, tokenMint);

      // Cache the result (extract the numeric balance from the result object)
      await ctx.runMutation(internalAny.economy.tokenBalance.cacheTokenBalance, {
        userId,
        walletAddress,
        tokenMint,
        balance: result.balance,
      });

      return result.balance;
    } catch (error) {
      console.error(`[tokenBalance] Failed to refresh balance for ${walletAddress}:`, error);
      throw error;
    }
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Get user's wallet address (internal query for actions)
 */
export const getUserWallet = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return {
      walletAddress: user.walletAddress ?? null,
    };
  },
});
