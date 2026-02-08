/**
 * User wallet management mutations for LTCG token integration
 *
 * Manages the connection between user accounts and their blockchain wallets
 * (either Privy embedded wallets or external wallets like Phantom/Solflare).
 *
 * This is separate from agent HD wallets - these are the user's primary
 * trading/payment wallets for marketplace token transactions.
 */

import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { getCurrentUser, requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

/**
 * Wallet type validator for reuse
 */
const walletTypeValidator = v.union(v.literal("privy_embedded"), v.literal("external"));

/**
 * Save a connected wallet to the authenticated user's record
 *
 * Called when a user connects their Privy embedded wallet or an external wallet.
 * Updates the wallet address, type, and connection timestamp.
 */
export const saveConnectedWallet = mutation({
  args: {
    walletAddress: v.string(),
    walletType: walletTypeValidator,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    // Validate wallet address format (Solana addresses are base58, 32-44 chars)
    if (!args.walletAddress || args.walletAddress.length < 32 || args.walletAddress.length > 44) {
      throw createError(ErrorCode.VALIDATION_INVALID_FORMAT, {
        reason: "Invalid wallet address format",
      });
    }

    // Check if this wallet is already connected to another user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("walletAddress", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (existingUser && existingUser._id !== auth.userId) {
      throw createError(ErrorCode.ECONOMY_WALLET_VERIFICATION_FAILED, {
        reason: "This wallet is already connected to another account",
      });
    }

    // Update the user's wallet fields
    await ctx.db.patch(auth.userId, {
      walletAddress: args.walletAddress,
      walletType: args.walletType,
      walletConnectedAt: Date.now(),
    });

    // Silently trigger ElizaOS token check for hidden achievement
    // This runs in the background and doesn't block the wallet connection
    await ctx.scheduler.runAfter(0, internalAny.economy.elizaOSMonitor.checkOnWalletConnect, {
      userId: auth.userId,
      walletAddress: args.walletAddress,
    });

    return true;
  },
});

/**
 * Get the authenticated user's connected wallet information
 *
 * Returns wallet details if connected, or null if no wallet is connected.
 */
export const getUserWallet = query({
  args: {},
  returns: v.union(
    v.object({
      walletAddress: v.string(),
      walletType: walletTypeValidator,
      walletConnectedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const auth = await getCurrentUser(ctx);
    if (!auth) {
      return null;
    }

    const user = await ctx.db.get(auth.userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    // Return null if no wallet is connected
    if (!user.walletAddress || !user.walletType || !user.walletConnectedAt) {
      return null;
    }

    return {
      walletAddress: user.walletAddress,
      walletType: user.walletType,
      walletConnectedAt: user.walletConnectedAt,
    };
  },
});

/**
 * Disconnect the wallet from the authenticated user's account
 *
 * Clears all wallet-related fields from the user record.
 * This does NOT affect any on-chain state - only the database link.
 */
export const disconnectWallet = mutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const auth = await requireAuthMutation(ctx);

    const user = await ctx.db.get(auth.userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    // Check if there's actually a wallet to disconnect
    if (!user.walletAddress) {
      throw createError(ErrorCode.ECONOMY_WALLET_NOT_CONNECTED);
    }

    // Clear wallet fields
    await ctx.db.patch(auth.userId, {
      walletAddress: undefined,
      walletType: undefined,
      walletConnectedAt: undefined,
    });

    // Clear stale token balance cache for this user
    const cachedBalances = await ctx.db
      .query("tokenBalanceCache")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();
    await Promise.all(cachedBalances.map((c) => ctx.db.delete(c._id)));

    return true;
  },
});
