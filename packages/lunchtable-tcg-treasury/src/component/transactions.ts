import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const transactionTypeValidator = v.union(
  v.literal("fee_received"),
  v.literal("distribution"),
  v.literal("liquidity_add"),
  v.literal("liquidity_remove"),
  v.literal("transfer_internal"),
  v.literal("transfer_external")
);

const transactionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("confirmed"),
  v.literal("failed")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Record a new transaction.
 */
export const recordTransaction = mutation({
  args: {
    walletId: v.id("treasuryWallets"),
    type: transactionTypeValidator,
    amount: v.number(),
    tokenMint: v.string(),
    signature: v.optional(v.string()),
    status: v.optional(transactionStatusValidator),
    metadata: v.optional(v.any()),
    initiatedBy: v.optional(v.string()),
    approvedBy: v.optional(v.array(v.string())),
  },
  returns: v.id("treasuryTransactions"),
  handler: async (ctx, args) => {
    const transactionId = await ctx.db.insert("treasuryTransactions", {
      walletId: args.walletId,
      type: args.type,
      amount: args.amount,
      tokenMint: args.tokenMint,
      signature: args.signature,
      status: args.status ?? "pending",
      metadata: args.metadata,
      initiatedBy: args.initiatedBy,
      approvedBy: args.approvedBy,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

/**
 * Mark a transaction as confirmed.
 */
export const confirmTransaction = mutation({
  args: {
    transactionId: v.id("treasuryTransactions"),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "confirmed",
      signature: args.signature,
      confirmedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Mark a transaction as failed.
 */
export const failTransaction = mutation({
  args: {
    transactionId: v.id("treasuryTransactions"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "failed",
      errorMessage: args.errorMessage,
    });

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get transactions, optionally filtered by wallet, status, or type.
 */
export const getTransactions = query({
  args: {
    walletId: v.optional(v.id("treasuryWallets")),
    status: v.optional(transactionStatusValidator),
    type: v.optional(transactionTypeValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.walletId) {
      return await ctx.db.query("treasuryTransactions").withIndex("by_wallet", (q) =>
        q.eq("walletId", args.walletId!)
      ).order("desc").take(limit);
    }
    if (args.status) {
      return await ctx.db.query("treasuryTransactions").withIndex("by_status", (q) =>
        q.eq("status", args.status!)
      ).order("desc").take(limit);
    }
    if (args.type) {
      return await ctx.db.query("treasuryTransactions").withIndex("by_type", (q) =>
        q.eq("type", args.type!)
      ).order("desc").take(limit);
    }
    return await ctx.db.query("treasuryTransactions").order("desc").take(limit);
  },
});

/**
 * Get a transaction by signature.
 */
export const getTransactionBySignature = query({
  args: {
    signature: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("treasuryTransactions")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();

    return transaction;
  },
});
