import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server.js";

export const recordX402Payment = mutation({
  args: {
    transactionSignature: v.string(),
    payerWallet: v.string(),
    recipientWallet: v.string(),
    amount: v.number(),
    tokenMint: v.string(),
    network: v.string(),
    resourcePath: v.string(),
    resourceDescription: v.string(),
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    purchaseType: v.optional(literals("gems", "pack", "box", "other")),
    purchaseId: v.optional(v.string()),
    verifiedAt: v.number(),
    facilitatorResponse: v.optional(v.string()),
    status: literals("verified", "settled", "failed"),
    errorMessage: v.optional(v.string()),
  },
  returns: v.id("x402Payments"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("x402Payments", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getX402Payments = query({
  args: {
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.userId !== undefined) {
      const payments = await ctx.db
        .query("x402Payments")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();
      if (args.limit !== undefined) {
        return payments.slice(0, args.limit);
      }
      return payments;
    }

    if (args.agentId !== undefined) {
      const payments = await ctx.db
        .query("x402Payments")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
        .order("desc")
        .collect();
      if (args.limit !== undefined) {
        return payments.slice(0, args.limit);
      }
      return payments;
    }

    const payments = await ctx.db.query("x402Payments").order("desc").collect();
    if (args.limit !== undefined) {
      return payments.slice(0, args.limit);
    }
    return payments;
  },
});

export const getX402PaymentBySignature = query({
  args: {
    signature: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("x402Payments")
      .withIndex("by_signature", (q) =>
        q.eq("transactionSignature", args.signature)
      )
      .first();
  },
});

export const updateX402Status = mutation({
  args: {
    paymentId: v.id("x402Payments"),
    status: literals("verified", "settled", "failed"),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      status: args.status,
      errorMessage: args.errorMessage,
    });
    return null;
  },
});
