/**
 * Migration: Merge marketplaceBids into auctionBids
 *
 * Context:
 * The `marketplaceBids` and `auctionBids` tables are identical duplicates.
 * This migration copies all records from marketplaceBids to auctionBids.
 *
 * After this migration:
 * - Update all code references from marketplaceBids to auctionBids
 * - Deprecate the marketplaceBids table in schema
 * - Eventually remove marketplaceBids table definition
 *
 * Run with: npx convex run migrations/index:run '{fn: "migrations/mergeMarketplaceBids"}'
 */

import { migrations } from "./index";

export default migrations.define({
  table: "marketplaceBids",
  migrateOne: async (ctx, bid) => {
    // Check if this bid already exists in auctionBids (idempotent)
    const existing = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", bid.listingId))
      .filter((q) =>
        q.and(
          q.eq(q.field("bidderId"), bid.bidderId),
          q.eq(q.field("bidAmount"), bid.bidAmount),
          q.eq(q.field("createdAt"), bid.createdAt)
        )
      )
      .first();

    if (existing) return;

    // Copy to auctionBids
    await ctx.db.insert("auctionBids", {
      listingId: bid.listingId,
      bidderId: bid.bidderId,
      bidderUsername: bid.bidderUsername,
      bidAmount: bid.bidAmount,
      bidStatus: bid.bidStatus,
      refundedAt: bid.refundedAt,
      createdAt: bid.createdAt,
    });

    console.log(`[Migration] Copied bid ${bid._id} to auctionBids`);
  },
});
