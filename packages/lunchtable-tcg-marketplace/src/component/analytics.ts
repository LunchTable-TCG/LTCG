import { v } from "convex/values";
import { query } from "./_generated/server";

// TODO: priceHistory and transactions tables were removed from schema.
// These analytics functions need to be rewritten to work with marketplaceListings only.

const listingSaleReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  cardDefinitionId: v.string(),
  soldFor: v.number(),
  soldAt: v.number(),
  currencyType: v.union(v.literal("gold"), v.literal("token")),
  listingType: v.union(v.literal("fixed"), v.literal("auction")),
  sellerId: v.string(),
  soldTo: v.string(),
});

// Get price history from sold listings
export const getPriceHistory = query({
  args: {
    cardDefinitionId: v.id("cardDefinitions"),
    limit: v.optional(v.number()),
  },
  returns: v.array(listingSaleReturnValidator),
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("marketplaceListings")
      .withIndex("by_card", (q) => q.eq("cardDefinitionId", args.cardDefinitionId))
      .filter((q) => q.eq(q.field("status"), "sold"))
      .order("desc");

    const sales = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    return sales
      .filter((s) => s.soldFor !== undefined && s.soldAt !== undefined && s.soldTo !== undefined)
      .map((sale) => ({
        _id: sale._id as string,
        _creationTime: sale._creationTime,
        cardDefinitionId: sale.cardDefinitionId as string,
        soldFor: sale.soldFor!,
        soldAt: sale.soldAt!,
        currencyType: sale.currencyType || "gold",
        listingType: sale.listingType,
        sellerId: sale.sellerId as string,
        soldTo: sale.soldTo! as string,
      }));
  },
});

// Get transaction history for a user (from sold listings)
export const getTransactionHistory = query({
  args: {
    userId: v.id("users"),
    role: v.optional(v.union(v.literal("buyer"), v.literal("seller"))),
    limit: v.optional(v.number()),
  },
  returns: v.array(listingSaleReturnValidator),
  handler: async (ctx, args) => {
    let sales: any[] = [];

    if (!args.role || args.role === "buyer") {
      const buyerSales = await ctx.db
        .query("marketplaceListings")
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "sold"),
            q.eq(q.field("soldTo"), args.userId)
          )
        )
        .collect();
      sales.push(...buyerSales);
    }

    if (!args.role || args.role === "seller") {
      const sellerSales = await ctx.db
        .query("marketplaceListings")
        .withIndex("by_seller", (q) => q.eq("sellerId", args.userId))
        .filter((q) => q.eq(q.field("status"), "sold"))
        .collect();
      sales.push(...sellerSales);
    }

    // Sort by soldAt descending
    sales.sort((a, b) => (b.soldAt || 0) - (a.soldAt || 0));

    // Apply limit if specified
    if (args.limit) {
      sales = sales.slice(0, args.limit);
    }

    return sales
      .filter((s) => s.soldFor !== undefined && s.soldAt !== undefined && s.soldTo !== undefined)
      .map((sale) => ({
        _id: sale._id as string,
        _creationTime: sale._creationTime,
        cardDefinitionId: sale.cardDefinitionId as string,
        soldFor: sale.soldFor!,
        soldAt: sale.soldAt!,
        currencyType: sale.currencyType || "gold",
        listingType: sale.listingType,
        sellerId: sale.sellerId as string,
        soldTo: sale.soldTo! as string,
      }));
  },
});

// Get recent sales across all listings
export const getRecentTransactions = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(listingSaleReturnValidator),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const sales = await ctx.db
      .query("marketplaceListings")
      .filter((q) => q.eq(q.field("status"), "sold"))
      .order("desc")
      .take(limit * 2); // Get more to ensure we have enough sold items

    return sales
      .filter((s) => s.soldFor !== undefined && s.soldAt !== undefined && s.soldTo !== undefined)
      .slice(0, limit)
      .map((sale) => ({
        _id: sale._id as string,
        _creationTime: sale._creationTime,
        cardDefinitionId: sale.cardDefinitionId as string,
        soldFor: sale.soldFor!,
        soldAt: sale.soldAt!,
        currencyType: sale.currencyType || "gold",
        listingType: sale.listingType,
        sellerId: sale.sellerId as string,
        soldTo: sale.soldTo! as string,
      }));
  },
});
