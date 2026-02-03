/**
 * Marketplace Moderation Admin Module
 *
 * Operations for monitoring and moderating marketplace listings.
 * Requires moderator role or higher.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Status validator matching schema
const listingStatusValidator = v.union(
  v.literal("active"),
  v.literal("sold"),
  v.literal("cancelled"),
  v.literal("expired"),
  v.literal("suspended") // Admin-suspended listings
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List marketplace listings with optional filtering
 */
export const listListings = query({
  args: {
    status: v.optional(listingStatusValidator),
    sellerId: v.optional(v.id("users")),
    search: v.optional(v.string()),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    flagged: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "moderator");

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let listings = await (async () => {
      if (args.status) {
        return await ctx.db
          .query("marketplaceListings")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect();
      } else if (args.sellerId) {
        return await ctx.db
          .query("marketplaceListings")
          .withIndex("by_seller", (q) => q.eq("sellerId", args.sellerId!))
          .order("desc")
          .collect();
      } else {
        return await ctx.db.query("marketplaceListings").order("desc").collect();
      }
    })();

    type Listing = typeof listings[number];

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      listings = listings.filter((l: Listing) => l.sellerUsername.toLowerCase().includes(searchLower));
    }

    // Apply price filters
    if (args.priceMin !== undefined) {
      listings = listings.filter((l: Listing) => l.price >= args.priceMin!);
    }
    if (args.priceMax !== undefined) {
      listings = listings.filter((l: Listing) => l.price <= args.priceMax!);
    }

    // Enhance with card info
    const enhancedListings = await Promise.all(
      listings.map(async (listing: Listing) => {
        const cardDef = await ctx.db.get(listing.cardDefinitionId);
        return {
          ...listing,
          cardName: (cardDef as any)?.name ?? "Unknown Card",
          cardRarity: (cardDef as any)?.rarity ?? "unknown",
        };
      })
    );

    const totalCount = enhancedListings.length;
    const paginated = enhancedListings.slice(offset, offset + limit);

    return {
      listings: paginated,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  },
});

/**
 * Get a single listing by ID with detailed info
 */
export const getListing = query({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  handler: async (ctx, { listingId }) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "moderator");

    const listing = await ctx.db.get(listingId);
    if (!listing) return null;

    // Get seller info
    const seller = await ctx.db.get(listing.sellerId);

    // Get card definition
    const cardDef = await ctx.db.get(listing.cardDefinitionId);

    // Get bid history
    const bids = await ctx.db
      .query("marketplaceBids")
      .withIndex("by_listing", (q) => q.eq("listingId", listingId))
      .order("desc")
      .take(20);

    // Get seller's other listings
    const sellerOtherListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", listing.sellerId))
      .filter((q) => q.neq(q.field("_id"), listingId))
      .order("desc")
      .take(10);

    // Calculate price statistics for this card
    const allListingsForCard = await ctx.db
      .query("marketplaceListings")
      .filter((q) => q.eq(q.field("cardDefinitionId"), listing.cardDefinitionId))
      .collect();

    const activePrices = allListingsForCard
      .filter((l) => l.status === "active")
      .map((l) => l.price);

    const soldPrices = allListingsForCard
      .filter((l) => l.status === "sold" && l.soldFor)
      .map((l) => l.soldFor!);

    return {
      ...listing,
      seller: seller
        ? {
            _id: seller._id,
            username: seller.username,
            accountStatus: seller.accountStatus,
          }
        : null,
      card: cardDef
        ? {
            _id: cardDef._id,
            name: cardDef.name,
            rarity: cardDef.rarity,
            archetype: cardDef.archetype,
          }
        : null,
      bids,
      sellerOtherListings: sellerOtherListings.length,
      priceStats: {
        activeListings: activePrices.length,
        avgActivePrice:
          activePrices.length > 0
            ? Math.round(activePrices.reduce((a, b) => a + b, 0) / activePrices.length)
            : 0,
        minActivePrice: activePrices.length > 0 ? Math.min(...activePrices) : 0,
        maxActivePrice: activePrices.length > 0 ? Math.max(...activePrices) : 0,
        recentSales: soldPrices.length,
        avgSalePrice:
          soldPrices.length > 0
            ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length)
            : 0,
      },
    };
  },
});

