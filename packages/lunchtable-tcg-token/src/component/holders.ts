import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

export const upsertHolder = mutation({
  args: {
    address: v.string(),
    balance: v.number(),
    percentOwnership: v.number(),
    firstPurchaseAt: v.number(),
    lastActivityAt: v.number(),
    totalBought: v.number(),
    totalSold: v.number(),
    isPlatformWallet: v.boolean(),
    label: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tokenHolders")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: args.balance,
        percentOwnership: args.percentOwnership,
        lastActivityAt: args.lastActivityAt,
        totalBought: args.totalBought,
        totalSold: args.totalSold,
        isPlatformWallet: args.isPlatformWallet,
        ...(args.label && { label: args.label }),
      });
    } else {
      await ctx.db.insert("tokenHolders", args);
    }

    return null;
  },
});

export const getHolders = query({
  args: {
    limit: v.optional(v.number()),
    platformOnly: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.platformOnly) {
      const holders = await ctx.db
        .query("tokenHolders")
        .withIndex("by_platform", (q) => q.eq("isPlatformWallet", true))
        .order("desc")
        .take(limit);
      return holders;
    }

    const holders = await ctx.db
      .query("tokenHolders")
      .withIndex("by_balance")
      .order("desc")
      .take(limit);
    return holders;
  },
});

export const getHolderByAddress = query({
  args: { address: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const holder = await ctx.db
      .query("tokenHolders")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    return holder;
  },
});
