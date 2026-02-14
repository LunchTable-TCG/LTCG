import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

const wagerTypeValidator = v.union(v.literal("deposit"), v.literal("payout"), v.literal("treasury_fee"));
const wagerCurrencyValidator = v.union(v.literal("sol"), v.literal("usdc"));
const wagerStatusValidator = v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed"));

export const recordTransaction = mutation({
  args: {
    lobbyId: v.string(),
    userId: v.string(),
    walletAddress: v.string(),
    type: wagerTypeValidator,
    currency: wagerCurrencyValidator,
    amount: v.number(),
    amountAtomic: v.string(),
    escrowPda: v.string(),
    txSignature: v.optional(v.string()),
    status: v.optional(wagerStatusValidator),
  },
  returns: v.id("cryptoWagerTransactions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("cryptoWagerTransactions", {
      ...args,
      status: args.status ?? "pending",
      createdAt: Date.now(),
    });
  },
});

export const getPlayerTransactions = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("cryptoWagerTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

export const getTransactionsByLobby = query({
  args: {
    lobbyId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cryptoWagerTransactions")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .collect();
  },
});

export const getPlayerBalance = query({
  args: {
    userId: v.string(),
    currency: v.optional(wagerCurrencyValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const txns = await ctx.db
      .query("cryptoWagerTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const filtered = args.currency
      ? txns.filter((t) => t.currency === args.currency && t.status === "confirmed")
      : txns.filter((t) => t.status === "confirmed");

    let total = 0;
    for (const t of filtered) {
      if (t.type === "deposit") total -= t.amount;
      else if (t.type === "payout") total += t.amount;
    }
    return { balance: total, transactions: filtered.length };
  },
});

export const getTransactionById = query({
  args: {
    id: v.id("cryptoWagerTransactions"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateTransactionStatus = mutation({
  args: {
    id: v.id("cryptoWagerTransactions"),
    status: wagerStatusValidator,
    txSignature: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.txSignature) updates.txSignature = args.txSignature;
    await ctx.db.patch(args.id, updates);
    return null;
  },
});