/**
 * Get marketplace statistics
 */
export const getMarketplaceStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const allListings = await ctx.db.query("marketplaceListings").collect();

    // Count by status
    const byStatus = {
      active: allListings.filter((l) => l.status === "active").length,
      sold: allListings.filter((l) => l.status === "sold").length,
      cancelled: allListings.filter((l) => l.status === "cancelled").length,
      expired: allListings.filter((l) => l.status === "expired").length,
    };

    // Recent activity
    const salesLast24h = allListings.filter(
      (l) => l.status === "sold" && l.soldAt && l.soldAt > oneDayAgo
    ).length;
    const salesLastWeek = allListings.filter(
      (l) => l.status === "sold" && l.soldAt && l.soldAt > oneWeekAgo
    ).length;

    // Volume calculations
    const volumeLast24h = allListings
      .filter((l) => l.status === "sold" && l.soldAt && l.soldAt > oneDayAgo)
      .reduce((sum, l) => sum + (l.soldFor ?? 0), 0);
    const volumeLastWeek = allListings
      .filter((l) => l.status === "sold" && l.soldAt && l.soldAt > oneWeekAgo)
      .reduce((sum, l) => sum + (l.soldFor ?? 0), 0);

    // Price anomaly detection (listings priced 3x or more above average for that card)
    const priceAnomalies = await detectPriceAnomalies(ctx, allListings);

    return {
      totalListings: allListings.length,
      byStatus,
      salesLast24h,
      salesLastWeek,
      volumeLast24h,
      volumeLastWeek,
      priceAnomaliesCount: priceAnomalies.length,
    };
  },
});

/**
 * Get listings flagged as potential price anomalies
 */
export const getPriceAnomalies = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const activeListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return detectPriceAnomalies(ctx, activeListings);
  },
});

/**
 * Helper function to detect price anomalies
 */
async function detectPriceAnomalies(
  // biome-ignore lint/suspicious/noExplicitAny: Internal helper function with flexible context
  ctx: { db: any },
  listings: Array<{
    // biome-ignore lint/suspicious/noExplicitAny: Flexible ID type for internal processing
    _id: any;
    // biome-ignore lint/suspicious/noExplicitAny: Flexible ID type for internal processing
    cardDefinitionId: any;
    price: number;
    sellerUsername: string;
  }>
) {
  // Group listings by card
  const byCard = new Map<string, typeof listings>();
  for (const listing of listings) {
    const cardId = listing.cardDefinitionId.toString();
    if (!byCard.has(cardId)) {
      byCard.set(cardId, []);
    }
    byCard.get(cardId)?.push(listing);
  }

  const anomalies = [];

  for (const [_cardId, cardListings] of byCard) {
    if (cardListings.length < 2) continue; // Need at least 2 listings to compare

    const prices = cardListings.map((l) => l.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const threshold = avgPrice * 3; // 3x average is anomalous

    for (const listing of cardListings) {
      if (listing.price > threshold) {
        const cardDef = await ctx.db.get(listing.cardDefinitionId);
        anomalies.push({
          listingId: listing._id,
          cardName: cardDef?.name ?? "Unknown",
          price: listing.price,
          avgPrice: Math.round(avgPrice),
          deviation: Math.round((listing.price / avgPrice) * 100) / 100,
          sellerUsername: listing.sellerUsername,
        });
      }
    }
  }

  return anomalies;
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Cancel/suspend a listing
 */
export const suspendListing = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.status !== "active") {
      throw new Error("Only active listings can be suspended");
    }

    await ctx.db.patch(args.listingId, {
      status: "cancelled",
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "suspend_marketplace_listing",
      metadata: {
        listingId: args.listingId,
        sellerId: listing.sellerId,
        sellerUsername: listing.sellerUsername,
        price: listing.price,
        reason: args.reason,
      },
      success: true,
    });

    return {
      success: true,
      message: "Listing suspended",
    };
  },
});

