import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const transactionReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  lobbyId: v.string(),
  userId: v.string(),
  walletAddress: v.string(),
  type: v.union(v.literal("deposit"), v.literal("payout"), v.literal("treasury_fee")),
  currency: v.union(v.literal("sol"), v.literal("usdc")),
  amount: v.number(),
  amountAtomic: v.string(),
  txSignature: v.optional(v.string()),
  escrowPda: v.string(),
  status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
  createdAt: v.number(),
});

export const recordTransaction = mutation({
  args: {
    lobbyId: v.string(), // Reference to parent gameLobbies table
    userId: v.string(), // Reference to parent users table
    walletAddress: v.string(),
    type: v.union(v.literal("deposit"), v.literal("payout"), v.literal("treasury_fee")),
    currency: v.union(v.literal("sol"), v.literal("usdc")),
    amount: v.number(),
    amountAtomic: v.string(),
    escrowPda: v.string(),
    txSignature: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed"))),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("cryptoWagerTransactions", {
      lobbyId: args.lobbyId,
      userId: args.userId,
      walletAddress: args.walletAddress,
      type: args.type,
      currency: args.currency,
      amount: args.amount,
      amountAtomic: args.amountAtomic,
      txSignature: args.txSignature,
      escrowPda: args.escrowPda,
      status: args.status ?? "pending",
      createdAt: Date.now(),
    });
    return id as string;
  },
});

export const getPlayerTransactions = query({
  args: {
    userId: v.string(), // Reference to parent users table
    limit: v.optional(v.number()),
  },
  returns: v.array(transactionReturnValidator),
  handler: async (ctx, args) => {
    const txQuery = ctx.db
      .query("cryptoWagerTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    const transactions = args.limit
      ? await txQuery.take(args.limit)
      : await txQuery.collect();

    return transactions.map((tx) => ({
      ...tx,
      _id: tx._id as string,
      lobbyId: tx.lobbyId,
      userId: tx.userId,
    }));
  },
});

export const getTransactionsByLobby = query({
  args: {
    lobbyId: v.string(), // Reference to parent gameLobbies table
  },
  returns: v.array(transactionReturnValidator),
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("cryptoWagerTransactions")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .collect();

    return transactions.map((tx) => ({
      ...tx,
      _id: tx._id as string,
      lobbyId: tx.lobbyId,
      userId: tx.userId,
    }));
  },
});

export const getPlayerBalance = query({
  args: {
    userId: v.string(), // Reference to parent users table
    currency: v.optional(v.union(v.literal("sol"), v.literal("usdc"))),
  },
  returns: v.object({
    totalWon: v.number(),
    totalLost: v.number(),
    netBalance: v.number(),
    currency: v.optional(v.union(v.literal("sol"), v.literal("usdc"))),
  }),
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("cryptoWagerTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by currency if specified
    const filteredTransactions = args.currency
      ? transactions.filter((tx) => tx.currency === args.currency)
      : transactions;

    let totalWon = 0;
    let totalLost = 0;

    for (const tx of filteredTransactions) {
      // Only count confirmed transactions
      if (tx.status !== "confirmed") continue;

      switch (tx.type) {
        case "payout":
          // Payout is winnings
          totalWon += tx.amount;
          break;
        case "deposit":
          // Deposits are potential losses - we count them as losses
          // since we can't access gameLobbies from component
          // The parent schema should calculate accurate balance
          totalLost += tx.amount;
          break;
        // treasury_fee doesn't affect player balance
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
  args: { id: v.string() }, // Transaction ID as string
  returns: v.union(transactionReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.id as any);
    if (!tx) return null;
    return {
      ...tx,
      _id: tx._id as string,
      lobbyId: tx.lobbyId,
      userId: tx.userId,
    };
  },
});

export const updateTransactionStatus = mutation({
  args: {
    id: v.string(), // Transaction ID as string
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    txSignature: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.txSignature) {
      updates.txSignature = args.txSignature;
    }
    await ctx.db.patch(args.id as any, updates);
    return null;
  },
});
