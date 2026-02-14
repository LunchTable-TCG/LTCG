import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server.js";

export const recordGemPurchase = mutation({
  args: {
    userId: v.string(),
    packageId: v.string(),
    gemsReceived: v.number(),
    usdValue: v.number(),
    tokenAmount: v.number(),
    tokenPriceUsd: v.number(),
    solanaSignature: v.string(),
    status: literals("pending", "confirmed", "failed", "expired"),
  },
  returns: v.id("tokenGemPurchases"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("tokenGemPurchases", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getGemPurchases = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("tokenGemPurchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    if (args.limit !== undefined) {
      return purchases.slice(0, args.limit);
    }
    return purchases;
  },
});

export const getGemPurchaseBySignature = query({
  args: {
    signature: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tokenGemPurchases")
      .withIndex("by_signature", (q) => q.eq("solanaSignature", args.signature))
      .first();
  },
});

export const confirmGemPurchase = mutation({
  args: {
    purchaseId: v.id("tokenGemPurchases"),
    confirmedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.purchaseId, {
      status: "confirmed",
      confirmedAt: args.confirmedAt ?? Date.now(),
    });
    return null;
  },
});

export const failGemPurchase = mutation({
  args: {
    purchaseId: v.id("tokenGemPurchases"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.purchaseId, {
      status: "failed",
      failureReason: args.reason,
    });
    return null;
  },
});