/**
 * Bulk suspend listings from a seller
 */
export const suspendSellerListings = mutation({
  args: {
    sellerId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const seller = await ctx.db.get(args.sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    const activeListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", args.sellerId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let suspended = 0;
    for (const listing of activeListings) {
      await ctx.db.patch(listing._id, {
        status: "cancelled",
      });
      suspended++;
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "suspend_seller_listings",
      metadata: {
        sellerId: args.sellerId,
        sellerUsername: seller.username,
        suspendedCount: suspended,
        reason: args.reason,
      },
      success: true,
    });

    return {
      success: true,
      message: `Suspended ${suspended} listings from ${seller.username}`,
    };
  },
});

/**
 * Set a price cap for a specific card
 * Creates a new price cap or updates existing one
 */
export const setPriceCap = mutation({
  args: {
    cardDefinitionId: v.id("cardDefinitions"),
    maxPrice: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin"); // Requires admin, not just moderator

    const cardDef = await ctx.db.get(args.cardDefinitionId);
    if (!cardDef) {
      throw new Error("Card definition not found");
    }

    const admin = await ctx.db.get(adminId);
    if (!admin) {
      throw new Error("Admin user not found");
    }

    // Check if a price cap already exists for this card
    const existingCap = await ctx.db
      .query("marketplacePriceCaps")
      .withIndex("by_card", (q) => q.eq("cardDefinitionId", args.cardDefinitionId))
      .first();

    const now = Date.now();

    if (existingCap) {
      // Update existing price cap
      await ctx.db.patch(existingCap._id, {
        maxPrice: args.maxPrice,
        reason: args.reason,
        setBy: adminId,
        setByUsername: admin.username ?? "Admin",
        isActive: true,
        updatedAt: now,
      });
    } else {
      // Create new price cap
      await ctx.db.insert("marketplacePriceCaps", {
        cardDefinitionId: args.cardDefinitionId,
        maxPrice: args.maxPrice,
        reason: args.reason,
        setBy: adminId,
        setByUsername: admin.username ?? "Admin",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "set_price_cap",
      metadata: {
        cardDefinitionId: args.cardDefinitionId,
        cardName: cardDef.name,
        maxPrice: args.maxPrice,
        reason: args.reason,
        wasUpdate: !!existingCap,
      },
      success: true,
    });

    return {
      success: true,
      message: `Price cap of ${args.maxPrice} set for ${cardDef.name}`,
    };
  },
});

/**
 * Refund a bid (for auction manipulation cases)
 */
export const refundBid = mutation({
  args: {
    bidId: v.id("marketplaceBids"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const bid = await ctx.db.get(args.bidId);
    if (!bid) {
      throw new Error("Bid not found");
    }

    if (bid.bidStatus === "refunded") {
      throw new Error("Bid already refunded");
    }

    // Get the bidder
    const bidder = await ctx.db.get(bid.bidderId);
    if (!bidder) {
      throw new Error("Bidder not found");
    }

    // Update bid status
    await ctx.db.patch(args.bidId, {
      bidStatus: "refunded",
      refundedAt: Date.now(),
    });

    // Refund the gold to the bidder
    await ctx.db.patch(bid.bidderId, {
      gold: (bidder.gold ?? 0) + bid.bidAmount,
    });

    // Record transaction
    await ctx.db.insert("currencyTransactions", {
      userId: bid.bidderId,
      currencyType: "gold",
      amount: bid.bidAmount,
      balanceAfter: (bidder.gold ?? 0) + bid.bidAmount,
      transactionType: "admin_refund",
      referenceId: args.bidId,
      description: `Admin refund: ${args.reason}`,
      metadata: {
        adminId,
        originalBidId: args.bidId,
        reason: args.reason,
      },
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "refund_bid",
      metadata: {
        bidId: args.bidId,
        bidderId: bid.bidderId,
        bidderUsername: bid.bidderUsername,
        amount: bid.bidAmount,
        reason: args.reason,
      },
      success: true,
    });

    return {
      success: true,
      message: `Refunded ${bid.bidAmount} gold to ${bid.bidderUsername}`,
    };
  },
});

/**
 * Get seller trading history for investigation
 */
export const getSellerHistory = query({
  args: {
    sellerId: v.id("users"),
  },
  handler: async (ctx, { sellerId }) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "moderator");

    const seller = await ctx.db.get(sellerId);
    if (!seller) return null;

    // Get all listings
    const allListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", sellerId))
      .order("desc")
      .collect();

    // Count by status
    const byStatus = {
      active: allListings.filter((l) => l.status === "active").length,
      sold: allListings.filter((l) => l.status === "sold").length,
      cancelled: allListings.filter((l) => l.status === "cancelled").length,
      expired: allListings.filter((l) => l.status === "expired").length,
    };

    // Calculate total volume
    const totalSalesVolume = allListings
      .filter((l) => l.status === "sold" && l.soldFor)
      .reduce((sum, l) => sum + l.soldFor!, 0);

    // Get recent bids by this user (buying activity)
    const bids = await ctx.db
      .query("marketplaceBids")
      .withIndex("by_bidder", (q) => q.eq("bidderId", sellerId))
      .order("desc")
      .take(50);

    // Enhance listings with card info
    const enhancedListings = await Promise.all(
      allListings.slice(0, 50).map(async (listing) => {
        const cardDef = await ctx.db.get(listing.cardDefinitionId);
        return {
          ...listing,
          cardName: cardDef?.name ?? "Unknown",
          cardRarity: cardDef?.rarity ?? "unknown",
        };
      })
    );

    return {
      seller: {
        _id: seller._id,
        username: seller.username,
        accountStatus: seller.accountStatus,
        createdAt: seller.createdAt,
      },
      stats: {
        totalListings: allListings.length,
        byStatus,
        totalSalesVolume,
        totalBids: bids.length,
      },
      recentListings: enhancedListings,
      recentBids: bids,
    };
  },
});

