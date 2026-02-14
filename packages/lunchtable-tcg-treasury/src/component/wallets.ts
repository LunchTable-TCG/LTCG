import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const purposeValidator = v.union(
  v.literal("fee_collection"),
  v.literal("distribution"),
  v.literal("liquidity"),
  v.literal("reserves")
);

const statusValidator = v.union(
  v.literal("active"),
  v.literal("frozen"),
  v.literal("archived")
);

const creationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("creating"),
  v.literal("active"),
  v.literal("failed")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new treasury wallet.
 */
export const createWallet = mutation({
  args: {
    privyWalletId: v.string(),
    address: v.string(),
    name: v.string(),
    purpose: purposeValidator,
    balance: v.optional(v.number()),
    tokenBalance: v.optional(v.number()),
    policyId: v.optional(v.string()),
    status: v.optional(statusValidator),
    creationStatus: v.optional(creationStatusValidator),
    createdBy: v.optional(v.string()),
  },
  returns: v.id("treasuryWallets"),
  handler: async (ctx, args) => {
    const walletId = await ctx.db.insert("treasuryWallets", {
      privyWalletId: args.privyWalletId,
      address: args.address,
      name: args.name,
      purpose: args.purpose,
      balance: args.balance,
      tokenBalance: args.tokenBalance,
      policyId: args.policyId,
      status: args.status ?? "active",
      creationStatus: args.creationStatus,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return walletId;
  },
});

/**
 * Update wallet details.
 */
export const updateWallet = mutation({
  args: {
    walletId: v.id("treasuryWallets"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.walletId, args.updates);
    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all wallets, optionally filtered by purpose and/or status.
 */
export const getWallets = query({
  args: {
    purpose: v.optional(purposeValidator),
    status: v.optional(statusValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.purpose) {
      return await ctx.db.query("treasuryWallets").withIndex("by_purpose", (q) =>
        q.eq("purpose", args.purpose!)
      ).collect();
    }
    if (args.status) {
      return await ctx.db.query("treasuryWallets").withIndex("by_status", (q) =>
        q.eq("status", args.status!)
      ).collect();
    }
    return await ctx.db.query("treasuryWallets").collect();
  },
});

/**
 * Get a single wallet by ID.
 */
export const getWallet = query({
  args: {
    walletId: v.id("treasuryWallets"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.get(args.walletId);
    return wallet;
  },
});

/**
 * Get a wallet by address.
 */
export const getWalletByAddress = query({
  args: {
    address: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("treasuryWallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    return wallet;
  },
});
