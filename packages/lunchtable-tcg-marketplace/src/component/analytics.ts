import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const priceHistoryReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  itemId: v.string(),
  price: v.number(),
  currency: v.string(),
  timestamp: v.number(),
  type: v.string(),
  metadata: v.optional(v.any()),
});

const transactionReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  buyerId: v.string(),
  sellerId: v.string(),
  listingId: v.optional(v.string()),
  itemId: v.string(),
  itemType: v.string(),
  amount: v.number(),
  currency: v.string(),
  type: v.string(),
  timestamp: v.number(),
  metadata: v.optional(v.any()),
});

export const recordPrice = mutation({
  args: {
    itemId: v.string(),
    price: v.number(),
    currency: v.string(),
    type: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const priceId = await ctx.db.insert("priceHistory", {
      ...args,
      timestamp: Date.now(),
    });
    return priceId as string;
  },
});

export const getPriceHistory = query({
  args: {
    itemId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(priceHistoryReturnValidator),
  handler: async (ctx, args) => {
    const opts = { itemId: args.itemId };
    let query = ctx.db
      .query("priceHistory")
      .withIndex("by_item", (q) => q.eq("itemId", opts.itemId))
      .order("desc");

    if (args.limit) {
      query = query.take(args.limit);
    }

    const prices = await query.collect();
    return prices.map((price) => ({
      ...price,
      _id: price._id as string,
    }));
  },
});

export const getTransactionHistory = query({
  args: {
    userId: v.string(),
    role: v.optional(v.union(v.literal("buyer"), v.literal("seller"))),
    limit: v.optional(v.number()),
  },
  returns: v.array(transactionReturnValidator),
  handler: async (ctx, args) => {
    let transactions: any[] = [];

    if (!args.role || args.role === "buyer") {
      const buyerTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_buyer", (q) => q.eq("buyerId", args.userId))
        .collect();
      transactions.push(...buyerTransactions);
    }

    if (!args.role || args.role === "seller") {
      const sellerTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_seller", (q) => q.eq("sellerId", args.userId))
        .collect();
      transactions.push(...sellerTransactions);
    }

    // Sort by timestamp descending
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit if specified
    if (args.limit) {
      transactions = transactions.slice(0, args.limit);
    }

    return transactions.map((tx) => ({
      ...tx,
      _id: tx._id as string,
    }));
  },
});

export const getRecentTransactions = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(transactionReturnValidator),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(limit);

    return transactions.map((tx) => ({
      ...tx,
      _id: tx._id as string,
    }));
  },
});
