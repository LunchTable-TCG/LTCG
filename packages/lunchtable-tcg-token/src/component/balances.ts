import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

export const getBalance = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("tokenBalanceCache")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return balance;
  },
});

export const getBalanceByWallet = query({
  args: { walletAddress: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("tokenBalanceCache")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();
    return balance;
  },
});

export const updateBalance = mutation({
  args: {
    userId: v.string(),
    walletAddress: v.string(),
    tokenMint: v.string(),
    balance: v.number(),
    lastVerifiedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tokenBalanceCache")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        walletAddress: args.walletAddress,
        tokenMint: args.tokenMint,
        balance: args.balance,
        lastVerifiedAt: args.lastVerifiedAt,
      });
    } else {
      await ctx.db.insert("tokenBalanceCache", {
        userId: args.userId,
        walletAddress: args.walletAddress,
        tokenMint: args.tokenMint,
        balance: args.balance,
        lastVerifiedAt: args.lastVerifiedAt,
      });
    }

    return null;
  },
});
