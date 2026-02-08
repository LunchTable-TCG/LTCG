import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;
import { query } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { marketplaceRateLimiter } from "../infrastructure/rateLimiters";
import { MARKETPLACE, PAGINATION } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { adjustCardInventory } from "../lib/helpers";
import { getNotificationSetting } from "../lib/preferenceHelpers";
import { auctionBidValidator } from "../lib/returnValidators";
import { checkCardOwnership } from "../lib/validators";
import { adjustPlayerCurrencyHelper } from "./economy";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get marketplace listings with filtering and sorting
 *
 * @param rarity - Optional filter by card rarity (common, uncommon, rare, epic, legendary)
 * @param archetype - Optional filter by card archetype (fire, water, earth, wind, neutral)
 * @param listingType - Optional filter by listing type (fixed, auction)
 * @param sortBy - Optional sort order (price_asc, price_desc, newest, oldest)
 * @param page - Optional page number for pagination (default: 1)
 * @returns Paginated marketplace listings with card details
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
  returns: v.object({
    listings: v.array(v.any()),
    page: v.number(),
    pageSize: v.number(),
    total: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = PAGINATION.MARKETPLACE_PAGE_SIZE;

    // Get active listings with listing type filter at query level
    const listingsQuery = ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"));

    const listings = await listingsQuery.take(100); // Reasonable limit for marketplace listings

    // Fix N+1: Batch fetch all unique card definitions
    const uniqueCardIds = [...new Set(listings.map((l) => l.cardDefinitionId))];
    const cardPromises = uniqueCardIds.map((id) => ctx.db.get(id));
    const cards = await Promise.all(cardPromises);
    const cardMap = new Map(
      cards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // Join with card definitions using the batch-fetched map
    const listingsWithCards = listings.map((listing) => ({
      ...listing,
      card: cardMap.get(listing.cardDefinitionId),
    }));

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
 *
 * Retrieves all marketplace listings created by the authenticated user.
 *
 * @returns Array of user's listings with card details
 */
export const getUserListings = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("marketplaceListings"),
      _creationTime: v.number(),
      sellerId: v.id("users"),
      sellerUsername: v.string(),
      listingType: literals("fixed", "auction"),
      cardDefinitionId: v.id("cardDefinitions"),
      quantity: v.number(),
      price: v.number(),
      currentBid: v.optional(v.number()),
      highestBidderId: v.optional(v.id("users")),
      highestBidderUsername: v.optional(v.string()),
      endsAt: v.optional(v.number()),
      bidCount: v.number(),
      status: literals("active", "sold", "cancelled", "expired", "suspended"),
      soldTo: v.optional(v.id("users")),
      soldFor: v.optional(v.number()),
      soldAt: v.optional(v.number()),
      platformFee: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      currencyType: v.optional(literals("gold", "token")),
      tokenPrice: v.optional(v.number()),
      claimed: v.optional(v.boolean()),
      // Enriched fields from card definition join
      cardName: v.string(),
      cardRarity: v.string(),
      cardImageUrl: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .take(100); // Reasonable limit for user's own listings

    // Fix N+1: Batch fetch all unique card definitions
    const uniqueCardIds = [...new Set(listings.map((l) => l.cardDefinitionId))];
    const cardPromises = uniqueCardIds.map((id) => ctx.db.get(id));
    const cards = await Promise.all(cardPromises);
    const cardMap = new Map(
      cards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // Join with card definitions using the batch-fetched map
    const listingsWithCards = listings.map((listing) => {
      const card = cardMap.get(listing.cardDefinitionId);
      return {
        ...listing,
        cardName: card?.name ?? "Unknown Card",
        cardRarity: card?.rarity ?? "common",
        cardImageUrl: card?.imageUrl,
      };
    });

    return listingsWithCards;
  },
});

/**
 * Get auction bid history for a listing
 *
 * Returns all bids placed on an auction listing, ordered by most recent first.
 *
 * @param listingId - The marketplace listing ID to get bid history for
 * @returns Array of auction bids with bidder info and amounts
 */
export const getAuctionBidHistory = query({
  args: { listingId: v.id("marketplaceListings") },
  returns: v.array(auctionBidValidator), // Bid history
  handler: async (ctx, args) => {
    const bids = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .order("desc")
      .take(100); // Reasonable limit for bid history

    return bids;
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Create a marketplace listing
 *
 * Creates a new fixed-price or auction listing. Locks the card inventory
 * from the seller until the listing is sold, cancelled, or expires.
 *
 * @param cardDefinitionId - The card to list for sale
 * @param quantity - Number of cards to sell (must be positive)
 * @param listingType - Type of listing: "fixed" for buy-now or "auction" for bidding
 * @param price - Starting price for auctions or buy-now price for fixed listings (min: 10 gold)
 * @param duration - Optional auction duration in hours (default: 24, min: 1, max: 168)
 * @returns Success status and the created listing ID
 */
export const createListing = mutation({
  args: {
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    listingType: v.union(v.literal("fixed"), v.literal("auction")),
    price: v.number(),
    duration: v.optional(v.number()), // For auctions (hours)
  },
  returns: v.object({
    success: v.boolean(),
    listingId: v.id("marketplaceListings"),
  }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Rate limit: 5 listings per minute
    await marketplaceRateLimiter.limit(ctx, "createListing", { key: userId });

    // Validate inputs
    if (args.quantity <= 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Quantity must be positive",
      });
    }

    if (args.price < MARKETPLACE.MIN_LISTING_PRICE) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Minimum price is ${MARKETPLACE.MIN_LISTING_PRICE} gold`,
      });
    }

    // Check card ownership
    const hasCard = await checkCardOwnership(ctx, userId, args.cardDefinitionId, args.quantity);

    if (!hasCard) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "You don't own enough of this card",
      });
    }

    // Lock inventory (remove from player's available cards)
    await adjustCardInventory(ctx, userId, args.cardDefinitionId, -args.quantity);

    // Calculate auction end time if applicable
    let endsAt: number | undefined;
    if (args.listingType === "auction") {
      const duration = args.duration ?? 24; // Default 24 hours
      if (
        duration < MARKETPLACE.MIN_AUCTION_DURATION ||
        duration > MARKETPLACE.MAX_AUCTION_DURATION
      ) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `Auction duration must be between ${MARKETPLACE.MIN_AUCTION_DURATION} and ${MARKETPLACE.MAX_AUCTION_DURATION} hours`,
        });
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
 *
 * Cancels an active marketplace listing and returns cards to seller's inventory.
 * For auctions with bids, refunds all bidders automatically.
 *
 * @param listingId - The marketplace listing ID to cancel
 * @returns Success status
 */
export const cancelListing = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Listing not found",
      });
    }

    if (listing.sellerId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "You can only cancel your own listings",
      });
    }

    if (listing.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Listing is not active",
      });
    }

    // Refund all bids if auction
    // NOTE: This loop processes bids sequentially (not atomic across all refunds).
    // This is acceptable because: (1) auction cancellation is user-initiated and rare,
    // (2) the number of bids is limited (<100), and (3) each refund is atomic within
    // adjustPlayerCurrencyHelper. If a partial failure occurs, some bidders may be
    // refunded while others are not, but this is detectable via bid.bidStatus.
    if (listing.listingType === "auction" && listing.bidCount > 0) {
      const bids = await ctx.db
        .query("auctionBids")
        .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
        .take(100); // Reasonable limit for auction bids

      for (const bid of bids) {
        if (bid.bidStatus === "active") {
          // Refund the bidder
          await adjustPlayerCurrencyHelper(ctx, {
            userId: bid.bidderId,
            goldDelta: bid.bidAmount,
            transactionType: "auction_refund",
            description: "Auction cancelled - refund",
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
    await adjustCardInventory(ctx, userId, listing.cardDefinitionId, listing.quantity);

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
 *
 * Purchase a card immediately from a fixed-price listing.
 * Deducts listing price plus platform fee from buyer, credits seller,
 * and transfers card ownership.
 *
 * @param listingId - The marketplace listing ID to purchase
 * @returns Success status with price breakdown (price, platformFee, totalCost)
 */
export const buyNow = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  returns: v.object({
    success: v.boolean(),
    price: v.number(),
    platformFee: v.number(),
    totalCost: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Listing not found",
      });
    }

    if (listing.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Listing is no longer active",
      });
    }

    if (listing.listingType !== "fixed") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This is not a fixed price listing",
      });
    }

    if (listing.sellerId === userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You cannot buy your own listing",
      });
    }

    // Calculate total with platform fee
    const platformFee = Math.floor(listing.price * MARKETPLACE.PLATFORM_FEE_PERCENT);
    const totalCost = listing.price + platformFee;

    // Deduct from buyer (price + fee)
    await adjustPlayerCurrencyHelper(ctx, {
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
    await adjustPlayerCurrencyHelper(ctx, {
      userId: listing.sellerId,
      goldDelta: listing.price,
      transactionType: "sale",
      description: `Sold listing #${args.listingId}`,
      referenceId: args.listingId,
    });

    // Transfer card ownership
    await adjustCardInventory(ctx, userId, listing.cardDefinitionId, listing.quantity);

    // Update listing status
    await ctx.db.patch(args.listingId, {
      status: "sold",
      soldTo: userId,
      soldFor: listing.price,
      soldAt: Date.now(),
      platformFee,
      updatedAt: Date.now(),
    });

    // Send email notification to seller (if they have marketplaceSales notifications enabled)
    const seller = await ctx.db.get(listing.sellerId);
    const cardDefinition = await ctx.db.get(listing.cardDefinitionId);

    if (seller?.email && cardDefinition) {
      const wantsSaleNotifs = await getNotificationSetting(
        ctx,
        listing.sellerId,
        "marketplaceSales"
      );
      if (wantsSaleNotifs) {
        await ctx.scheduler.runAfter(
          0,
          apiAny.infrastructure.emailActions.sendCardSoldNotification,
          {
            email: seller.email,
            username: seller.username || seller.name || "Player",
            cardName: cardDefinition.name,
            rarity: cardDefinition.rarity,
            price: listing.price,
          }
        );
      }
    }

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
 *
 * Places a bid on an active auction listing. Locks the bid amount from bidder's gold.
 * If outbidding another player, refunds the previous highest bidder automatically.
 *
 * @param listingId - The auction listing ID to bid on
 * @param bidAmount - Bid amount (must exceed current bid by minimum increment percentage)
 * @returns Success status with bid details (bidAmount, currentBid)
 */
export const placeBid = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    bidAmount: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    bidAmount: v.number(),
    currentBid: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Rate limit: 3 bids per 10 seconds
    await marketplaceRateLimiter.limit(ctx, "placeBid", { key: userId });

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Listing not found",
      });
    }

    if (listing.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Auction is no longer active",
      });
    }

    if (listing.listingType !== "auction") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This is not an auction listing",
      });
    }

    if (listing.sellerId === userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You cannot bid on your own auction",
      });
    }

    // Check if auction expired
    if (listing.endsAt && listing.endsAt < Date.now()) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Auction has ended",
      });
    }

    // Determine minimum bid
    const currentBid = listing.currentBid ?? listing.price;
    const minBid = Math.ceil(currentBid * (1 + MARKETPLACE.MIN_BID_INCREMENT_PERCENT));

    if (args.bidAmount < minBid) {
      throw createError(ErrorCode.MARKETPLACE_BID_TOO_LOW, {
        minBid,
        bidAmount: args.bidAmount,
      });
    }

    // Lock bidder's gold
    await adjustPlayerCurrencyHelper(ctx, {
      userId,
      goldDelta: -args.bidAmount,
      transactionType: "auction_bid",
      description: `Bid on auction #${args.listingId}`,
      referenceId: args.listingId,
    });

    // Refund previous highest bidder if exists
    if (listing.highestBidderId && listing.currentBid) {
      // Update previous bid status (should only be one active bid at a time)
      const previousBid = await ctx.db
        .query("auctionBids")
        .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
        .filter((q) => q.eq(q.field("bidStatus"), "active"))
        .first();

      // Only refund if not already refunded (idempotency check)
      if (previousBid && !previousBid.refunded) {
        await adjustPlayerCurrencyHelper(ctx, {
          userId: listing.highestBidderId,
          goldDelta: listing.currentBid,
          transactionType: "auction_refund",
          description: `Outbid on auction #${args.listingId}`,
          referenceId: args.listingId,
        });

        await ctx.db.patch(previousBid._id, {
          bidStatus: "outbid",
          refundedAt: Date.now(),
          refunded: true, // Mark as refunded to prevent double refunds
        });

        // Send outbid notification
        const previousBidder = await ctx.db.get(listing.highestBidderId);
        const cardDefinition = await ctx.db.get(listing.cardDefinitionId);

        if (previousBidder?.email && cardDefinition && listing.endsAt) {
          const auctionEndsAt = new Date(listing.endsAt).toLocaleString();

          await ctx.scheduler.runAfter(
            0,
            apiAny.infrastructure.emailActions.sendAuctionOutbidNotification,
            {
              email: previousBidder.email,
              username: previousBidder.username || previousBidder.name || "Player",
              cardName: cardDefinition.name,
              currentBid: args.bidAmount,
              auctionEndsAt,
            }
          );
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
    // NOTE: Race condition protection via Convex OCC (Optimistic Concurrency Control)
    // If the listing was modified between the read (line 514) and this patch,
    // Convex will automatically retry this entire mutation from the beginning.
    // This prevents bypassing the minimum bid increment check.
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
 *
 * Claims the won auction and transfers cards to the winner after auction expires.
 * Deducts platform fee from winner's locked bid, credits seller, and transfers card ownership.
 *
 * @param listingId - The auction listing ID to claim
 * @returns Success status with final price and platform fee
 */
export const claimAuctionWin = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  returns: v.object({
    success: v.boolean(),
    finalPrice: v.number(),
    platformFee: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Listing not found",
      });
    }

    // Idempotency: prevent double claims
    if (listing.claimed) {
      throw createError(ErrorCode.MARKETPLACE_ALREADY_CLAIMED, {
        reason: "This auction has already been claimed",
      });
    }

    if (listing.listingType !== "auction") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This is not an auction",
      });
    }

    if (listing.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Auction is not active",
      });
    }

    if (!listing.endsAt || listing.endsAt > Date.now()) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Auction has not ended yet",
      });
    }

    if (!listing.highestBidderId || listing.highestBidderId !== userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You are not the highest bidder",
      });
    }

    if (!listing.currentBid) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No bids on this auction",
      });
    }

    // Calculate platform fee (deducted from seller's payout, not charged extra to winner)
    const platformFee = Math.floor(listing.currentBid * MARKETPLACE.PLATFORM_FEE_PERCENT);
    const sellerPayout = listing.currentBid - platformFee;

    // Credit seller (bid minus platform fee)
    await adjustPlayerCurrencyHelper(ctx, {
      userId: listing.sellerId,
      goldDelta: sellerPayout,
      transactionType: "sale",
      description: `Sold auction #${args.listingId}`,
      referenceId: args.listingId,
      metadata: { platformFee, grossAmount: listing.currentBid },
    });

    // Transfer cards
    await adjustCardInventory(ctx, userId, listing.cardDefinitionId, listing.quantity);

    // Update listing status
    await ctx.db.patch(args.listingId, {
      status: "sold",
      soldTo: userId,
      soldFor: listing.currentBid,
      soldAt: Date.now(),
      platformFee,
      claimed: true, // Mark as claimed to prevent double claims
      updatedAt: Date.now(),
    });

    // Update bid status to won
    const bids = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .take(100); // Reasonable limit for auction bids

    for (const bid of bids) {
      if (bid.bidderId === userId && bid.bidStatus === "active") {
        await ctx.db.patch(bid._id, {
          bidStatus: "won",
        });
      }
    }

    // Send email notifications
    const winner = await ctx.db.get(userId);
    const seller = await ctx.db.get(listing.sellerId);
    const cardDefinition = await ctx.db.get(listing.cardDefinitionId);

    if (winner?.email && cardDefinition) {
      // Notify winner
      await ctx.scheduler.runAfter(
        0,
        apiAny.infrastructure.emailActions.sendAuctionWonNotification,
        {
          email: winner.email,
          username: winner.username || winner.name || "Player",
          cardName: cardDefinition.name,
          rarity: cardDefinition.rarity,
          winningBid: listing.currentBid,
        }
      );
    }

    if (seller?.email && cardDefinition) {
      // Notify seller (if they have marketplaceSales notifications enabled)
      const wantsSaleNotifs = await getNotificationSetting(
        ctx,
        listing.sellerId,
        "marketplaceSales"
      );
      if (wantsSaleNotifs) {
        await ctx.scheduler.runAfter(
          0,
          apiAny.infrastructure.emailActions.sendCardSoldNotification,
          {
            email: seller.email,
            username: seller.username || seller.name || "Player",
            cardName: cardDefinition.name,
            rarity: cardDefinition.rarity,
            price: listing.currentBid,
          }
        );
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
    const cutoffTime = now - GRACE_PERIOD_MS;

    // Find active auctions that have expired (including grace period)
    // Using compound index to filter at query level
    const allActiveAuctions = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status_listingType_endsAt", (q) =>
        q.eq("status", "active").eq("listingType", "auction")
      )
      .take(100); // Reasonable limit for auction expiry processing

    // Filter for expired auctions (endsAt < cutoffTime)
    const toFinalize = allActiveAuctions.filter(
      (listing) => listing.endsAt !== undefined && listing.endsAt < cutoffTime
    );

    let finalizedCount = 0;
    let returnedCount = 0;

    for (const listing of toFinalize) {
      try {
        // Case 1: Auction with bids - transfer to winner
        if (listing.highestBidderId && listing.currentBid) {
          // Calculate platform fee (deducted from seller's payout, not charged to winner)
          // Winner already paid currentBid when placing the bid
          const platformFee = Math.floor(listing.currentBid * MARKETPLACE.PLATFORM_FEE_PERCENT);
          const sellerPayout = listing.currentBid - platformFee;

          // Credit seller (bid minus platform fee)
          await adjustPlayerCurrencyHelper(ctx, {
            userId: listing.sellerId,
            goldDelta: sellerPayout,
            transactionType: "sale",
            description: `Auto-finalized auction #${listing._id}`,
            referenceId: listing._id,
            metadata: { platformFee, grossAmount: listing.currentBid },
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
            .take(100); // Reasonable limit for auction bids

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
