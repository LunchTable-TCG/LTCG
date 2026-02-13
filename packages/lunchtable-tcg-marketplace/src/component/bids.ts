import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const bidReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  listingId: v.string(),
  bidderId: v.string(),
  amount: v.number(),
  currency: v.string(),
  isWinning: v.boolean(),
  createdAt: v.number(),
  metadata: v.optional(v.any()),
});

export const placeBid = mutation({
  args: {
    listingId: v.id("listings"),
    bidderId: v.string(),
    amount: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${args.listingId}`);
    }
    if (!listing.isAuction) {
      throw new Error("Can only bid on auction listings");
    }
    if (listing.status !== "active") {
      throw new Error("Auction is not active");
    }
    if (listing.sellerId === args.bidderId) {
      throw new Error("Cannot bid on your own auction");
    }
    if (listing.auctionEndTime && listing.auctionEndTime < Date.now()) {
      throw new Error("Auction has ended");
    }
    if (args.amount < (listing.minBid || listing.price)) {
      throw new Error("Bid amount is below minimum bid");
    }

    // Get all bids for this listing
    const existingBids = await ctx.db
      .query("bids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();

    // Find highest bid
    const highestBid = existingBids.reduce(
      (max, bid) => (bid.amount > max ? bid.amount : max),
      0
    );

    if (args.amount <= highestBid) {
      throw new Error("Bid must be higher than current highest bid");
    }

    // Mark all previous bids as not winning
    for (const bid of existingBids) {
      if (bid.isWinning) {
        await ctx.db.patch(bid._id, { isWinning: false });
      }
    }

    // Create new bid
    const bidId = await ctx.db.insert("bids", {
      listingId: args.listingId,
      bidderId: args.bidderId,
      amount: args.amount,
      currency: listing.currency,
      isWinning: true,
      createdAt: Date.now(),
    });

    return bidId as string;
  },
});

export const getBidsForListing = query({
  args: { listingId: v.id("listings") },
  returns: v.array(bidReturnValidator),
  handler: async (ctx, args) => {
    const bids = await ctx.db
      .query("bids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();
    return bids.map((bid) => ({
      ...bid,
      _id: bid._id as string,
      listingId: bid.listingId as string,
    }));
  },
});

export const getPlayerBids = query({
  args: { bidderId: v.string() },
  returns: v.array(bidReturnValidator),
  handler: async (ctx, args) => {
    const bids = await ctx.db
      .query("bids")
      .withIndex("by_bidder", (q) => q.eq("bidderId", args.bidderId))
      .collect();
    return bids.map((bid) => ({
      ...bid,
      _id: bid._id as string,
      listingId: bid.listingId as string,
    }));
  },
});

export const resolveAuction = mutation({
  args: { listingId: v.id("listings") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${args.listingId}`);
    }
    if (!listing.isAuction) {
      throw new Error("Can only resolve auction listings");
    }
    if (listing.status !== "active" && listing.status !== "expired") {
      throw new Error("Auction has already been resolved");
    }
    if (listing.auctionEndTime && listing.auctionEndTime > Date.now()) {
      throw new Error("Auction has not ended yet");
    }

    // Get winning bid
    const winningBid = await ctx.db
      .query("bids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .filter((q) => q.eq(q.field("isWinning"), true))
      .unique();

    if (!winningBid) {
      // No bids, mark as expired
      await ctx.db.patch(args.listingId, { status: "expired" });
      return null;
    }

    // Create transaction
    const transactionId = await ctx.db.insert("transactions", {
      buyerId: winningBid.bidderId,
      sellerId: listing.sellerId,
      listingId: listing._id as string,
      itemId: listing.itemId,
      itemType: listing.itemType,
      amount: winningBid.amount,
      currency: listing.currency,
      type: "auction_win",
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
      price: winningBid.amount,
      currency: listing.currency,
      timestamp: Date.now(),
      type: "auction",
    });

    return transactionId as string;
  },
});
