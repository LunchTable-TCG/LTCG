import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { validateSession, checkCardOwnership } from "./lib/validators";
import { adjustCardInventory } from "./lib/helpers";
import { MARKETPLACE, PAGINATION } from "./lib/constants";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get marketplace listings with filtering and sorting
 */
export const getMarketplaceListings = query({
  args: {
    rarity: v.optional(
      v.union(
        v.literal("common"),
        v.literal("uncommon"),
        v.literal("rare"),
        v.literal("epic"),
        v.literal("legendary")
      )
    ),
    archetype: v.optional(
      v.union(
        v.literal("fire"),
        v.literal("water"),
        v.literal("earth"),
        v.literal("wind"),
        v.literal("neutral")
      )
    ),
    listingType: v.optional(v.union(v.literal("fixed"), v.literal("auction"))),
    sortBy: v.optional(
      v.union(
        v.literal("price_asc"),
        v.literal("price_desc"),
        v.literal("newest"),
        v.literal("oldest")
      )
    ),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = PAGINATION.MARKETPLACE_PAGE_SIZE;

    // Get active listings
    let listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Join with card definitions for filtering
    const listingsWithCards = await Promise.all(
      listings.map(async (listing) => {
        const card = await ctx.db.get(listing.cardDefinitionId);
        return { ...listing, card };
      })
    );

    // Filter by rarity
    let filtered = listingsWithCards;
    if (args.rarity) {
      filtered = filtered.filter((l) => l.card?.rarity === args.rarity);
    }

    // Filter by archetype
    if (args.archetype) {
      filtered = filtered.filter((l) => l.card?.archetype === args.archetype);
    }

    // Filter by listing type
    if (args.listingType) {
      filtered = filtered.filter((l) => l.listingType === args.listingType);
    }

    // Sort
    const sortBy = args.sortBy ?? "newest";
    if (sortBy === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => a.createdAt - b.createdAt);
    }

    // Paginate
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginated = filtered.slice(startIdx, endIdx);

    // Format response
    const formattedListings = paginated.map((listing) => ({
      _id: listing._id,
      sellerId: listing.sellerId,
      sellerUsername: listing.sellerUsername,
      listingType: listing.listingType,
      cardName: listing.card?.name ?? "Unknown Card",
      cardRarity: listing.card?.rarity ?? "common",
      cardArchetype: listing.card?.archetype ?? "neutral",
      cardImageUrl: listing.card?.imageUrl,
      quantity: listing.quantity,
      price: listing.price,
      currentBid: listing.currentBid,
      highestBidderId: listing.highestBidderId,
      highestBidderUsername: listing.highestBidderUsername,
      bidCount: listing.bidCount,
      endsAt: listing.endsAt,
      createdAt: listing.createdAt,
    }));

    return {
      listings: formattedListings,
      page,
      pageSize,
      total: filtered.length,
      hasMore: endIdx < filtered.length,
    };
  },
});

/**
 * Get user's own listings
 */
export const getUserListings = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    const listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .collect();

    // Join with card definitions
    const listingsWithCards = await Promise.all(
      listings.map(async (listing) => {
        const card = await ctx.db.get(listing.cardDefinitionId);
        return {
          ...listing,
          cardName: card?.name ?? "Unknown Card",
          cardRarity: card?.rarity ?? "common",
          cardImageUrl: card?.imageUrl,
        };
      })
    );

    return listingsWithCards;
  },
});

/**
 * Get auction bid history for a listing
 */
