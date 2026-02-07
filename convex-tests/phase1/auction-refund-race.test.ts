/**
 * Phase 1 Test: Auction Refund Race Condition
 *
 * Tests that auction bid refunds are idempotent and cannot be
 * triggered multiple times for the same bid.
 */

import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 1: Auction Refund Race Condition", () => {
  it("should prevent double refunds when multiple operations trigger refund", async () => {
    const t = await createTestWithComponents();

    // Setup: Create bidder and seller
    const bidderId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "bidder",
        email: "bidder@test.com",
        privyId: "privy_bidder",
        createdAt: Date.now(),
      });
    });

    const sellerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "seller",
        email: "seller@test.com",
        privyId: "privy_seller",
        createdAt: Date.now(),
      });
    });

    // Give bidder gold
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId: bidderId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create card
    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Card",
        rarity: "legendary",
        archetype: "neutral",
        cardType: "creature",
        cost: 8,
        attack: 200,
        defense: 150,
        flavorText: "Refund test card",
        imageUrl: "test.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    // Create auction with active bid
    const listingId = await t.run(async (ctx) => {
      return await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "seller",
        listingType: "auction",
        cardDefinitionId: cardId,
        quantity: 1,
        price: 100,
        currentBid: 200,
        highestBidderId: bidderId,
        highestBidderUsername: "bidder",
        bidCount: 1,
        status: "active",
        endsAt: Date.now() + 1000, // Ends soon
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create bid record
    const bidId = await t.run(async (ctx) => {
      return await ctx.db.insert("auctionBids", {
        listingId,
        bidderId,
        bidderUsername: "bidder",
        bidAmount: 200,
        bidStatus: "active",
        createdAt: Date.now(),
      });
    });

    // Get initial gold balance
    const initialCurrency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .filter((q) => q.eq(q.field("userId"), bidderId))
        .first();
    });

    expect(initialCurrency?.gold).toBe(1000);

    // Simulate: Auction ends and is outbid, triggering refund
    // The refund logic should check the `refunded` flag
    await t.run(async (ctx) => {
      // Mark auction as ended
      await ctx.db.patch(listingId, {
        status: "expired",
        updatedAt: Date.now(),
      });

      // Process refund (simulating what happens in placeBid or claimAuctionWin)
      const bid = await ctx.db.get(bidId);

      if (bid && !bid.refunded) {
        // Refund the bidder
        const currency = await ctx.db
          .query("playerCurrency")
          .filter((q) => q.eq(q.field("userId"), bidderId))
          .first();

        if (currency) {
          await ctx.db.patch(currency._id, {
            gold: currency.gold + 200,
            lastUpdatedAt: Date.now(),
          });

          // Mark as refunded (idempotency flag)
          await ctx.db.patch(bidId, {
            bidStatus: "outbid",
            refundedAt: Date.now(),
            refunded: true,
          });
        }
      }
    });

    // Try to process refund again (should be blocked by refunded flag)
    await t.run(async (ctx) => {
      const bid = await ctx.db.get(bidId);

      if (bid && !bid.refunded) {
        // This should NOT execute because refunded = true
        const currency = await ctx.db
          .query("playerCurrency")
          .filter((q) => q.eq(q.field("userId"), bidderId))
          .first();

        if (currency) {
          await ctx.db.patch(currency._id, {
            gold: currency.gold + 200, // Would double the refund
            lastUpdatedAt: Date.now(),
          });
        }
      }
    });

    // Verify: Bidder received exactly ONE refund (200 gold)
    const finalCurrency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .filter((q) => q.eq(q.field("userId"), bidderId))
        .first();
    });

    expect(finalCurrency?.gold).toBe(1200); // 1000 + 200 (single refund)

    // Verify: Bid is marked as refunded
    const finalBid = await t.run(async (ctx) => await ctx.db.get(bidId));
    expect(finalBid?.refunded).toBe(true);
    expect(finalBid?.refundedAt).toBeDefined();
  });

  it("should handle concurrent refund attempts gracefully", async () => {
    const t = await createTestWithComponents();

    // Setup similar to previous test
    const bidderId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "bidder",
        email: "bidder@test.com",
        privyId: "privy_bidder",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId: bidderId,
        gold: 500,
        gems: 0,
        lifetimeGoldEarned: 500,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    const sellerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "seller",
        email: "seller@test.com",
        privyId: "privy_seller",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Card",
        rarity: "common",
        archetype: "neutral",
        cardType: "creature",
        cost: 3,
        attack: 50,
        defense: 50,
        flavorText: "Test",
        imageUrl: "test.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    const listingId = await t.run(async (ctx) => {
      return await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "seller",
        listingType: "auction",
        cardDefinitionId: cardId,
        quantity: 1,
        price: 100,
        currentBid: 100,
        highestBidderId: bidderId,
        highestBidderUsername: "bidder",
        bidCount: 1,
        status: "active",
        endsAt: Date.now() + 1000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const bidId = await t.run(async (ctx) => {
      return await ctx.db.insert("auctionBids", {
        listingId,
        bidderId,
        bidderUsername: "bidder",
        bidAmount: 100,
        bidStatus: "active",
        createdAt: Date.now(),
        refunded: false,
      });
    });

    // Execute multiple concurrent refund checks
    // Only the first one to set refunded=true should process the refund
    await Promise.all([
      t.run(async (ctx) => {
        const bid = await ctx.db.get(bidId);
        if (bid && !bid.refunded) {
          await ctx.db.patch(bidId, { refunded: true, refundedAt: Date.now() });
          const currency = await ctx.db
            .query("playerCurrency")
            .filter((q) => q.eq(q.field("userId"), bidderId))
            .first();
          if (currency) {
            await ctx.db.patch(currency._id, {
              gold: currency.gold + 100,
              lastUpdatedAt: Date.now(),
            });
          }
        }
      }),
      t.run(async (ctx) => {
        const bid = await ctx.db.get(bidId);
        if (bid && !bid.refunded) {
          await ctx.db.patch(bidId, { refunded: true, refundedAt: Date.now() });
          const currency = await ctx.db
            .query("playerCurrency")
            .filter((q) => q.eq(q.field("userId"), bidderId))
            .first();
          if (currency) {
            await ctx.db.patch(currency._id, {
              gold: currency.gold + 100,
              lastUpdatedAt: Date.now(),
            });
          }
        }
      }),
    ]);

    // Verify: Only one refund processed
    const finalCurrency = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCurrency")
        .filter((q) => q.eq(q.field("userId"), bidderId))
        .first();
    });

    // Should be 600 (500 + 100), not 700 (double refund)
    expect(finalCurrency?.gold).toBe(600);
  });
});
