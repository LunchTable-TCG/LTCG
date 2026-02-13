import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const listingReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  sellerId: v.string(),
  itemId: v.string(),
  itemType: v.string(),
  itemName: v.string(),
  price: v.number(),
  currency: v.string(),
  quantity: v.number(),
  isAuction: v.boolean(),
  auctionEndTime: v.optional(v.number()),
  minBid: v.optional(v.number()),
  buyNowPrice: v.optional(v.number()),
  status: v.string(),
  createdAt: v.number(),
  metadata: v.optional(v.any()),
});

export const createListing = mutation({
  args: {
    sellerId: v.string(),
    itemId: v.string(),
    itemType: v.string(),
    itemName: v.string(),
    price: v.number(),
    currency: v.string(),
    quantity: v.number(),
    isAuction: v.boolean(),
    auctionEndTime: v.optional(v.number()),
    minBid: v.optional(v.number()),
    buyNowPrice: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const listingData = {
      ...args,
      status: "active",
      createdAt: Date.now(),
    };
    const id = await ctx.db.insert("listings", listingData);
    return id as string;
  },
});

export const cancelListing = mutation({
  args: {
    listingId: v.id("listings"),
    sellerId: v.string(),
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
    await ctx.db.patch(args.listingId, { status: "cancelled" });
    return null;
  },
});

export const purchaseListing = mutation({
  args: {
    listingId: v.id("listings"),
    buyerId: v.string(),
  },
  returns: v.string(),
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
    if (listing.isAuction && !listing.buyNowPrice) {
      throw new Error("This is an auction without buy-now option");
    }

    const purchasePrice = listing.isAuction && listing.buyNowPrice
      ? listing.buyNowPrice
      : listing.price;

    // Create transaction record
    const transactionId = await ctx.db.insert("transactions", {
      buyerId: args.buyerId,
      sellerId: listing.sellerId,
      listingId: listing._id as string,
      itemId: listing.itemId,
      itemType: listing.itemType,
      amount: purchasePrice,
      currency: listing.currency,
      type: "purchase",
      timestamp: Date.now(),
      metadata: {
        itemName: listing.itemName,
        quantity: listing.quantity,
      },
    });

    // Update listing status
    await ctx.db.patch(args.listingId, { status: "sold" });

    // Record price history
    await ctx.db.insert("priceHistory", {
      itemId: listing.itemId,
      price: purchasePrice,
      currency: listing.currency,
      timestamp: Date.now(),
      type: listing.isAuction ? "auction" : "sale",
    });

    return transactionId as string;
  },
});

export const getActive = query({
  args: {
    itemType: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  returns: v.array(listingReturnValidator),
  handler: async (ctx, args) => {
    let listings = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    if (args.itemType) {
      listings = listings.filter((l) => l.itemType === args.itemType);
    }
    if (args.currency) {
      listings = listings.filter((l) => l.currency === args.currency);
    }

    return listings.map((listing) => ({
      ...listing,
      _id: listing._id as string,
    }));
  },
});

export const getBySeller = query({
  args: { sellerId: v.string() },
  returns: v.array(listingReturnValidator),
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_seller", (q) => q.eq("sellerId", args.sellerId))
      .collect();
    return listings.map((listing) => ({
      ...listing,
      _id: listing._id as string,
    }));
  },
});

export const getById = query({
  args: { id: v.id("listings") },
  returns: v.union(listingReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.id);
    if (!listing) return null;
    return { ...listing, _id: listing._id as string };
  },
});

export const expireListings = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const activeAuctions = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let expiredCount = 0;
    for (const listing of activeAuctions) {
      if (
        listing.isAuction &&
        listing.auctionEndTime &&
        listing.auctionEndTime < now
      ) {
        await ctx.db.patch(listing._id, { status: "expired" });
        expiredCount++;
      }
    }

    return expiredCount;
  },
});
