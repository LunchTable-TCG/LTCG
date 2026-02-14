import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { query, mutation } from "./_generated/server.js";

export const recordTransaction = mutation({
  args: {
    userId: v.string(),
    transactionType: literals("marketplace_purchase", "marketplace_sale", "platform_fee", "battle_pass_purchase", "gem_purchase"),
    amount: v.number(),
    signature: v.optional(v.string()),
    status: literals("pending", "confirmed", "failed"),
    referenceId: v.optional(v.string()),
    description: v.string(),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  },
  returns: v.id("tokenTransactions"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tokenTransactions", args);
    return id;
  },
});

export const getTransactions = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const transactions = await ctx.db
      .query("tokenTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    return transactions;
  },
});

export const getTransactionBySignature = query({
  args: { signature: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("tokenTransactions")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();
    return transaction;
  },
});

export const confirmTransaction = mutation({
  args: {
    transactionId: v.id("tokenTransactions"),
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

export const createPendingPurchase = mutation({
  args: {
    buyerId: v.string(),
    listingId: v.optional(v.string()),
    battlePassId: v.optional(v.string()),
    purchaseType: v.optional(literals("marketplace", "battle_pass")),
    amount: v.number(),
    buyerWallet: v.string(),
    sellerWallet: v.string(),
    status: literals("awaiting_signature", "submitted", "confirmed", "failed", "expired"),
    transactionSignature: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  returns: v.id("pendingTokenPurchases"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("pendingTokenPurchases", args);
    return id;
  },
});

export const updatePurchaseStatus = mutation({
  args: {
    purchaseId: v.id("pendingTokenPurchases"),
    status: literals("awaiting_signature", "submitted", "confirmed", "failed", "expired"),
    transactionSignature: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { purchaseId, status, transactionSignature } = args;
    await ctx.db.patch(purchaseId, {
      status,
      ...(transactionSignature && { transactionSignature }),
    });
    return null;
  },
});