/**
 * Get all active price caps
 */
export const getPriceCaps = query({
  args: {},
  handler: async (ctx) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "moderator");

    const caps = await ctx.db
      .query("marketplacePriceCaps")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    // Enhance with card info
    const enhancedCaps = await Promise.all(
      caps.map(async (cap) => {
        const cardDef = await ctx.db.get(cap.cardDefinitionId);
        return {
          ...cap,
          cardName: cardDef?.name ?? "Unknown Card",
          cardRarity: cardDef?.rarity ?? "unknown",
        };
      })
    );

    return enhancedCaps;
  },
});

/**
 * Remove a price cap
 */
export const removePriceCap = mutation({
  args: {
    priceCapId: v.id("marketplacePriceCaps"),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const priceCap = await ctx.db.get(args.priceCapId);
    if (!priceCap) {
      throw new Error("Price cap not found");
    }

    const cardDef = await ctx.db.get(priceCap.cardDefinitionId);

    // Soft delete by setting isActive to false
    await ctx.db.patch(args.priceCapId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "remove_price_cap",
      metadata: {
        priceCapId: args.priceCapId,
        cardDefinitionId: priceCap.cardDefinitionId,
        cardName: cardDef?.name ?? "Unknown",
        previousMaxPrice: priceCap.maxPrice,
      },
      success: true,
    });

    return {
      success: true,
      message: `Price cap removed for ${cardDef?.name ?? "Unknown"}`,
    };
  },
});

/**
 * Unsuspend a listing (reactivate a suspended listing)
 */
export const unsuspendListing = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.status !== "cancelled" && listing.status !== "suspended") {
      throw new Error("Only cancelled or suspended listings can be unsuspended");
    }

    await ctx.db.patch(args.listingId, {
      status: "active",
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "unsuspend_marketplace_listing",
      metadata: {
        listingId: args.listingId,
        sellerId: listing.sellerId,
        sellerUsername: listing.sellerUsername,
        price: listing.price,
      },
      success: true,
    });

    return {
      success: true,
      message: "Listing reactivated",
    };
  },
});
