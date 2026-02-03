/**
 * Price History Module
 *
 * Provides historical price data for marketplace cards.
 * Aggregates sold listings into time-series data for charts.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get price history for a specific card or all cards
 *
 * @param cardDefinitionId - Optional specific card to get history for
 * @param timeRange - Time range to query (7d, 30d, 90d, all)
 * @param currencyType - Filter by currency type (gold, token, or both)
 * @returns Array of daily price data points
 */
export const getCardPriceHistory = query({
  args: {
    cardDefinitionId: v.optional(v.id("cardDefinitions")),
    timeRange: v.optional(
      v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("all"))
    ),
    currencyType: v.optional(v.union(v.literal("gold"), v.literal("token"))),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange ?? "30d";
    const now = Date.now();

    // Calculate start time based on range
    const rangeMs = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      all: now, // From beginning of time
    } as const;
    const startTime = now - (rangeMs[timeRange] ?? rangeMs["30d"]);

    // Query sold listings
    let listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "sold"))
      .collect();

    // Filter by time range
    listings = listings.filter((l) => l.soldAt && l.soldAt >= startTime);

    // Filter by card if specified
    if (args.cardDefinitionId) {
      listings = listings.filter((l) => l.cardDefinitionId === args.cardDefinitionId);
    }

    // Filter by currency type if specified
    if (args.currencyType) {
      listings = listings.filter((l) => (l.currencyType ?? "gold") === args.currencyType);
    }

    // Group by day and aggregate
    const dailyData = new Map<
      string,
      { prices: number[]; volume: number; tokenPrices: number[] }
    >();

    for (const listing of listings) {
      if (!listing.soldAt || !listing.soldFor) continue;

      const dateParts = new Date(listing.soldAt).toISOString().split("T");
      const date = dateParts[0];
      if (!date) continue;

      const existing = dailyData.get(date) || { prices: [], volume: 0, tokenPrices: [] };

      if (listing.currencyType === "token" && listing.tokenPrice) {
        existing.tokenPrices.push(listing.tokenPrice);
      } else if (listing.soldFor) {
        existing.prices.push(listing.soldFor);
      }
      existing.volume += listing.quantity;
      dailyData.set(date, existing);
    }

    // Convert to array and calculate stats
    const result = Array.from(dailyData.entries())
      .map(([date, data]) => {
        const allPrices = [...data.prices, ...data.tokenPrices];
        const avgPrice =
          allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;
        const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
        const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

        return {
          date,
          avgPrice: Math.round(avgPrice),
          minPrice,
          maxPrice,
          volume: data.volume,
          goldSales: data.prices.length,
          tokenSales: data.tokenPrices.length,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  },
});

/**
 * Get top traded cards by volume
 * Used for card selector dropdown in price history chart
 *
 * @param limit - Maximum number of cards to return (default: 20)
 * @param timeRange - Time range to consider for volume (default: 30d)
 * @returns Array of cards with trade volume
 */
export const getTopTradedCards = query({
  args: {
    limit: v.optional(v.number()),
    timeRange: v.optional(
      v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("all"))
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const timeRange = args.timeRange ?? "30d";
    const now = Date.now();

    const rangeMs = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      all: now,
    } as const;
    const startTime = now - (rangeMs[timeRange] ?? rangeMs["30d"]);

    // Get sold listings in time range
    const listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "sold"))
      .collect();

    const recentListings = listings.filter((l) => l.soldAt && l.soldAt >= startTime);

    // Aggregate by card
    const cardVolume = new Map<string, { volume: number; totalValue: number; sales: number }>();

    for (const listing of recentListings) {
      const cardId = listing.cardDefinitionId;
      const existing = cardVolume.get(cardId) || { volume: 0, totalValue: 0, sales: 0 };
      existing.volume += listing.quantity;
      existing.totalValue += listing.soldFor ?? 0;
      existing.sales += 1;
      cardVolume.set(cardId, existing);
    }

    // Sort by volume and take top N
    const topCards = Array.from(cardVolume.entries())
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, limit);

    // Fetch card definitions with proper typing
    const cardIdsList = topCards.map(([id]) => id as Id<"cardDefinitions">);
    const cardDefs = await Promise.all(cardIdsList.map((id) => ctx.db.get(id)));

    return topCards.map(([cardId, stats], i) => {
      const card = cardDefs[i];
      return {
        cardDefinitionId: cardId,
        name: card?.name ?? "Unknown Card",
        rarity: card?.rarity ?? "common",
        archetype: card?.archetype ?? "neutral",
        imageUrl: card?.imageUrl,
        volume: stats.volume,
        totalValue: stats.totalValue,
        avgPrice: stats.sales > 0 ? Math.round(stats.totalValue / stats.sales) : 0,
        sales: stats.sales,
      };
    });
  },
});

/**
 * Get market overview statistics
 *
 * @returns Market summary stats
 */
export const getMarketOverview = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get all listings
    const allListings = await ctx.db.query("marketplaceListings").collect();

    const activeListings = allListings.filter((l) => l.status === "active");
    const soldListings = allListings.filter((l) => l.status === "sold");

    // Calculate stats
    const soldToday = soldListings.filter((l) => l.soldAt && l.soldAt >= oneDayAgo);
    const soldThisWeek = soldListings.filter((l) => l.soldAt && l.soldAt >= oneWeekAgo);

    const volumeToday = soldToday.reduce((sum, l) => sum + l.quantity, 0);
    const volumeThisWeek = soldThisWeek.reduce((sum, l) => sum + l.quantity, 0);

    const goldVolumeToday = soldToday
      .filter((l) => (l.currencyType ?? "gold") === "gold")
      .reduce((sum, l) => sum + (l.soldFor ?? 0), 0);

    const tokenVolumeToday = soldToday
      .filter((l) => l.currencyType === "token")
      .reduce((sum, l) => sum + (l.tokenPrice ?? 0), 0);

    return {
      activeListings: activeListings.length,
      totalSold: soldListings.length,
      volumeToday,
      volumeThisWeek,
      goldVolumeToday,
      tokenVolumeToday,
      averageListingPrice:
        activeListings.length > 0
          ? Math.round(
              activeListings.reduce((sum, l) => sum + l.price, 0) / activeListings.length
            )
          : 0,
    };
  },
});
