import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const transactionReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  escrowId: v.string(),
  playerId: v.string(),
  type: v.string(),
  amount: v.number(),
  currency: v.string(),
  txSignature: v.optional(v.string()),
  timestamp: v.number(),
  metadata: v.optional(v.any()),
});

export const recordTransaction = mutation({
  args: {
    escrowId: v.id("escrows"),
    playerId: v.string(),
    type: v.string(),
    amount: v.number(),
    currency: v.string(),
    txSignature: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("wagerTransactions", {
      escrowId: args.escrowId,
      playerId: args.playerId,
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      txSignature: args.txSignature,
      timestamp: Date.now(),
      metadata: args.metadata,
    });
    return id as string;
  },
});

export const getPlayerTransactions = query({
  args: {
    playerId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(transactionReturnValidator),
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("wagerTransactions")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .order("desc");

    const transactions = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    return transactions.map((tx) => ({
      ...tx,
      _id: tx._id as string,
      escrowId: tx.escrowId as string,
    }));
  },
});

export const getTransactionsByGame = query({
  args: {
    gameId: v.string(),
  },
  returns: v.array(transactionReturnValidator),
  handler: async (ctx, args) => {
    // First find the escrow for this game
    const escrow = await ctx.db
      .query("escrows")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!escrow) {
      return [];
    }

    // Get all transactions for this escrow
    const transactions = await ctx.db
      .query("wagerTransactions")
      .withIndex("by_escrow", (q) => q.eq("escrowId", escrow._id))
      .collect();

    return transactions.map((tx) => ({
      ...tx,
      _id: tx._id as string,
      escrowId: tx.escrowId as string,
    }));
  },
});

export const getPlayerBalance = query({
  args: {
    playerId: v.string(),
    currency: v.optional(v.string()),
  },
  returns: v.object({
    totalWon: v.number(),
    totalLost: v.number(),
    netBalance: v.number(),
    currency: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("wagerTransactions")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Filter by currency if specified
    const filteredTransactions = args.currency
      ? transactions.filter((tx) => tx.currency === args.currency)
      : transactions;

    let totalWon = 0;
    let totalLost = 0;

    for (const tx of filteredTransactions) {
      switch (tx.type) {
        case "payout":
          // Payout is the full winnings (original bet + opponent's bet)
          // So net gain is payout minus original deposit
          totalWon += tx.amount;
          break;
        case "deposit":
          // Deposits are losses if the escrow was settled to opponent
          // We'll check this by looking at the escrow
          const escrow = await ctx.db.get(tx.escrowId);
          if (escrow && escrow.status === "settled" && escrow.winnerId !== args.playerId) {
            totalLost += tx.amount;
          }
          break;
        case "forfeit":
          // Forfeits are direct losses
          totalLost += tx.amount;
          break;
        // "refund" transactions don't affect balance (money returned)
      }
    }

    return {
      totalWon,
      totalLost,
      netBalance: totalWon - totalLost,
      currency: args.currency,
    };
  },
});

export const getTransactionById = query({
  args: { id: v.id("wagerTransactions") },
  returns: v.union(transactionReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.id);
    if (!tx) return null;
    return {
      ...tx,
      _id: tx._id as string,
      escrowId: tx.escrowId as string,
    };
  },
});

export const getEscrowTransactions = query({
  args: {
    escrowId: v.id("escrows"),
  },
  returns: v.array(transactionReturnValidator),
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("wagerTransactions")
      .withIndex("by_escrow", (q) => q.eq("escrowId", args.escrowId))
      .collect();

    return transactions.map((tx) => ({
      ...tx,
      _id: tx._id as string,
      escrowId: tx.escrowId as string,
    }));
  },
});
