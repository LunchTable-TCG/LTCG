/**
 * Migration: Merge marketplaceBids into auctionBids
 *
 * Context:
 * The `marketplaceBids` and `auctionBids` tables are identical duplicates.
 * The comment in schema.ts says "Marketplace bids (admin view of auction bids)"
 * but they share the same structure and indexes.
 *
 * This migration:
 * 1. Copies all records from marketplaceBids to auctionBids
 * 2. Preserves all field values and timestamps
 * 3. Is idempotent - can be run multiple times safely
 *
 * After this migration:
 * - Update all code references from marketplaceBids to auctionBids
 * - Deprecate the marketplaceBids table in schema
 * - Eventually remove marketplaceBids table definition
 *
 * Run with: npx convex run migrations/mergeMarketplaceBids
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting marketplaceBids → auctionBids migration...");

    // Get all records from marketplaceBids
    const marketplaceBids = await ctx.db.query("marketplaceBids").collect();

    console.log(`Found ${marketplaceBids.length} bids in marketplaceBids table`);

    let copied = 0;
    let skipped = 0;

    for (const bid of marketplaceBids) {
      // Check if this bid already exists in auctionBids
      // (matching by listingId, bidderId, bidAmount, and createdAt)
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

      if (existing) {
        // Already migrated, skip
        skipped++;
        continue;
      }

      // Insert into auctionBids (excluding _id and _creationTime)
      await ctx.db.insert("auctionBids", {
        listingId: bid.listingId,
        bidderId: bid.bidderId,
        bidderUsername: bid.bidderUsername,
        bidAmount: bid.bidAmount,
        bidStatus: bid.bidStatus,
        refundedAt: bid.refundedAt,
        createdAt: bid.createdAt,
      });

      copied++;
    }

    console.log(`Migration complete: ${copied} copied, ${skipped} skipped (already existed)`);

    return {
      success: true,
      totalFound: marketplaceBids.length,
      copied,
      skipped,
      message: `Migrated ${copied} bids from marketplaceBids to auctionBids`,
    };
  },
});