export const getAuctionBidHistory = query({
  args: { listingId: v.id("marketplaceListings") },
  handler: async (ctx, args) => {
    const bids = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .order("desc")
      .collect();

    return bids;
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Create a marketplace listing
 */
export const createListing = mutation({
  args: {
    token: v.string(),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    listingType: v.union(v.literal("fixed"), v.literal("auction")),
    price: v.number(),
    duration: v.optional(v.number()), // For auctions (hours)
  },
  handler: async (ctx, args) => {
    const { userId, username } = await validateSession(ctx, args.token);

    // Validate inputs
    if (args.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    if (args.price < MARKETPLACE.MIN_LISTING_PRICE) {
      throw new Error(`Minimum price is ${MARKETPLACE.MIN_LISTING_PRICE} gold`);
    }

    // Check card ownership
    const hasCard = await checkCardOwnership(
      ctx,
      userId,
      args.cardDefinitionId,
      args.quantity
    );

    if (!hasCard) {
      throw new Error("You don't own enough of this card");
    }

    // Lock inventory (remove from player's available cards)
    await adjustCardInventory(
      ctx,
      userId,
      args.cardDefinitionId,
      -args.quantity
    );

    // Calculate auction end time if applicable
    let endsAt: number | undefined;
    if (args.listingType === "auction") {
      const duration = args.duration ?? 24; // Default 24 hours
      if (duration < MARKETPLACE.MIN_AUCTION_DURATION || duration > MARKETPLACE.MAX_AUCTION_DURATION) {
        throw new Error(`Auction duration must be between ${MARKETPLACE.MIN_AUCTION_DURATION} and ${MARKETPLACE.MAX_AUCTION_DURATION} hours`);
      }
      endsAt = Date.now() + duration * 60 * 60 * 1000;
    }

    // Create listing
    const listingId = await ctx.db.insert("marketplaceListings", {
      sellerId: userId,
      sellerUsername: username,
      listingType: args.listingType,
      cardDefinitionId: args.cardDefinitionId,
      quantity: args.quantity,
      price: args.price,
      bidCount: 0,
      status: "active",
      endsAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      listingId,
    };
  },
});

/**
 * Cancel a listing
 */
export const cancelListing = mutation({
  args: {
    token: v.string(),
    listingId: v.id("marketplaceListings"),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.sellerId !== userId) {
      throw new Error("You can only cancel your own listings");
    }

    if (listing.status !== "active") {
      throw new Error("Listing is not active");
    }

    // Refund all bids if auction
    if (listing.listingType === "auction" && listing.bidCount > 0) {
      const bids = await ctx.db
        .query("auctionBids")
        .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
        .collect();

      for (const bid of bids) {
        if (bid.bidStatus === "active") {
          // Refund the bidder
          await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
            userId: bid.bidderId,
            goldDelta: bid.bidAmount,
            transactionType: "auction_refund",
            description: `Auction cancelled - refund`,
            referenceId: args.listingId,
          });

          // Update bid status
          await ctx.db.patch(bid._id, {
            bidStatus: "cancelled",
            refundedAt: Date.now(),
          });
        }
      }
    }

    // Return cards to inventory
    await adjustCardInventory(
      ctx,
      userId,
      listing.cardDefinitionId,
      listing.quantity
    );

    // Update listing status
    await ctx.db.patch(args.listingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Buy now (fixed price listing)
 */
export const buyNow = mutation({
  args: {
    token: v.string(),
    listingId: v.id("marketplaceListings"),
  },
  handler: async (ctx, args) => {
    const { userId, username } = await validateSession(ctx, args.token);

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.status !== "active") {
      throw new Error("Listing is no longer active");
    }

    if (listing.listingType !== "fixed") {
      throw new Error("This is not a fixed price listing");
    }

    if (listing.sellerId === userId) {
      throw new Error("You cannot buy your own listing");
    }

    // Calculate total with platform fee
    const platformFee = Math.floor(listing.price * MARKETPLACE.PLATFORM_FEE_PERCENT);
    const totalCost = listing.price + platformFee;

    // Deduct from buyer (price + fee)
    await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
      userId,
      goldDelta: -totalCost,
      transactionType: "purchase",
      description: `Purchased listing #${args.listingId}`,
      referenceId: args.listingId,
      metadata: {
        price: listing.price,
        platformFee,
      },
    });

    // Credit seller
    await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
      userId: listing.sellerId,
      goldDelta: listing.price,
      transactionType: "sale",
      description: `Sold listing #${args.listingId}`,
      referenceId: args.listingId,
    });

    // Transfer card ownership
    await adjustCardInventory(
      ctx,
      userId,
      listing.cardDefinitionId,
      listing.quantity
    );

    // Update listing status
    await ctx.db.patch(args.listingId, {
      status: "sold",
      soldTo: userId,
      soldFor: listing.price,
      soldAt: Date.now(),
      platformFee,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      price: listing.price,
      platformFee,
      totalCost,
    };
  },
});

/**
 * Place bid on auction
 */
export const placeBid = mutation({
  args: {
    token: v.string(),
    listingId: v.id("marketplaceListings"),
    bidAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, username } = await validateSession(ctx, args.token);

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.status !== "active") {
      throw new Error("Auction is no longer active");
    }

    if (listing.listingType !== "auction") {
      throw new Error("This is not an auction listing");
    }

    if (listing.sellerId === userId) {
      throw new Error("You cannot bid on your own auction");
    }

    // Check if auction expired
    if (listing.endsAt && listing.endsAt < Date.now()) {
      throw new Error("Auction has ended");
    }

    // Determine minimum bid
    const currentBid = listing.currentBid ?? listing.price;
    const minBid = Math.ceil(currentBid * (1 + MARKETPLACE.MIN_BID_INCREMENT_PERCENT));

    if (args.bidAmount < minBid) {
      throw new Error(`Bid must be at least ${minBid} gold`);
    }

    // Lock bidder's gold
    await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
      userId,
      goldDelta: -args.bidAmount,
      transactionType: "auction_bid",
      description: `Bid on auction #${args.listingId}`,
      referenceId: args.listingId,
    });

    // Refund previous highest bidder if exists
    if (listing.highestBidderId && listing.currentBid) {
      await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
        userId: listing.highestBidderId,
        goldDelta: listing.currentBid,
        transactionType: "auction_refund",
        description: `Outbid on auction #${args.listingId}`,
        referenceId: args.listingId,
      });

      // Update previous bid status
      const previousBids = await ctx.db
        .query("auctionBids")
        .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
        .collect();

      for (const bid of previousBids) {
        if (bid.bidStatus === "active") {
          await ctx.db.patch(bid._id, {
            bidStatus: "outbid",
            refundedAt: Date.now(),
          });
        }
      }
    }

    // Create bid record
    await ctx.db.insert("auctionBids", {
      listingId: args.listingId,
      bidderId: userId,
      bidderUsername: username,
      bidAmount: args.bidAmount,
      bidStatus: "active",
      createdAt: Date.now(),
    });

    // Update listing
    await ctx.db.patch(args.listingId, {
      currentBid: args.bidAmount,
      highestBidderId: userId,
      highestBidderUsername: username,
      bidCount: listing.bidCount + 1,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      bidAmount: args.bidAmount,
      currentBid: args.bidAmount,
    };
  },
});

