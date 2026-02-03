/**
 * Internal mutations for non-custodial HD wallet management
 *
 * These manage embedded wallet references for agents.
 * We ONLY store public addresses and Privy IDs - NEVER private keys.
 * Keys are sharded via Shamir's Secret Sharing in Privy's TEE infrastructure.
 *
 * HD Derivation Path (Solana): m/44'/501'/walletIndex/0'
 * - User's main wallet: index 0
 * - Agent wallets: index 1, 2, 3, etc.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Update agent with HD wallet information
 */
export const updateWallet = internalMutation({
  args: {
    agentId: v.id("agents"),
    walletId: v.string(), // Privy wallet ID
    walletAddress: v.string(), // Public Solana address (non-custodial)
    walletChainType: v.string(), // "solana"
    walletIndex: v.optional(v.number()), // HD wallet index
    privyUserId: v.optional(v.string()), // Privy user ID (did:privy:xxx)
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.agentId, {
      walletId: args.walletId,
      walletAddress: args.walletAddress,
      walletChainType: args.walletChainType,
      walletCreatedAt: Date.now(),
      walletStatus: "created" as const,
      walletErrorMessage: undefined,
      ...(args.walletIndex !== undefined && { walletIndex: args.walletIndex }),
      ...(args.privyUserId !== undefined && { privyUserId: args.privyUserId }),
    });

    return { success: true };
  },
});

/**
 * Update agent wallet status when creation fails
 */
export const updateWalletFailed = internalMutation({
  args: {
    agentId: v.id("agents"),
    errorMessage: v.string(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.agentId, {
      walletStatus: "failed" as const,
      walletErrorMessage: args.errorMessage,
    });

    return { success: true };
  },
});

/**
 * Update user's next wallet index after creating an agent wallet
 * This ensures each agent gets a unique HD derivation path
 */
export const incrementUserWalletIndex = internalMutation({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // User's main wallet is index 0, agent wallets start at 1
    const currentIndex = user.nextWalletIndex ?? 1;
    await ctx.db.patch(args.userId, {
      nextWalletIndex: currentIndex + 1,
    });

    return { nextIndex: currentIndex };
  },
});

/**
 * Get user's next available wallet index
 */
export const getUserWalletIndex = internalQuery({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { nextIndex: 1 }; // Default to 1 if user not found
    }
    // User's main wallet is index 0, agent wallets start at 1
    return { nextIndex: user.nextWalletIndex ?? 1 };
  },
});

/**
 * Get user by Privy ID for wallet operations
 */
export const getUserByPrivyId = internalQuery({
  args: {
    privyId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", args.privyId))
      .first();
  },
});

/**
 * Get agent for wallet queries
 */
export const getAgent = internalQuery({
  args: {
    agentId: v.id("agents"),
  },
  async handler(ctx, args) {
    return await ctx.db.get(args.agentId);
  },
});
