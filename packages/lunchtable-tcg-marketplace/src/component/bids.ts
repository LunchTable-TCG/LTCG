import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const bidReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  listingId: v.string(),
  bidderId: v.string(),
  bidderUsername: v.string(),
  bidAmount: v.number(),
  bidStatus: v.union(
    v.literal("active"),
    v.literal("outbid"),
    v.literal("won"),
    v.literal("refunded"),
    v.literal("cancelled")
  ),
  refundedAt: v.optional(v.number()),
  refunded: v.optional(v.boolean()),
  createdAt: v.number(),
});

export const placeBid = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    bidderId: v.id("users"),
    bidderUsername: v.string(),
    bidAmount: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${args.listingId}`);
    }
    if (listing.listingType !== "auction") {
      throw new Error("Can only bid on auction listings");
    }
    if (listing.status !== "active") {
      throw new Error("Auction is not active");
    }
    if (listing.sellerId === args.bidderId) {
      throw new Error("Cannot bid on your own auction");
    }
    if (listing.endsAt && listing.endsAt < Date.now()) {
      throw new Error("Auction has ended");
    }
    if (args.bidAmount <= listing.price) {
      throw new Error("Bid amount must be higher than starting price");
    }

    // Get all bids for this listing
    const existingBids = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();

    // Find highest bid
    const highestBid = existingBids.reduce(
      (max, bid) => (bid.bidAmount > max ? bid.bidAmount : max),
      listing.currentBid || 0
    );

    if (args.bidAmount <= highestBid) {
      throw new Error("Bid must be higher than current highest bid");
    }

    // Mark all previous active bids as outbid
    for (const bid of existingBids) {
      if (bid.bidStatus === "active") {
        await ctx.db.patch(bid._id, { bidStatus: "outbid" });
      }
    }

    const now = Date.now();

    // Create new bid
    const bidId = await ctx.db.insert("auctionBids", {
      listingId: args.listingId,
      bidderId: args.bidderId,
      bidderUsername: args.bidderUsername,
      bidAmount: args.bidAmount,
      bidStatus: "active",
      createdAt: now,
    });

    // Update listing with new highest bid
    await ctx.db.patch(args.listingId, {
      currentBid: args.bidAmount,
      highestBidderId: args.bidderId,
      highestBidderUsername: args.bidderUsername,
      bidCount: listing.bidCount + 1,
      updatedAt: now,
    });

    return bidId as string;
  },
});

export const getBidsForListing = query({
  args: { listingId: v.id("marketplaceListings") },
  returns: v.array(bidReturnValidator),
  handler: async (ctx, args) => {
    const bids = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();
    return bids.map((bid) => ({
      ...bid,
      _id: bid._id as string,
      listingId: bid.listingId as string,
      bidderId: bid.bidderId as string,
    }));
  },
});

export const getPlayerBids = query({
  args: {
    bidderId: v.id("users"),
    bidStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("outbid"),
        v.literal("won"),
        v.literal("refunded"),
        v.literal("cancelled")
      )
    ),
  },
  returns: v.array(bidReturnValidator),
  handler: async (ctx, args) => {
    let bids = await ctx.db
      .query("auctionBids")
      .withIndex("by_bidder", (q) => q.eq("bidderId", args.bidderId))
      .collect();

    if (args.bidStatus) {
      bids = bids.filter((b) => b.bidStatus === args.bidStatus);
    }

    return bids.map((bid) => ({
      ...bid,
      _id: bid._id as string,
      listingId: bid.listingId as string,
      bidderId: bid.bidderId as string,
    }));
  },
});

export const resolveAuction = mutation({
  args: { listingId: v.id("marketplaceListings") },
  returns: v.union(
    v.object({
      winnerId: v.string(),
      winAmount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${args.listingId}`);
    }
    if (listing.listingType !== "auction") {
      throw new Error("Can only resolve auction listings");
    }
    if (listing.status !== "active" && listing.status !== "expired") {
      throw new Error("Auction has already been resolved");
    }
    if (listing.endsAt && listing.endsAt > Date.now()) {
      throw new Error("Auction has not ended yet");
    }

    // Get winning bid
    const winningBid = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .filter((q) => q.eq(q.field("bidStatus"), "active"))
      .first();

    const now = Date.now();

    if (!winningBid) {
      // No bids, mark as expired
      await ctx.db.patch(args.listingId, {
        status: "expired",
        updatedAt: now,
      });
      return null;
    }

    // Mark winning bid as won
    await ctx.db.patch(winningBid._id, { bidStatus: "won" });

    // Update listing status
    await ctx.db.patch(args.listingId, {
      status: "sold",
      soldTo: winningBid.bidderId,
      soldFor: winningBid.bidAmount,
      soldAt: now,
      updatedAt: now,
    });

    return {
      winnerId: winningBid.bidderId as string,
      winAmount: winningBid.bidAmount,
    };
  },
});