/**
 * Claim auction win (after auction ends)
 */
export const claimAuctionWin = mutation({
  args: {
    token: v.string(),
    listingId: v.id("marketplaceListings"),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.listingType !== "auction") {
      throw new Error("This is not an auction");
    }

    if (listing.status !== "active") {
      throw new Error("Auction is not active");
    }

    if (!listing.endsAt || listing.endsAt > Date.now()) {
      throw new Error("Auction has not ended yet");
    }

    if (!listing.highestBidderId || listing.highestBidderId !== userId) {
      throw new Error("You are not the highest bidder");
    }

    if (!listing.currentBid) {
      throw new Error("No bids on this auction");
    }

    // Calculate platform fee
    const platformFee = Math.floor(listing.currentBid * MARKETPLACE.PLATFORM_FEE_PERCENT);

    // Deduct platform fee from winner (bid already locked)
    await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
      userId,
      goldDelta: -platformFee,
      transactionType: "marketplace_fee",
      description: `Platform fee for auction #${args.listingId}`,
      referenceId: args.listingId,
    });

    // Credit seller
    await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
      userId: listing.sellerId,
      goldDelta: listing.currentBid,
      transactionType: "sale",
      description: `Sold auction #${args.listingId}`,
      referenceId: args.listingId,
    });

    // Transfer cards
    await adjustCardInventory(
      ctx,
      userId,
      listing.cardDefinitionId,
      listing.quantity
    );

    // Update listing status
    await ctx.db.patch(args.listingId, {
      status: "sold",
      soldTo: userId,
      soldFor: listing.currentBid,
      soldAt: Date.now(),
      platformFee,
      updatedAt: Date.now(),
    });

    // Update bid status to won
    const bids = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();

    for (const bid of bids) {
      if (bid.bidderId === userId && bid.bidStatus === "active") {
        await ctx.db.patch(bid._id, {
          bidStatus: "won",
        });
      }
    }

    return {
      success: true,
      finalPrice: listing.currentBid,
      platformFee,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (Automated Tasks)
// ============================================================================

/**
 * Finalize expired auctions
 *
 * Runs periodically via cron to:
 * - Auto-complete auctions with bids (transfer cards to winner)
 * - Return cards to seller for auctions with no bids
 * - Grace period: 1 hour after auction ends before auto-finalization
 */
export const finalizeExpiredAuctions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

    // Find active auctions that have expired (including grace period)
    const expiredAuctions = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const toFinalize = expiredAuctions.filter(
      (listing) =>
        listing.listingType === "auction" &&
        listing.endsAt !== undefined &&
        listing.endsAt + GRACE_PERIOD_MS < now
    );

    let finalizedCount = 0;
    let returnedCount = 0;

    for (const listing of toFinalize) {
      try {
        // Case 1: Auction with bids - transfer to winner
        if (listing.highestBidderId && listing.currentBid) {
          const platformFee = Math.floor(listing.currentBid * MARKETPLACE.PLATFORM_FEE_PERCENT);

          // Deduct platform fee from winner
          await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
            userId: listing.highestBidderId,
            goldDelta: -platformFee,
            transactionType: "marketplace_fee",
            description: `Auto-finalized auction #${listing._id}`,
            referenceId: listing._id,
          });

          // Credit seller
          await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
            userId: listing.sellerId,
            goldDelta: listing.currentBid,
            transactionType: "sale",
            description: `Auto-finalized auction #${listing._id}`,
            referenceId: listing._id,
          });

          // Transfer cards to winner
          await adjustCardInventory(
            ctx,
            listing.highestBidderId,
            listing.cardDefinitionId,
            listing.quantity
          );

          // Update listing status
          await ctx.db.patch(listing._id, {
            status: "sold",
            soldTo: listing.highestBidderId,
            soldFor: listing.currentBid,
            soldAt: now,
            platformFee,
            updatedAt: now,
          });

          // Update bid status to won
          const bids = await ctx.db
            .query("auctionBids")
            .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
            .collect();

          for (const bid of bids) {
            if (bid.bidderId === listing.highestBidderId && bid.bidStatus === "active") {
              await ctx.db.patch(bid._id, {
                bidStatus: "won",
              });
            }
          }

          finalizedCount++;
        }
        // Case 2: Auction with no bids - return cards to seller
        else {
          await adjustCardInventory(
            ctx,
            listing.sellerId,
            listing.cardDefinitionId,
            listing.quantity
          );

          await ctx.db.patch(listing._id, {
            status: "expired",
            updatedAt: now,
          });

          returnedCount++;
        }
      } catch (error) {
        console.error(`Failed to finalize auction ${listing._id}:`, error);
      }
    }

    return {
      processed: toFinalize.length,
      finalized: finalizedCount,
      returned: returnedCount,
    };
  },
});
