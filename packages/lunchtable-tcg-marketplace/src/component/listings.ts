import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const listingReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  sellerId: v.string(),
  sellerUsername: v.string(),
  listingType: v.union(v.literal("fixed"), v.literal("auction")),
  cardDefinitionId: v.string(),
  quantity: v.number(),
  price: v.number(),
  currentBid: v.optional(v.number()),
  highestBidderId: v.optional(v.string()),
  highestBidderUsername: v.optional(v.string()),
  endsAt: v.optional(v.number()),
  bidCount: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("sold"),
    v.literal("cancelled"),
    v.literal("expired"),
    v.literal("suspended")
  ),
  soldTo: v.optional(v.string()),
  soldFor: v.optional(v.number()),
  soldAt: v.optional(v.number()),
  platformFee: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  currencyType: v.optional(v.union(v.literal("gold"), v.literal("token"))),
  tokenPrice: v.optional(v.number()),
  claimed: v.optional(v.boolean()),
});

export const createListing = mutation({
  args: {
    sellerId: v.id("users"),
    sellerUsername: v.string(),
    listingType: v.union(v.literal("fixed"), v.literal("auction")),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    price: v.number(),
    endsAt: v.optional(v.number()),
    currencyType: v.optional(v.union(v.literal("gold"), v.literal("token"))),
    tokenPrice: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const listingData = {
      sellerId: args.sellerId,
      sellerUsername: args.sellerUsername,
      listingType: args.listingType,
      cardDefinitionId: args.cardDefinitionId,
      quantity: args.quantity,
      price: args.price,
      endsAt: args.endsAt,
      currencyType: args.currencyType,
      tokenPrice: args.tokenPrice,
      bidCount: 0,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    };
    const id = await ctx.db.insert("marketplaceListings", listingData);
    return id as string;
  },
});

export const cancelListing = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    sellerId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${args.listingId}`);
    }
    if (listing.sellerId !== args.sellerId) {
      throw new Error("Only the seller can cancel their listing");
    }
    if (listing.status !== "active") {
      throw new Error("Can only cancel active listings");
    }
    await ctx.db.patch(args.listingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const purchaseListing = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    buyerId: v.id("users"),
    buyerUsername: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${args.listingId}`);
    }
    if (listing.status !== "active") {
      throw new Error("Listing is not active");
    }
    if (listing.sellerId === args.buyerId) {
      throw new Error("Cannot purchase your own listing");
    }
    if (listing.listingType !== "fixed") {
      throw new Error("Can only purchase fixed-price listings directly");
    }

    const now = Date.now();

    // Update listing status
    await ctx.db.patch(args.listingId, {
      status: "sold",
      soldTo: args.buyerId,
      soldFor: listing.price,
      soldAt: now,
      updatedAt: now,
    });

    return null;
  },
});

export const getActive = query({
  args: {
    listingType: v.optional(v.union(v.literal("fixed"), v.literal("auction"))),
    currencyType: v.optional(v.union(v.literal("gold"), v.literal("token"))),
  },
  returns: v.array(listingReturnValidator),
  handler: async (ctx, args) => {
    let listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    if (args.listingType) {
      listings = listings.filter((l) => l.listingType === args.listingType);
    }
    if (args.currencyType) {
      listings = listings.filter((l) => l.currencyType === args.currencyType);
    }

    return listings.map((listing) => ({
      ...listing,
      _id: listing._id as string,
      sellerId: listing.sellerId as string,
      cardDefinitionId: listing.cardDefinitionId as string,
      highestBidderId: listing.highestBidderId
        ? (listing.highestBidderId as string)
        : undefined,
      soldTo: listing.soldTo ? (listing.soldTo as string) : undefined,
    }));
  },
});

export const getBySeller = query({
  args: {
    sellerId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("sold"),
        v.literal("cancelled"),
        v.literal("expired"),
        v.literal("suspended")
      )
    ),
  },
  returns: v.array(listingReturnValidator),
  handler: async (ctx, args) => {
    let listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", args.sellerId))
      .collect();

    if (args.status) {
      listings = listings.filter((l) => l.status === args.status);
    }

    return listings.map((listing) => ({
      ...listing,
      _id: listing._id as string,
      sellerId: listing.sellerId as string,
      cardDefinitionId: listing.cardDefinitionId as string,
      highestBidderId: listing.highestBidderId
        ? (listing.highestBidderId as string)
        : undefined,
      soldTo: listing.soldTo ? (listing.soldTo as string) : undefined,
    }));
  },
});

export const getById = query({
  args: { id: v.id("marketplaceListings") },
  returns: v.union(listingReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.id);
    if (!listing) return null;
    return {
      ...listing,
      _id: listing._id as string,
      sellerId: listing.sellerId as string,
      cardDefinitionId: listing.cardDefinitionId as string,
      highestBidderId: listing.highestBidderId
        ? (listing.highestBidderId as string)
        : undefined,
      soldTo: listing.soldTo ? (listing.soldTo as string) : undefined,
    };
  },
});

export const expireListings = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const activeAuctions = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let expiredCount = 0;
    for (const listing of activeAuctions) {
      if (
        listing.listingType === "auction" &&
        listing.endsAt &&
        listing.endsAt < now
      ) {
        await ctx.db.patch(listing._id, {
          status: "expired",
          updatedAt: now,
        });
        expiredCount++;
      }
    }

    return expiredCount;
  },
});
